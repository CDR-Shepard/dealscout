export interface HomeHarvestProperty {
  property_id?: string;
  property_url?: string;
  mls_id?: string;
  listing_id?: string;
  status?: string;
  style?: string;
  street?: string;
  unit?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  beds?: number;
  full_baths?: number;
  half_baths?: number;
  sqft?: number;
  year_built?: number;
  lot_sqft?: number;
  days_on_mls?: number;
  list_price?: number;
  list_date?: string;
  sold_price?: number;
  last_sold_date?: string;
  assessed_value?: number;
  estimated_value?: number;
  price_per_sqft?: number;
  hoa_fee?: number;
  latitude?: number;
  longitude?: number;
  stories?: number;
  garage?: number;
  parking_garage?: number;
  primary_photo?: string;
  alt_photos?: string;
  description?: string;
  neighborhoods?: string;
  agent?: string;
  agent_email?: string;
  agent_phone?: string;
  broker?: string;
  broker_phone?: string;
  nearby_schools?: string;
  _source?: "for_sale" | "foreclosure" | "pending" | "off_market" | "stale_sold";
  _years_since_sale?: number;
  [key: string]: unknown;
}

export interface SearchRequest {
  location: string;
  listing_type?: string;
  radius?: number;
  past_days?: number;
  price_min?: number;
  price_max?: number;
  beds_min?: number;
  beds_max?: number;
  sqft_min?: number;
  sqft_max?: number;
  year_built_min?: number;
  year_built_max?: number;
  foreclosure?: boolean;
  property_type?: string[];
  sort_by?: string;
  limit?: number;
}

export interface SearchResponse {
  success: boolean;
  count: number;
  properties: HomeHarvestProperty[];
  error?: string;
}

export interface MultiSearchResponse {
  success: boolean;
  count: number;
  properties: HomeHarvestProperty[];
  comps: HomeHarvestProperty[];
  counts?: {
    for_sale: number;
    foreclosures: number;
    pending: number;
    off_market: number;
    stale_sold: number;
    sold_comps: number;
  };
  error?: string;
}

export interface CompsResponse {
  success: boolean;
  count: number;
  comps: HomeHarvestProperty[];
  error?: string;
}
