import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

export interface VisualDistressAnalysis {
  property_id: string;
  visual_distress_score: number; // 0-100
  visual_signals: string[];
  property_condition: "well_maintained" | "fair" | "poor" | "severely_distressed" | "unknown";
  notes: string;
}

/**
 * Build a Google Maps Static API satellite image URL with a red pin on the target property.
 */
export function getSatelliteImageUrl(
  lat: number,
  lng: number,
  zoom = 19,
  size = "600x400"
): string | null {
  if (!GOOGLE_API_KEY) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&markers=color:red|${lat},${lng}&key=${GOOGLE_API_KEY}`;
}

/**
 * Build a Google Street View Static API URL for a property.
 */
export function getStreetViewUrl(
  lat: number,
  lng: number,
  size = "600x400"
): string | null {
  if (!GOOGLE_API_KEY) return null;
  return `https://maps.googleapis.com/maps/api/streetview?location=${lat},${lng}&size=${size}&fov=90&key=${GOOGLE_API_KEY}`;
}

/**
 * Fetch Street View metadata to get the image capture date.
 * Returns the date string (e.g. "2023-07") or null.
 */
async function getStreetViewDate(lat: number, lng: number): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === "OK" && data.date) {
      return data.date as string;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch an image as base64. Returns null with a logged reason on failure.
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text") || contentType.includes("json")) {
        const body = await response.text();
        console.error(`Image fetch failed (${response.status}): ${body.slice(0, 200)}`);
      } else {
        console.error(`Image fetch failed (${response.status}) for ${url.split("?")[0]}`);
      }
      return null;
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      const body = await response.text();
      console.error(`Expected image but got ${contentType}: ${body.slice(0, 200)}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (err) {
    console.error("Image fetch error:", err);
    return null;
  }
}

const VISUAL_ANALYSIS_PROMPT = `You are a real estate property condition analyst specializing in DEFERRED MAINTENANCE detection. You are performing a "virtual drive-by" inspection using satellite and street-level imagery.

IMPORTANT — IMAGE DATING:
- The SATELLITE/AERIAL image and STREET VIEW image may have been captured on DIFFERENT dates (sometimes years apart).
- The capture dates are provided with each image when available.
- If the street view looks renovated but the listing photo shows disrepair (or vice versa), note this discrepancy — the property may have been recently renovated or may have deteriorated since the street view was taken.
- Always note which image you are basing your assessment on and flag any date conflicts.
- PRIORITIZE the most recent imagery when images conflict. A recently renovated property visible in newer street view overrides an old listing photo showing disrepair.

SATELLITE/AERIAL VIEW: A red pin marks the EXACT property to analyze. Focus your analysis on the property at the red marker, not neighboring homes.

Analyze the provided image(s) looking specifically for these DEFERRED MAINTENANCE indicators:

PRIORITY SIGNALS (look for these first):
- GRASS/LAWN: Overgrown weeds (3+ feet), dead/brown grass beyond normal drought, completely bare dirt yard
- LANDSCAPING: Non-existent landscaping, dead trees/bushes, overgrown hedges blocking windows
- VEHICLES: Old/junker cars in driveway or backyard, cars on blocks, RVs, boats in disrepair, multiple non-running vehicles
- WINDOW BARS: Security bars on windows (indicates area concerns, tired owner)
- PAINT: Fading, peeling, chipping, or bare wood on exterior walls, fascia, trim, eaves
- ROOF TARPS: Blue tarps on roof (major red flag — active leak, deferred repair)
- ROOF DAMAGE: Missing shingles, sagging roof line, moss/debris accumulation
- POOLS: Empty/drained pools, green algae pools, pools with debris/leaves covering surface
- HOARDING/JUNK: Visible junk, furniture, appliances, or clutter in yard, on porch, or visible through windows
- WINDOWS: Old single-pane aluminum-frame windows (vs modern double-pane vinyl) — especially relevant in San Diego and LA markets
- FENCING: Leaning, broken, or missing fence sections
- DRIVEWAY: Cracked, broken, or heavily stained concrete/asphalt
- SIDING: Damaged, missing, or severely faded siding panels
- FOUNDATION: Visible cracks in foundation or retaining walls

COMPARISON: Always compare the marked property to its immediate neighbors. A property that is noticeably worse than its neighbors is a stronger signal.

Return a JSON object (NOT an array):
{
  "property_id": "<the property ID provided>",
  "visual_distress_score": <0-100, where 100 = severely distressed with multiple deferred maintenance issues>,
  "visual_signals": ["signal1", "signal2", ...],
  "property_condition": "well_maintained" | "fair" | "poor" | "severely_distressed" | "unknown",
  "notes": "<1-2 sentences specifically describing the deferred maintenance you observe. Note any date discrepancies between images.>"
}

Be SPECIFIC in visual_signals — instead of "yard debris", say "multiple old appliances visible in backyard" or "3+ foot tall weeds in front yard". Specificity helps investors know what to expect.

If the image is unclear, too zoomed out, or you can't make a determination, set visual_distress_score to 0, condition to "unknown", and explain in notes.

Return ONLY the JSON object, no other text.`;

/**
 * Analyze a single property using satellite + street view imagery.
 * Fetches street view metadata for capture date context.
 */
export async function analyzePropertyVisually(
  propertyId: string,
  lat: number,
  lng: number
): Promise<VisualDistressAnalysis | null> {
  const satelliteUrl = getSatelliteImageUrl(lat, lng);
  const streetViewUrl = getStreetViewUrl(lat, lng);

  if (!satelliteUrl && !streetViewUrl) return null;

  // Fetch images and street view date in parallel
  const [satelliteB64, streetViewB64, streetViewDate] = await Promise.all([
    satelliteUrl ? fetchImageAsBase64(satelliteUrl) : Promise.resolve(null),
    streetViewUrl ? fetchImageAsBase64(streetViewUrl) : Promise.resolve(null),
    getStreetViewDate(lat, lng),
  ]);

  // Need at least one image
  if (!satelliteB64 && !streetViewB64) return null;

  // Build content with available images
  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

  if (satelliteB64) {
    content.push({
      type: "text" as const,
      text: "SATELLITE/AERIAL VIEW (red pin marks the target property):",
    });
    content.push({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/png" as const,
        data: satelliteB64,
      },
    });
  }

  if (streetViewB64) {
    const dateNote = streetViewDate
      ? ` (captured: ${streetViewDate})`
      : " (capture date unknown)";
    content.push({
      type: "text" as const,
      text: `STREET-LEVEL VIEW${dateNote}:`,
    });
    content.push({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/jpeg" as const,
        data: streetViewB64,
      },
    });
  }

  content.push({
    type: "text" as const,
    text: `Property ID: ${propertyId}\nCoordinates: ${lat}, ${lng}\n\nAnalyze the property at the red pin marker. Note if street view and aerial imagery appear to be from different time periods.`,
  });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: VISUAL_ANALYSIS_PROMPT,
      messages: [{ role: "user", content }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as VisualDistressAnalysis;
  } catch (err) {
    console.error(`Visual analysis failed for ${propertyId}:`, err);
    return null;
  }
}

/**
 * Batch analyze multiple properties visually.
 * Runs in parallel with concurrency limit to avoid rate limits.
 */
export async function analyzePropertiesBatch(
  properties: { propertyId: string; lat: number; lng: number }[],
  concurrency = 3
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
        item.lng
      );
      if (analysis) {
        results.set(item.propertyId, analysis);
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return results;
}
