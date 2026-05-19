export type AirportCategory = "Domestic" | "International" | "Private";
export type AirportStatus = "Active" | "Under Construction" | "Proposed";

export interface Airport {
  id: string;
  iata_code: string;
  icao_code: string | null;
  airport_name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  operator: string | null;
  total_gates: number | null;
  total_terminals: number | null;
  total_runways: number | null;
  category: AirportCategory;
  status: AirportStatus;
  annual_passengers_million: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AirportService {
  id: string;
  airport_id: string;
  service_name: string;
  is_available: boolean;
}

export interface AirportAirline {
  id: string;
  airport_id: string;
  airline_code: string;
  airline_name: string | null;
  is_active: boolean;
}

export type SortKey = "alpha" | "passengers" | "state";
export type ViewMode = "grid" | "list";

export const ALL_CATEGORIES: AirportCategory[] = ["Domestic", "International", "Private"];
export const ALL_STATUSES: AirportStatus[] = ["Active", "Under Construction", "Proposed"];
