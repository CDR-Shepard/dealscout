/**
 * Convert a polygon of [lng, lat] coordinates to a bounding box string
 * that can be used as a location query for HomeHarvest.
 */
export function polygonToBbox(
  polygon: [number, number][]
): { minLng: number; minLat: number; maxLng: number; maxLat: number } {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of polygon) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Get the center point of a bounding box.
 */
export function bboxCenter(bbox: {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}): [number, number] {
  return [
    (bbox.minLng + bbox.maxLng) / 2,
    (bbox.minLat + bbox.maxLat) / 2,
  ];
}
