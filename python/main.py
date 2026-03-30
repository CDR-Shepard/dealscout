from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from homeharvest import scrape_property
from typing import Optional
import traceback

app = FastAPI(title="DealScout HomeHarvest Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    location: str
    listing_type: str | None = "for_sale"
    radius: Optional[float] = None
    past_days: Optional[int] = None
    price_min: Optional[int] = None
    price_max: Optional[int] = None
    beds_min: Optional[int] = None
    beds_max: Optional[int] = None
    sqft_min: Optional[int] = None
    sqft_max: Optional[int] = None
    year_built_min: Optional[int] = None
    year_built_max: Optional[int] = None
    foreclosure: Optional[bool] = None
    property_type: Optional[list] = None
    sort_by: Optional[str] = "list_date"
    limit: int = 500


def _scrape_safe(
    location: str, listing_type: str = "for_sale", **kwargs
) -> list[dict]:
    """Run scrape_property with error handling, return list of dicts."""
    try:
        df = scrape_property(
            location=location,
            listing_type=listing_type,
            **kwargs,
        )
        if df is None or df.empty:
            return []
        return df.fillna("").to_dict(orient="records")
    except Exception as e:
        print(f"Scrape error ({listing_type}): {e}")
        traceback.print_exc()
        return []


def _add_properties(
    target: dict[str, dict],
    results: list[dict],
    source_tag: str,
    id_set: set[str] | None = None,
) -> int:
    """Add properties to the target dict, tagging their source. Returns count added."""
    added = 0
    for p in results:
        pid = str(p.get("property_id") or p.get("property_url", ""))
        if not pid:
            continue
        # Tag the source so the frontend knows where this came from
        if pid not in target:
            p["_source"] = source_tag
            target[pid] = p
            added += 1
        if id_set is not None:
            id_set.add(pid)
    return added


@app.post("/search")
def search(req: SearchRequest):
    """Main property search endpoint."""
    params: dict = {}
    if req.radius is not None:
        params["radius"] = req.radius
    if req.past_days is not None:
        params["past_days"] = req.past_days
    if req.foreclosure is not None:
        params["foreclosure"] = req.foreclosure

    results = _scrape_safe(
        location=req.location,
        listing_type=req.listing_type or "for_sale",
        **params,
    )
    return {"success": True, "count": len(results), "properties": results}


@app.post("/search/multi")
def search_multi(req: SearchRequest):
    """Run multiple search strategies for maximum coverage.
    This is the primary endpoint used by the AI Scout.

    Strategies:
    1. for_sale — active listings
    2. foreclosures — bank-owned, REO, short sales
    3. pending — stale pendings = motivated sellers
    4. off_market — THE D4D GOLD: properties not listed anywhere
    5. sold (long-term) — find stale owners, tired landlords, estate situations
    6. sold (recent) — comps baseline for ARV
    """
    location = req.location
    all_properties: dict[str, dict] = {}
    foreclosure_ids: set[str] = set()
    pending_ids: set[str] = set()
    off_market_ids: set[str] = set()
    stale_sold_ids: set[str] = set()

    # Strategy 1: Regular for_sale
    r1 = _scrape_safe(location=location, listing_type="for_sale")
    _add_properties(all_properties, r1, "for_sale")
    for_sale_count = len(all_properties)

    # Strategy 2: Foreclosures specifically
    r2 = _scrape_safe(location=location, listing_type="for_sale", foreclosure=True)
    _add_properties(all_properties, r2, "foreclosure", foreclosure_ids)

    # Strategy 3: Pending (stale pendings = motivated)
    r3 = _scrape_safe(location=location, listing_type="pending")
    _add_properties(all_properties, r3, "pending", pending_ids)

    # Strategy 4: Off-market — the real D4D play
    # These are properties NOT currently listed. HomeHarvest pulls them from
    # Realtor.com's off-market database which includes tax records and
    # properties that were previously listed but taken off market.
    r4 = _scrape_safe(location=location, listing_type="off_market")
    _add_properties(all_properties, r4, "off_market", off_market_ids)

    # Strategy 5: Sold long ago — find stale owners (5+ years, likely high equity,
    # tired landlords, inherited properties, or deferred maintenance)
    r5 = _scrape_safe(
        location=location,
        listing_type="sold",
        past_days=3650,  # 10 years of history
    )
    # Only keep sold properties that aren't already in our active/off-market set
    # and that sold more than 2 years ago (recent sales are just comps)
    from datetime import datetime, timedelta

    two_years_ago = datetime.now() - timedelta(days=730)
    for p in r5:
        pid = str(p.get("property_id") or p.get("property_url", ""))
        if not pid or pid in all_properties:
            continue
        # Check if the sale is old enough to indicate a stale owner
        sold_date_str = p.get("last_sold_date", "")
        if sold_date_str:
            try:
                sold_date = datetime.strptime(str(sold_date_str)[:10], "%Y-%m-%d")
                if sold_date < two_years_ago:
                    p["_source"] = "stale_sold"
                    p["_years_since_sale"] = round(
                        (datetime.now() - sold_date).days / 365.25, 1
                    )
                    all_properties[pid] = p
                    stale_sold_ids.add(pid)
            except (ValueError, TypeError):
                pass

    # Strategy 6: Recently sold (for comps baseline — NOT added to scout targets)
    comps = _scrape_safe(
        location=location,
        listing_type="sold",
        past_days=90,
    )

    return {
        "success": True,
        "count": len(all_properties),
        "properties": list(all_properties.values()),
        "comps": comps,
        "counts": {
            "for_sale": for_sale_count,
            "foreclosures": len(foreclosure_ids),
            "pending": len(pending_ids),
            "off_market": len(off_market_ids),
            "stale_sold": len(stale_sold_ids),
            "sold_comps": len(comps),
        },
    }


@app.post("/comps")
def get_comps(address: str, radius: float = 1.0, past_days: int = 90):
    """Get comparable sold properties near a specific address."""
    results = _scrape_safe(
        location=address,
        listing_type="sold",
        radius=radius,
        past_days=past_days,
    )
    return {"success": True, "count": len(results), "comps": results}


@app.get("/health")
def health():
    return {"status": "ok"}
