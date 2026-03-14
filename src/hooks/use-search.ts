import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { searchPeople, getPerson, getFamilyTree, getAutocomplete, getStats, getNeighbors, getNeighborhood, getCityPeople, getAgeGroup } from "@/lib/api";

export function useSearch(params: {
  family?: string;
  first?: string;
  city?: string;
  phone?: string;
  tz?: string;
  page?: number;
  per_page?: number;
}) {
  const hasQuery = !!(params.family || params.first || params.city || params.phone || params.tz);

  return useQuery({
    queryKey: ["search", params],
    queryFn: () => searchPeople(params),
    enabled: hasQuery,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function usePerson(tz: string | undefined) {
  return useQuery({
    queryKey: ["person", tz],
    queryFn: () => getPerson(tz!),
    enabled: !!tz,
    staleTime: 10 * 60 * 1000,
  });
}

export function useFamilyTree(tz: string | undefined) {
  return useQuery({
    queryKey: ["family-tree", tz],
    queryFn: () => getFamilyTree(tz!),
    enabled: !!tz,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAutocomplete(field: string, prefix: string) {
  return useQuery({
    queryKey: ["autocomplete", field, prefix],
    queryFn: () => getAutocomplete(field, prefix),
    enabled: prefix.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    staleTime: 30 * 60 * 1000,
  });
}

export function useNeighbors(tz: string | undefined, radius = 10) {
  return useQuery({
    queryKey: ["neighbors", tz, radius],
    queryFn: () => getNeighbors(tz!, radius),
    enabled: !!tz,
    staleTime: 10 * 60 * 1000,
  });
}

export function useNeighborhood(tz: string | undefined) {
  return useQuery({
    queryKey: ["neighborhood", tz],
    queryFn: () => getNeighborhood(tz!),
    enabled: !!tz,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCityPeople(tz: string | undefined, page = 1, perPage = 50, street = "") {
  return useQuery({
    queryKey: ["city-people", tz, page, perPage, street],
    queryFn: () => getCityPeople(tz!, page, perPage, street),
    enabled: !!tz,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAgeGroup(tz: string | undefined, rangeYears = 2, page = 1, perPage = 50) {
  return useQuery({
    queryKey: ["age-group", tz, rangeYears, page, perPage],
    queryFn: () => getAgeGroup(tz!, rangeYears, page, perPage),
    enabled: !!tz,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });
}
