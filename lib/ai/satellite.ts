import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

// Cache TTL: skip re-analysis if analyzed within this window
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Image URL builders ───

/** Satellite view of the target property (zoomed in). */
export function getSatelliteImageUrl(
  lat: number,
  lng: number,
  zoom = 19,
  size = "640x640"
): string | null {
  if (!GOOGLE_API_KEY) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&markers=color:red|${lat},${lng}&key=${GOOGLE_API_KEY}`;
}

/** Neighborhood context — zoomed out to show surrounding block. */
export function getNeighborhoodImageUrl(
  lat: number,
  lng: number,
  zoom = 17,
  size = "640x640"
): string | null {
  if (!GOOGLE_API_KEY) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&markers=color:red|${lat},${lng}&key=${GOOGLE_API_KEY}`;
}

/** Street View at a specific heading (compass direction). */
export function getStreetViewUrl(
  lat: number,
  lng: number,
  heading: number,
  size = "640x640"
): string | null {
  if (!GOOGLE_API_KEY) return null;
  return `https://maps.googleapis.com/maps/api/streetview?location=${lat},${lng}&size=${size}&fov=90&heading=${heading}&key=${GOOGLE_API_KEY}`;
}

/** Check if Street View coverage exists at this location. */
export async function getStreetViewMetadata(
  lat: number,
  lng: number
): Promise<{ available: boolean; date: string | null }> {
  if (!GOOGLE_API_KEY) return { available: false, date: null };
  try {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return { available: false, date: null };
    const data = await response.json();
    return {
      available: data.status === "OK",
      date: data.date ?? null,
    };
  } catch {
    return { available: false, date: null };
  }
}

// ─── Image fetching ───

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image")) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

async function fetchListingPhotoAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image")) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

// ─── Types ───

export interface VisualDistressAnalysis {
  property_id: string;
  visual_distress_score: number;
  visual_signals: string[];
  property_condition:
    | "well_maintained"
    | "fair"
    | "poor"
    | "severely_distressed"
    | "unknown";
  notes: string;
  neighbor_comparison: string;
}

export interface PropertyImageSet {
  satelliteUrl: string | null;
  neighborhoodUrl: string | null;
  streetViewUrls: string[];
  streetViewDate: string | null;
}

// ─── Cache ───

async function getCachedAnalysis(
  propertyId: string
): Promise<VisualDistressAnalysis | null> {
  try {
    const cached = await prisma.visualAnalysisCache.findUnique({
      where: { propertyId },
    });
    if (!cached) return null;
    const age = Date.now() - cached.analyzedAt.getTime();
    if (age > CACHE_TTL_MS) return null;
    return {
      property_id: cached.propertyId,
      visual_distress_score: cached.distressScore,
      visual_signals: JSON.parse(cached.signals),
      property_condition: cached.condition as VisualDistressAnalysis["property_condition"],
      notes: cached.notes,
      neighbor_comparison: "",
    };
  } catch {
    return null;
  }
}

async function cacheAnalysis(
  analysis: VisualDistressAnalysis,
  lat: number,
  lng: number,
  imageCount: number
): Promise<void> {
  try {
    await prisma.visualAnalysisCache.upsert({
      where: { propertyId: analysis.property_id },
      create: {
        propertyId: analysis.property_id,
        latitude: lat,
        longitude: lng,
        distressScore: analysis.visual_distress_score,
        signals: JSON.stringify(analysis.visual_signals),
        condition: analysis.property_condition,
        notes: analysis.notes,
        imageCount,
      },
      update: {
        distressScore: analysis.visual_distress_score,
        signals: JSON.stringify(analysis.visual_signals),
        condition: analysis.property_condition,
        notes: analysis.notes,
        imageCount,
        analyzedAt: new Date(),
      },
    });
  } catch {
    // cache write failure is non-fatal
  }
}

// ─── Image gathering ───

/**
 * Gather all available imagery for a property:
 * - 1 satellite (zoom 19, 640x640)
 * - 1 neighborhood context (zoom 17, 640x640)
 * - Up to 4 street view angles (N/E/S/W)
 * - Up to 3 listing photos
 *
 * Returns base64-encoded images ready for Claude vision.
 */
export async function gatherPropertyImages(
  lat: number,
  lng: number,
  listingPhotos?: string[]
): Promise<{
  images: Array<{
    label: string;
    base64: string;
    mediaType: "image/png" | "image/jpeg";
  }>;
  streetViewDate: string | null;
  urls: PropertyImageSet;
}> {
  const images: Array<{
    label: string;
    base64: string;
    mediaType: "image/png" | "image/jpeg";
  }> = [];

  // Check street view availability first (free metadata call)
  const svMeta = await getStreetViewMetadata(lat, lng);

  // Build all image URLs
  const satelliteUrl = getSatelliteImageUrl(lat, lng, 19);
  const neighborhoodUrl = getNeighborhoodImageUrl(lat, lng, 17);

  const streetViewHeadings = [0, 90, 180, 270];
  const streetViewUrls: string[] = [];
  if (svMeta.available) {
    for (const heading of streetViewHeadings) {
      const url = getStreetViewUrl(lat, lng, heading);
      if (url) streetViewUrls.push(url);
    }
  }

  // Fetch all images in parallel
  const fetchPromises: Array<
    Promise<{ label: string; base64: string | null; mediaType: "image/png" | "image/jpeg" }>
  > = [];

  if (satelliteUrl) {
    fetchPromises.push(
      fetchImageAsBase64(satelliteUrl).then((b64) => ({
        label: "SATELLITE/AERIAL VIEW — zoomed in (red pin = target property)",
        base64: b64,
        mediaType: "image/png" as const,
      }))
    );
  }

  if (neighborhoodUrl) {
    fetchPromises.push(
      fetchImageAsBase64(neighborhoodUrl).then((b64) => ({
        label: "NEIGHBORHOOD CONTEXT — zoomed out (red pin = target, compare to surrounding properties)",
        base64: b64,
        mediaType: "image/png" as const,
      }))
    );
  }

  const headingLabels = ["NORTH", "EAST", "SOUTH", "WEST"];
  for (let i = 0; i < streetViewUrls.length; i++) {
    const dateNote = svMeta.date ? ` (captured: ${svMeta.date})` : "";
    fetchPromises.push(
      fetchImageAsBase64(streetViewUrls[i]).then((b64) => ({
        label: `STREET VIEW — ${headingLabels[i]} facing${dateNote}`,
        base64: b64,
        mediaType: "image/jpeg" as const,
      }))
    );
  }

  // Listing photos (up to 3)
  const photos = (listingPhotos ?? []).slice(0, 3);
  for (let i = 0; i < photos.length; i++) {
    fetchPromises.push(
      fetchListingPhotoAsBase64(photos[i]).then((b64) => ({
        label: `LISTING PHOTO ${i + 1} of ${photos.length}`,
        base64: b64,
        mediaType: "image/jpeg" as const,
      }))
    );
  }

  const results = await Promise.all(fetchPromises);

  for (const result of results) {
    if (result.base64) {
      images.push({
        label: result.label,
        base64: result.base64,
        mediaType: result.mediaType,
      });
    }
  }

  return {
    images,
    streetViewDate: svMeta.date,
    urls: {
      satelliteUrl,
      neighborhoodUrl,
      streetViewUrls,
      streetViewDate: svMeta.date,
    },
  };
}

// ─── Single-pass visual analysis ───

/**
 * Analyze a single property in one pass: all imagery + property data → Claude.
 * Returns null only if zero images could be fetched.
 */
export async function analyzePropertyVisually(
  propertyId: string,
  lat: number,
  lng: number,
  propertyContext: string,
  listingPhotos?: string[]
): Promise<VisualDistressAnalysis | null> {
  // Check cache first
  const cached = await getCachedAnalysis(propertyId);
  if (cached) return cached;

  const { images } = await gatherPropertyImages(lat, lng, listingPhotos);

  if (images.length === 0) return null;

  // Build Claude message content
  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

  for (const img of images) {
    content.push({ type: "text" as const, text: img.label });
    content.push({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mediaType,
        data: img.base64,
      },
    });
  }

  content.push({
    type: "text" as const,
    text: `Property ID: ${propertyId}\nCoordinates: ${lat}, ${lng}\n\n${propertyContext}\n\nAnalyze the property at the red pin marker using ALL provided images. You have multiple viewing angles — use them to cross-reference what you see.`,
  });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: DISTRESS_DETECTION_PROMPT,
      messages: [{ role: "user", content }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const analysis = JSON.parse(jsonMatch[0]) as VisualDistressAnalysis;

    // Cache the result
    await cacheAnalysis(analysis, lat, lng, images.length);

    return analysis;
  } catch (err) {
    console.error(`Visual analysis failed for ${propertyId}:`, err);
    return null;
  }
}

/**
 * Batch analyze properties with concurrency control.
 */
export async function analyzePropertiesBatch(
  properties: Array<{
    propertyId: string;
    lat: number;
    lng: number;
    context: string;
    listingPhotos?: string[];
  }>,
  concurrency = 5,
  onResult?: (propertyId: string, analysis: VisualDistressAnalysis | null) => void
): Promise<Map<string, VisualDistressAnalysis>> {
  const results = new Map<string, VisualDistressAnalysis>();
  const queue = [...properties];

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const analysis = await analyzePropertyVisually(
        item.propertyId,
        item.lat,
        item.lng,
        item.context,
        item.listingPhotos
      );
      if (analysis) {
        results.set(item.propertyId, analysis);
      }
      onResult?.(item.propertyId, analysis);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

// ─── The prompt ───

const DISTRESS_DETECTION_PROMPT = `You are an expert property condition analyst performing a "virtual drive-by" inspection. Your SOLE purpose is detecting DEFERRED MAINTENANCE — physical signs that a property owner has stopped maintaining their home. This is the #1 indicator of a motivated seller.

You will receive MULTIPLE images of a single property from different angles and sources:
- SATELLITE/AERIAL views (zoomed in + neighborhood context)
- STREET VIEW from up to 4 compass directions (N/E/S/W)
- LISTING PHOTOS showing interior or exterior

USE ALL IMAGES. Cross-reference what you see from different angles. A blue tarp visible in satellite may be hidden from the front street view. A trashed backyard visible from aerial may look fine from the street.

IMAGE DATING: Satellite, street view, and listing photos may be from DIFFERENT dates (sometimes years apart). Capture dates are provided when available. If images conflict (e.g., street view shows renovation but satellite shows disrepair), flag this and indicate which appears more recent.

NEIGHBORHOOD COMPARISON: The zoomed-out neighborhood image lets you compare the target property (red pin) to its immediate neighbors. A property that is VISIBLY WORSE than neighbors is a much stronger signal. Always comment on this comparison.

DEFERRED MAINTENANCE SIGNALS — score each one you detect:

EXTERIOR (visible from street + aerial):
- Overgrown weeds/lawn (3+ feet), dead grass, bare dirt yard: +10-15
- Dead landscaping, overgrown hedges blocking windows: +10-15
- Fading, peeling, chipping paint on walls/fascia/trim: +10-15
- Damaged/missing/severely faded siding: +10-15
- Cracked, broken, or heavily stained driveway: +5-10
- Leaning, broken, or missing fence sections: +5-10
- Visible foundation cracks or retaining wall damage: +15-20

ROOF (best visible from aerial):
- Blue tarps covering damage: +15-20 (major red flag)
- Missing shingles, sagging roof line: +15-20
- Moss/debris accumulation on roof: +10-15
- Mismatched or patched roofing: +5-10

YARD / LOT (visible from aerial + street):
- Old/junker vehicles, cars on blocks, non-running vehicles: +10-15
- Junk, furniture, appliances in yard or on porch: +10-15
- Empty/drained pool or green algae pool: +10-15
- Construction debris or abandoned projects: +10-15
- Boats, RVs in disrepair on property: +5-10

WINDOWS & SECURITY:
- Security bars on windows: +5-10
- Old single-pane aluminum-frame windows (vs modern vinyl): +10-15 (especially in SoCal)
- Boarded-up windows: +20-25
- Broken or cracked windows: +10-15

INTERIOR (from listing photos, if provided):
- Outdated kitchen (laminate counters, old appliances, wood paneling): +5-10
- Water stains on ceilings or walls: +10-15
- Peeling wallpaper or damaged walls: +5-10
- Old carpet, damaged flooring: +5-10
- Cluttered/hoarding conditions: +10-15
- Mold visible: +15-20

REGIONAL NOTES:
- SoCal (SD/LA): Drought-dead lawn ≠ abandoned lawn. Look for 3+ foot weeds vs. just brown grass.
- SoCal: Single-pane aluminum windows = major signal (decades without updates).
- Pool markets: Empty/green pool = owner gave up. Expensive fix.

Return a JSON object:
{
  "property_id": "<provided>",
  "visual_distress_score": <0-100>,
  "visual_signals": ["specific signal 1", "specific signal 2", ...],
  "property_condition": "well_maintained" | "fair" | "poor" | "severely_distressed" | "unknown",
  "neighbor_comparison": "<1 sentence comparing this property to its visible neighbors>",
  "notes": "<2-3 sentences describing what you observe across ALL images. Mention which images revealed what. Flag any date discrepancies.>"
}

Be SPECIFIC in visual_signals. Not "yard debris" but "three old appliances and a mattress visible in backyard from aerial view." Not "bad roof" but "blue tarp covering ~30% of roof visible in satellite image, missing shingles on south-facing slope visible in street view."

If images are unclear or you genuinely cannot determine condition, score 0 with condition "unknown" and explain why in notes.

Return ONLY the JSON object.`;
