import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { searchMulti } from "@/lib/homeharvest/client";
import { preScore } from "@/lib/ai/pre-score";
import { buildPropertyContext, extractListingPhotos } from "@/lib/ai/scoring";
import {
  analyzePropertyVisually,
  getSatelliteImageUrl,
  getStreetViewUrl,
  type VisualDistressAnalysis,
} from "@/lib/ai/satellite";
import type { HomeHarvestProperty } from "@/lib/homeharvest/types";
import { pointInPolygon } from "@/lib/geo/point-in-polygon";

const CONCURRENCY = 5;
const DEFAULT_USER_ID = "demo-user";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { location, bounds, limit } = body as {
    location?: string;
    bounds?: [number, number][];
    limit?: number;
  };

  if (!location && !bounds) {
    return new Response(JSON.stringify({ error: "Location or bounds required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
        );
      };

      const startTime = Date.now();

      try {
        // Ensure user exists
        await prisma.user.upsert({
          where: { id: DEFAULT_USER_ID },
          create: { id: DEFAULT_USER_ID, email: "demo@dealscout.ai", name: "Demo User" },
          update: {},
        });

        // Create scout session
        const session = await prisma.scoutSession.create({
          data: {
            userId: DEFAULT_USER_ID,
            location: location || "Custom Area",
            bounds: bounds ? JSON.stringify(bounds) : null,
            status: "running",
          },
        });

        send("started", { location: location || "Custom Area", sessionId: session.id });

        // ─── Step 1: Fetch properties ───
        send("fetching", { message: `Fetching properties in ${location || "drawn area"}...` });

        const searchLocation = location || `${bounds![0][1]},${bounds![0][0]}`;
        const result = await searchMulti({ location: searchLocation });

        if (!result.success || result.count === 0) {
          send("error", { message: "No properties found in this area" });
          await prisma.scoutSession.update({
            where: { id: session.id },
            data: { status: "failed" },
          });
          controller.close();
          return;
        }

        let allProperties = result.properties;

        // Filter by polygon if bounds provided
        if (bounds && bounds.length >= 3) {
          allProperties = allProperties.filter((p) => {
            if (!p.latitude || !p.longitude) return true;
            return pointInPolygon(
              [p.longitude, p.latitude],
              bounds as [number, number][]
            );
          });
        }

        const counts = result.counts ?? {
          for_sale: allProperties.length,
          foreclosures: 0,
          pending: 0,
          off_market: 0,
          stale_sold: 0,
          sold_comps: 0,
        };

        send("properties_found", {
          total: allProperties.length,
          forSale: counts.for_sale,
          foreclosures: counts.foreclosures,
          pending: counts.pending,
          offMarket: counts.off_market,
          staleSold: counts.stale_sold,
          soldComps: counts.sold_comps,
        });

        // ─── Step 2: Select candidates ───
        // Pre-score for priority ordering, but we analyze ALL properties with coords.
        // Pre-score just determines the ORDER (highest potential first).
        const withPreScore = allProperties.map((p) => ({
          property: p,
          preScore: preScore(p),
        }));

        // Sort by pre-score descending — most likely distressed first
        withPreScore.sort((a, b) => b.preScore - a.preScore);

        // Apply limit if specified (0 = no limit)
        const effectiveLimit = limit && limit > 0 ? limit : withPreScore.length;
        const candidates = withPreScore.slice(0, effectiveLimit);

        // Split into properties with coords (visual analysis) vs without
        const withCoords = candidates.filter(
          (c) => c.property.latitude && c.property.longitude
        );
        const withoutCoords = candidates.filter(
          (c) => !c.property.latitude || !c.property.longitude
        );

        send("pre_filtering", {
          total: allProperties.length,
          analyzing: candidates.length,
          withImagery: withCoords.length,
          dataOnly: withoutCoords.length,
        });

        // ─── Step 3: Single-pass visual distress analysis ───
        // Every property with coordinates gets the full treatment:
        // satellite + neighborhood + 4 street views + listing photos → Claude
        if (!process.env.GOOGLE_MAPS_API_KEY) {
          send("aerial_scan", {
            message: "Skipping visual analysis — GOOGLE_MAPS_API_KEY not set in .env",
            total: 0,
          });
        } else if (withCoords.length > 0) {
          send("aerial_scan", {
            message: `Virtual drive-by: scanning ${withCoords.length} properties (satellite + 4-angle street view + listing photos)...`,
            total: withCoords.length,
          });
        }

        let analyzedCount = 0;
        let flaggedCount = 0;
        let hotDealCount = 0;

        // Process properties with visual analysis (concurrent workers)
        const queue = [...withCoords];
        let queueIndex = 0;

        const worker = async () => {
          while (queueIndex < queue.length) {
            const idx = queueIndex++;
            const candidate = queue[idx];
            const p = candidate.property;
            const pid = p.property_id || p.property_url || "";

            // Build context and gather listing photos
            const context = buildPropertyContext(p);
            const listingPhotos = extractListingPhotos(p);

            // Single-pass: all images + data → Claude → distress score
            let analysis: VisualDistressAnalysis | null = null;
            try {
              analysis = await analyzePropertyVisually(
                pid,
                p.latitude!,
                p.longitude!,
                context,
                listingPhotos
              );
            } catch (err) {
              console.error(`Analysis failed for ${pid}:`, err);
            }

            analyzedCount++;

            // Build frontend property with analysis results
            const frontendProp = mapToFrontendProperty(p, analysis);

            // Save to DB
            try {
              await prisma.scoutedProperty.create({
                data: mapToDbProperty(p, analysis, session.id),
              });
            } catch {
              // unique constraint — skip duplicates
            }

            send("property_scored", {
              property: frontendProp,
              progress: Math.round((analyzedCount / candidates.length) * 100),
            });

            const score = analysis?.visual_distress_score ?? 0;
            if (score >= 80) {
              send("hot_deal", { property: frontendProp });
              hotDealCount++;
            }
            if (score >= 40) {
              flaggedCount++;
            }

            // Progress update every 5 properties
            if (analyzedCount % 5 === 0) {
              send("progress", {
                analyzed: analyzedCount,
                total: candidates.length,
                flagged: flaggedCount,
                hot: hotDealCount,
              });
            }
          }
        };

        if (withCoords.length > 0 && process.env.GOOGLE_MAPS_API_KEY) {
          await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, withCoords.length) }, () =>
              worker()
            )
          );

          send("aerial_scan_complete", {
            analyzed: analyzedCount,
            distressedCount: flaggedCount,
          });
        }

        // Process properties WITHOUT coordinates (data-only, scored by pre-score)
        for (const candidate of withoutCoords) {
          const p = candidate.property;
          const frontendProp = mapToFrontendProperty(p, null);

          try {
            await prisma.scoutedProperty.create({
              data: mapToDbProperty(p, null, session.id),
            });
          } catch {
            // skip duplicates
          }

          send("property_scored", {
            property: frontendProp,
            progress: Math.round(
              ((analyzedCount + withoutCoords.indexOf(candidate) + 1) /
                candidates.length) *
                100
            ),
          });

          // Use pre-score as a rough distress indicator for data-only properties
          if (candidate.preScore >= 60) flaggedCount++;
        }

        // ─── Complete ───
        const duration = Math.round((Date.now() - startTime) / 1000);

        await prisma.scoutSession.update({
          where: { id: session.id },
          data: {
            status: "completed",
            totalScanned: allProperties.length,
            totalFlagged: flaggedCount,
            hotDeals: hotDealCount,
            duration,
            completedAt: new Date(),
          },
        });

        send("complete", {
          totalScanned: allProperties.length,
          totalFlagged: flaggedCount,
          hotDeals: hotDealCount,
          duration,
          scoutSessionId: session.id,
        });
      } catch (err) {
        send("error", { message: `Scout failed: ${err}` });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ─── Mappers ───

function mapToDbProperty(
  p: HomeHarvestProperty,
  analysis: VisualDistressAnalysis | null,
  sessionId: string
) {
  return {
    scoutSessionId: sessionId,
    propertyId: p.property_id || null,
    propertyUrl: p.property_url || null,
    address: p.street || "Unknown",
    city: p.city || "",
    state: p.state || "",
    zipCode: p.zip_code || "",
    latitude: p.latitude || null,
    longitude: p.longitude || null,
    listPrice: p.list_price ? Math.round(p.list_price) : null,
    estimatedValue: p.estimated_value ? Math.round(p.estimated_value) : null,
    sqft: p.sqft || null,
    beds: p.beds || null,
    baths: (p.full_baths ?? 0) + (p.half_baths ?? 0) * 0.5 || null,
    yearBuilt: p.year_built || null,
    lotSqft: p.lot_sqft || null,
    daysOnMls: p.days_on_mls || null,
    propertyType: p.style || null,
    listingStatus: p.status || null,
    pricePerSqft: p.price_per_sqft || null,
    taxAssessedValue: p.assessed_value ? Math.round(p.assessed_value) : null,
    hoaFee: p.hoa_fee ? Math.round(p.hoa_fee) : null,
    description: p.description || null,
    primaryPhoto: p.primary_photo || null,
    photos: p.alt_photos || null,
    source: p._source ?? "for_sale",
    distressScore: analysis?.visual_distress_score ?? null,
    distressSignals: analysis ? JSON.stringify(analysis.visual_signals) : null,
    aiReasoning: analysis?.notes ?? null,
    aiConfidence: null,
    propertyCondition: analysis?.property_condition ?? null,
  };
}

function mapToFrontendProperty(
  p: HomeHarvestProperty,
  analysis: VisualDistressAnalysis | null
) {
  return {
    id: p.property_id || p.property_url || "",
    propertyId: p.property_id || "",
    address: p.street || "Unknown",
    city: p.city || "",
    state: p.state || "",
    zipCode: p.zip_code || "",
    latitude: p.latitude || null,
    longitude: p.longitude || null,
    listPrice: p.list_price ? Math.round(p.list_price) : null,
    sqft: p.sqft || null,
    beds: p.beds || null,
    baths: (p.full_baths ?? 0) + (p.half_baths ?? 0) * 0.5 || null,
    yearBuilt: p.year_built || null,
    daysOnMls: p.days_on_mls || null,
    propertyType: p.style || null,
    primaryPhoto: p.primary_photo || null,
    description: p.description || null,
    source: p._source ?? "for_sale",
    yearsSinceSale: p._years_since_sale ?? null,
    // Distress analysis
    distressScore: analysis?.visual_distress_score ?? 0,
    distressSignals: analysis?.visual_signals ?? [],
    propertyCondition: analysis?.property_condition ?? "unknown",
    neighborComparison: analysis?.neighbor_comparison ?? null,
    aiReasoning: analysis?.notes ?? null,
    aiConfidence: null,
    // Keep these null for v1 — distress detection only
    investmentType: null,
    estimatedArv: null,
    repairLevel: null,
    repairCostLow: null,
    repairCostHigh: null,
    maxAllowableOffer: null,
    wholesaleFeeEst: null,
    flipProfitEst: null,
    recommendedAction: null,
    // Imagery URLs (for frontend display)
    satelliteUrl:
      p.latitude && p.longitude
        ? getSatelliteImageUrl(p.latitude, p.longitude)
        : null,
    streetViewUrl:
      p.latitude && p.longitude
        ? getStreetViewUrl(p.latitude, p.longitude, 0)
        : null,
    visualAnalysis: analysis
      ? {
          score: analysis.visual_distress_score,
          signals: analysis.visual_signals,
          condition: analysis.property_condition,
          notes: analysis.notes,
          neighborComparison: analysis.neighbor_comparison,
        }
      : null,
  };
}
