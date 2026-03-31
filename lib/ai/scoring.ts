import type { HomeHarvestProperty } from "@/lib/homeharvest/types";
import type { VisualDistressAnalysis } from "./satellite";

/**
 * Build a text summary of property metadata for inclusion
 * in the visual analysis prompt. This gives Claude data context
 * alongside the images so it can cross-reference what it sees
 * with what the data says (e.g., "listed 180 days" + "overgrown lawn").
 */
export function buildPropertyContext(
  property: HomeHarvestProperty,
  visual?: VisualDistressAnalysis | null
): string {
  const lines: string[] = [];

  const address = `${property.street || "Unknown"}, ${property.city || ""}, ${property.state || ""} ${property.zip_code || ""}`;
  lines.push(`Address: ${address}`);

  if (property.status) lines.push(`Listing status: ${property.status}`);
  if (property._source) lines.push(`Source: ${property._source}`);
  if (property._years_since_sale) {
    lines.push(`Years since last sale: ${property._years_since_sale}`);
  }

  if (property.list_price) lines.push(`List price: $${property.list_price.toLocaleString()}`);
  if (property.estimated_value) lines.push(`Estimated value: $${property.estimated_value.toLocaleString()}`);
  if (property.assessed_value) lines.push(`Tax assessed value: $${property.assessed_value.toLocaleString()}`);

  if (property.sqft) lines.push(`Sqft: ${property.sqft.toLocaleString()}`);
  if (property.beds) lines.push(`Beds: ${property.beds}`);
  const baths = (property.full_baths ?? 0) + (property.half_baths ?? 0) * 0.5;
  if (baths > 0) lines.push(`Baths: ${baths}`);
  if (property.year_built) lines.push(`Year built: ${property.year_built}`);
  if (property.lot_sqft) lines.push(`Lot sqft: ${property.lot_sqft.toLocaleString()}`);
  if (property.days_on_mls) lines.push(`Days on MLS: ${property.days_on_mls}`);
  if (property.style) lines.push(`Property type: ${property.style}`);
  if (property.hoa_fee) lines.push(`HOA fee: $${property.hoa_fee}/mo`);

  // Price signals
  if (property.list_price && property.estimated_value && property.estimated_value > 0) {
    const ratio = property.list_price / property.estimated_value;
    if (ratio < 0.85) {
      lines.push(`** Listed ${Math.round((1 - ratio) * 100)}% BELOW estimated value **`);
    }
  }

  // Description excerpt (distress keywords bolded)
  const desc = (property.description ?? "").slice(0, 600);
  if (desc) lines.push(`Description excerpt: "${desc}"`);

  return lines.join("\n");
}

/**
 * Extract listing photo URLs from a HomeHarvest property.
 */
export function extractListingPhotos(property: HomeHarvestProperty): string[] {
  const photos: string[] = [];

  if (property.primary_photo) {
    photos.push(property.primary_photo);
  }

  if (property.alt_photos) {
    try {
      // alt_photos can be a JSON string of URLs or comma-separated
      const parsed = JSON.parse(property.alt_photos as string);
      if (Array.isArray(parsed)) {
        photos.push(...parsed.slice(0, 3));
      }
    } catch {
      // Try comma-separated
      const parts = (property.alt_photos as string).split(",").map((s) => s.trim()).filter(Boolean);
      photos.push(...parts.slice(0, 3));
    }
  }

  // Dedupe and limit to 4 total
  return [...new Set(photos)].slice(0, 4);
}

export function chunkArray<T>(arr: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
