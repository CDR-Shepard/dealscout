import type { HomeHarvestProperty } from "@/lib/homeharvest/types";

const DISTRESS_KEYWORDS = [
  "as-is",
  "as is",
  "investor special",
  "handyman",
  "fixer",
  "tlc",
  "needs work",
  "cash only",
  "estate sale",
  "motivated",
  "must sell",
  "price reduced",
  "bring offers",
  "sold as-is",
  "needs rehab",
  "needs renovation",
  "fire damage",
  "water damage",
  "vacant",
  "abandoned",
  "condemned",
  "tear down",
  "wholesale",
] as const;

export function preScore(property: HomeHarvestProperty): number {
  let score = 0;
  const source = property._source ?? "";

  // Off-market properties are inherently interesting — no competition
  if (source === "off_market") {
    score += 25;
  }

  // Stale sold = long-term owner, likely high equity, possibly deferred maintenance
  if (source === "stale_sold") {
    const years = property._years_since_sale ?? 0;
    if (years >= 10) score += 30;
    else if (years >= 7) score += 25;
    else if (years >= 5) score += 20;
    else if (years >= 3) score += 12;
  }

  // Foreclosure source tag from search strategy
  if (source === "foreclosure") {
    score += 30;
  }

  // Foreclosure / bank-owned / short sale flags in text
  const statusStr = JSON.stringify(property.status ?? "").toLowerCase();
  const descLower = (property.description ?? "").toLowerCase();
  const combinedText = `${statusStr} ${descLower}`;

  if (
    ["foreclosure", "bank_owned", "short_sale", "reo"].some((f) =>
      combinedText.includes(f)
    )
  ) {
    score += 30;
  }

  // Days on market
  const dom = property.days_on_mls ?? 0;
  if (dom > 180) score += 25;
  else if (dom > 90) score += 15;
  else if (dom > 60) score += 8;

  // Price vs estimated value gap
  const lp = property.list_price;
  const ev = property.estimated_value;
  if (lp && ev && ev > 0) {
    const ratio = lp / ev;
    if (ratio < 0.65) score += 25;
    else if (ratio < 0.75) score += 18;
    else if (ratio < 0.85) score += 10;
  }

  // Tax value mismatch
  const tav = property.assessed_value;
  if (lp && tav && tav > 0) {
    if (lp < tav * 0.7) score += 12;
  }

  // Age of property (older = more likely deferred maintenance)
  const yb = property.year_built;
  if (yb) {
    if (yb < 1960) score += 10;
    else if (yb < 1980) score += 5;
  }

  // Description keyword scan
  const keywordHits = DISTRESS_KEYWORDS.filter((kw) =>
    descLower.includes(kw)
  ).length;
  score += Math.min(keywordHits * 8, 25);

  return Math.min(score, 100);
}
