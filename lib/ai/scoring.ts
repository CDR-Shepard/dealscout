import Anthropic from "@anthropic-ai/sdk";
import { SCORING_SYSTEM_PROMPT } from "./prompts";
import type { HomeHarvestProperty } from "@/lib/homeharvest/types";
import type { VisualDistressAnalysis } from "./satellite";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AIPropertyScore {
  property_id: string;
  distress_score: number;
  distress_signals: string[];
  investment_type: "wholesale" | "fix_and_flip" | "buy_and_hold" | "pass";
  estimated_arv: number | null;
  estimated_repair_cost: {
    level: "minimal" | "moderate" | "heavy" | "gut_rehab";
    range_low: number;
    range_high: number;
  };
  max_allowable_offer: number | null;
  profit_potential: {
    wholesale_fee_estimate: number | null;
    flip_profit_estimate: number | null;
  };
  reasoning: string;
  confidence: number;
  recommended_action: string;
}

export async function scoreBatch(
  properties: HomeHarvestProperty[],
  visualAnalyses?: Map<string, VisualDistressAnalysis>
): Promise<AIPropertyScore[]> {
  const propertySummaries = properties.map((p) => {
    const pid = p.property_id || p.property_url || "";
    const visual = visualAnalyses?.get(pid);

    const summary: Record<string, unknown> = {
      property_id: pid,
      address: `${p.street || ""}, ${p.city || ""}, ${p.state || ""} ${p.zip_code || ""}`,
      list_price: p.list_price || null,
      estimated_value: p.estimated_value || null,
      assessed_value: p.assessed_value || null,
      sold_price: p.sold_price || null,
      last_sold_date: p.last_sold_date || null,
      sqft: p.sqft,
      beds: p.beds,
      baths: (p.full_baths ?? 0) + (p.half_baths ?? 0) * 0.5,
      year_built: p.year_built,
      lot_sqft: p.lot_sqft,
      days_on_mls: p.days_on_mls,
      price_per_sqft: p.price_per_sqft,
      status: p.status,
      style: p.style,
      description: (p.description ?? "").slice(0, 500),
      hoa_fee: p.hoa_fee,
      // Source context so Claude knows where this property came from
      source: p._source ?? "for_sale",
    };

    // Add stale owner context
    if (p._years_since_sale) {
      summary.years_since_last_sale = p._years_since_sale;
    }

    // Add visual analysis if available
    if (visual) {
      summary.visual_analysis = {
        visual_distress_score: visual.visual_distress_score,
        visual_signals: visual.visual_signals,
        property_condition: visual.property_condition,
        notes: visual.notes,
      };
    }

    return summary;
  });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SCORING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Score these ${properties.length} properties:\n\n${JSON.stringify(propertySummaries, null, 2)}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI scoring response");
  }

  return JSON.parse(jsonMatch[0]) as AIPropertyScore[];
}

export function chunkArray<T>(arr: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
