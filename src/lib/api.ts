const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface SearchResult {
  row_id: number;
  tz: string;
  family_name: string | null;
  first_name: string | null;
  city: string | null;
  street: string | null;
  phone: string | null;
  birth_year: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface Person {
  row_id: number;
  tz: string;
  family_name: string | null;
  first_name: string | null;
  prev_name: string | null;
  father_name: string | null;
  mother_name: string | null;
  father_tz: string | null;
  mother_tz: string | null;
  city: string | null;
  street: string | null;
  house_num: string | null;
  zipcode: string | null;
  phone_area: string | null;
  phone: string | null;
  extra_phones: string | null;
  birth_year: string | null;
  birth_month: string | null;
  birth_day: string | null;
  birth_dow: string | null;
  heb_year: string | null;
  heb_month: string | null;
  heb_day: string | null;
  aliya_year: string | null;
  aliya_month: string | null;
  aliya_day: string | null;
  birth_country: string | null;
  marital: string | null;
  clan: string | null;
}

export interface FamilyTree {
  person: Person;
  father?: Person;
  mother?: Person;
  siblings?: SearchResult[];
  children?: SearchResult[];
  uncles_aunts_father?: SearchResult[];
  uncles_aunts_mother?: SearchResult[];
  cousins?: SearchResult[];
}

export interface Stats {
  total_people: number;
  unique_cities: number;
  unique_family_names: number;
  with_phone: number;
}

export interface NeighborResult {
  person: Person;
  neighbors: SearchResult[];
  total: number;
}

export interface NeighborhoodResult {
  person: Person;
  city: string;
  streets: { name: string; count: number }[];
  total_in_city: number;
}

export interface PaginatedResult {
  person: Person;
  results: SearchResult[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
  year_range?: [number, number];
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function searchPeople(params: {
  family?: string;
  first?: string;
  city?: string;
  phone?: string;
  tz?: string;
  page?: number;
  per_page?: number;
}): Promise<SearchResponse> {
  const sp = new URLSearchParams();
  if (params.family) sp.set("family", params.family);
  if (params.first) sp.set("first", params.first);
  if (params.city) sp.set("city", params.city);
  if (params.phone) sp.set("phone", params.phone);
  if (params.tz) sp.set("tz", params.tz);
  sp.set("page", String(params.page || 1));
  sp.set("per_page", String(params.per_page || 50));
  return fetchJSON(`${API_BASE}/search?${sp}`);
}

export async function getPerson(tz: string): Promise<Person> {
  return fetchJSON(`${API_BASE}/person/${encodeURIComponent(tz)}`);
}

export async function reversePhone(phone: string): Promise<{ results: SearchResult[]; count: number }> {
  return fetchJSON(`${API_BASE}/reverse-phone/${encodeURIComponent(phone)}`);
}

export async function getAutocomplete(field: string, prefix: string, limit = 10): Promise<{ suggestions: string[] }> {
  const sp = new URLSearchParams({ field, prefix, limit: String(limit) });
  return fetchJSON(`${API_BASE}/autocomplete?${sp}`);
}

export async function getFamilyTree(tz: string): Promise<FamilyTree> {
  return fetchJSON(`${API_BASE}/family-tree/${encodeURIComponent(tz)}`);
}

export async function getStats(): Promise<Stats> {
  return fetchJSON(`${API_BASE}/stats`);
}

export async function getNeighbors(tz: string, radius = 10): Promise<NeighborResult> {
  return fetchJSON(`${API_BASE}/neighbors/${encodeURIComponent(tz)}?radius=${radius}`);
}

export async function getNeighborhood(tz: string): Promise<NeighborhoodResult> {
  return fetchJSON(`${API_BASE}/neighborhood/${encodeURIComponent(tz)}`);
}

export async function getCityPeople(tz: string, page = 1, perPage = 50, street = ""): Promise<PaginatedResult> {
  const sp = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (street) sp.set("street", street);
  return fetchJSON(`${API_BASE}/city-people/${encodeURIComponent(tz)}?${sp}`);
}

export async function getAgeGroup(tz: string, rangeYears = 2, page = 1, perPage = 50): Promise<PaginatedResult> {
  const sp = new URLSearchParams({ range_years: String(rangeYears), page: String(page), per_page: String(perPage) });
  return fetchJSON(`${API_BASE}/age-group/${encodeURIComponent(tz)}?${sp}`);
}
