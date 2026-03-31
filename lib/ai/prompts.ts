/**
 * V1: Distress detection prompt is embedded in satellite.ts (DISTRESS_DETECTION_PROMPT).
 * This file is reserved for future v2 scoring prompts (ARV, deal math, etc.)
 *
 * The visual analysis prompt handles everything for v1:
 * - Multi-angle imagery analysis (satellite, neighborhood, 4x street view, listing photos)
 * - Deferred maintenance signal detection with specific scoring weights
 * - Neighbor comparison from zoomed-out satellite view
 * - Cross-referencing visual + data signals
 */

export const V2_SCORING_SYSTEM_PROMPT = `Reserved for v2: deal math scoring (ARV, MAO, repair estimates).
Currently all distress detection is handled by the visual analysis prompt in satellite.ts.`;
