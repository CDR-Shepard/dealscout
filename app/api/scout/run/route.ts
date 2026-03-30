import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { searchMulti } from "@/lib/homeharvest/client";
import { preScore } from "@/lib/ai/pre-score";
import { scoreBatch, chunkArray, type AIPropertyScore } from "@/lib/ai/scoring";
import { analyzePropertiesBatch, getSatelliteImageUrl, getStreetViewUrl, type VisualDistressAnalysis } from "@/lib/ai/satellite";
import type { HomeHarvestProperty } from "@/lib/homeharvest/types";
import { pointInPolygon } from "@/lib/geo/point-in-polygon";

const BATCH_SIZE = 10;
const PRE_SCORE_THRESHOLD = 20;
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

        // Step 1: Fetch properties
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

        // Step 2: Pre-filter
        const scored = allProperties.map((p) => ({
          property: p,
          preScore: preScore(p),
        }));

        const candidates = scored
          .filter((s) => s.preScore >= PRE_SCORE_THRESHOLD)
          .sort((a, b) => b.preScore - a.preScore);

        // Apply home limit if specified (0 = no limit)
        const effectiveLimit = limit && limit > 0 ? limit : candidates.length;
        const limitedCandidates = candidates.slice(0, effectiveLimit);

        send("pre_filtering", {
          passed: limitedCandidates.length,
          filtered: allProperties.length - limitedCandidates.length,
          limited: effectiveLimit < candidates.length,
        });

        // Step 3: Aerial scan — virtual drive-by with satellite + street view
        let visualAnalyses = new Map<string, VisualDistressAnalysis>();
        const candidateProperties = limitedCandidates.map((c) => c.property);
        const propertiesWithCoords = candidateProperties
          .filter((p) => p.latitude && p.longitude)
          .map((p) => ({
            propertyId: p.property_id || p.property_url || "",
            lat: p.latitude!,
            lng: p.longitude!,
          }));

        if (propertiesWithCoords.length > 0) {
          if (!process.env.GOOGLE_MAPS_API_KEY) {
            send("aerial_scan", {
              message: "Skipping aerial scan — GOOGLE_MAPS_API_KEY not set in .env",
              total: 0,
            });
          } else {
            send("aerial_scan", {
              message: `Virtual drive-by: scanning ${propertiesWithCoords.length} properties via satellite + street view...`,
              total: propertiesWithCoords.length,
            });

            try {
              visualAnalyses = await analyzePropertiesBatch(
                propertiesWithCoords,
                3 // concurrency limit
              );

              if (visualAnalyses.size === 0) {
                send("aerial_scan", {
                  message: "Aerial scan returned no results — check Google Maps API billing/permissions in console logs",
                  total: 0,
                });
              } else {
                send("aerial_scan_complete", {
                  analyzed: visualAnalyses.size,
                  distressedCount: Array.from(visualAnalyses.values()).filter(
                    (v) => v.visual_distress_score >= 40
                  ).length,
                });
              }
            } catch (err) {
              send("error", {
                message: `Aerial scan error (continuing without): ${err}`,
              });
            }
          }
        }

        // Step 4: AI Score in batches (with visual analysis context)
        const batches = chunkArray(candidateProperties, BATCH_SIZE);
        const totalBatches = batches.length;
        let scoredCount = 0;
        let flaggedCount = 0;
        let hotDealCount = 0;

        for (let i = 0; i < batches.length; i++) {
          send("scoring_batch", {
            batchNumber: i + 1,
            totalBatches,
          });

          let aiScores: AIPropertyScore[];
          try {
            aiScores = await scoreBatch(batches[i], visualAnalyses);
          } catch (err) {
            send("error", {
              message: `AI scoring error on batch ${i + 1}: ${err}`,
            });
            continue;
          }

          // Process each scored property
          for (const aiScore of aiScores) {
            const matchedProperty = batches[i].find(
              (p) =>
                (p.property_id || p.property_url || "") === aiScore.property_id
            );

            if (!matchedProperty) continue;

            const scoredProp = mapToScoredProperty(
              matchedProperty,
              aiScore,
              session.id
            );

            // Save to database
            try {
              await prisma.scoutedProperty.create({ data: scoredProp });
            } catch {
              // unique constraint — skip duplicates
            }

            const propId = matchedProperty.property_id || matchedProperty.property_url || "";
            const visual = visualAnalyses.get(propId) ?? null;
            const frontendProp = mapToFrontendProperty(matchedProperty, aiScore, visual);

            send("property_scored", { property: frontendProp });

            if (aiScore.distress_score >= 80) {
              send("hot_deal", { property: frontendProp });
              hotDealCount++;
            }

            if (aiScore.distress_score >= 40) {
              flaggedCount++;
            }

            scoredCount++;
          }

          send("batch_complete", {
            batchNumber: i + 1,
            scored: aiScores.length,
          });
        }

        // Step 4: Complete
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

function mapToScoredProperty(
  p: HomeHarvestProperty,
  ai: AIPropertyScore,
  sessionId: string
) {
  return {
    scoutSessionId: sessionId,
    propertyId: p.property_id || null,
    propertyUrl: p.property_url || null,
    address: `${p.street || "Unknown"}`,
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
    distressScore: ai.distress_score,
    distressSignals: JSON.stringify(ai.distress_signals),
    investmentType: ai.investment_type,
    estimatedArv: ai.estimated_arv ? Math.round(ai.estimated_arv) : null,
    repairLevel: ai.estimated_repair_cost?.level || null,
    repairCostLow: ai.estimated_repair_cost?.range_low
      ? Math.round(ai.estimated_repair_cost.range_low)
      : null,
    repairCostHigh: ai.estimated_repair_cost?.range_high
      ? Math.round(ai.estimated_repair_cost.range_high)
      : null,
    maxAllowableOffer: ai.max_allowable_offer
      ? Math.round(ai.max_allowable_offer)
      : null,
    wholesaleFeeEst: ai.profit_potential?.wholesale_fee_estimate
      ? Math.round(ai.profit_potential.wholesale_fee_estimate)
      : null,
    flipProfitEst: ai.profit_potential?.flip_profit_estimate
      ? Math.round(ai.profit_potential.flip_profit_estimate)
      : null,
    aiReasoning: ai.reasoning || null,
    aiConfidence: ai.confidence || null,
    recommendedAction: ai.recommended_action || null,
  };
}

function mapToFrontendProperty(
  p: HomeHarvestProperty,
  ai: AIPropertyScore,
  visual?: VisualDistressAnalysis | null
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
    distressScore: ai.distress_score,
    distressSignals: ai.distress_signals,
    investmentType: ai.investment_type,
    estimatedArv: ai.estimated_arv ? Math.round(ai.estimated_arv) : null,
    repairLevel: ai.estimated_repair_cost?.level || null,
    repairCostLow: ai.estimated_repair_cost?.range_low
      ? Math.round(ai.estimated_repair_cost.range_low)
      : null,
    repairCostHigh: ai.estimated_repair_cost?.range_high
      ? Math.round(ai.estimated_repair_cost.range_high)
      : null,
    maxAllowableOffer: ai.max_allowable_offer
      ? Math.round(ai.max_allowable_offer)
      : null,
    wholesaleFeeEst: ai.profit_potential?.wholesale_fee_estimate
      ? Math.round(ai.profit_potential.wholesale_fee_estimate)
      : null,
    flipProfitEst: ai.profit_potential?.flip_profit_estimate
      ? Math.round(ai.profit_potential.flip_profit_estimate)
      : null,
    aiReasoning: ai.reasoning || null,
    aiConfidence: ai.confidence || null,
    recommendedAction: ai.recommended_action || null,
    // Satellite / street view
    satelliteUrl:
      p.latitude && p.longitude
        ? getSatelliteImageUrl(p.latitude, p.longitude)
        : null,
    streetViewUrl:
      p.latitude && p.longitude
        ? getStreetViewUrl(p.latitude, p.longitude)
        : null,
    visualAnalysis: visual
      ? {
          score: visual.visual_distress_score,
          signals: visual.visual_signals,
          condition: visual.property_condition,
          notes: visual.notes,
        }
      : null,
  };
}
