import type {
  SearchRequest,
  SearchResponse,
  MultiSearchResponse,
  CompsResponse,
} from "./types";

const BASE_URL = process.env.HOMEHARVEST_API_URL || "http://localhost:8001";

async function request<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HomeHarvest API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function searchProperties(
  req: SearchRequest
): Promise<SearchResponse> {
  return request<SearchResponse>("/search", req);
}

export async function searchMulti(
  req: SearchRequest
): Promise<MultiSearchResponse> {
  return request<MultiSearchResponse>("/search/multi", req);
}

export async function getComps(
  address: string,
  radius = 1.0,
  pastDays = 90
): Promise<CompsResponse> {
  const params = new URLSearchParams({
    address,
    radius: radius.toString(),
    past_days: pastDays.toString(),
  });
  const res = await fetch(`${BASE_URL}/comps?${params}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`HomeHarvest comps error: ${res.status}`);
  }
  return res.json() as Promise<CompsResponse>;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
