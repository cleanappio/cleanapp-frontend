export type PublicDiscoveryCard = {
  discovery_token: string;
  title: string;
  summary: string;
  classification: "physical" | "digital";
  severity_level: number;
  timestamp: string;
  brand_name?: string;
  brand_display_name?: string;
  latitude?: number;
  longitude?: number;
};

export type PublicDiscoveryBatch = {
  items: PublicDiscoveryCard[];
  count: number;
  total_count?: number;
  high_priority_count?: number;
  medium_priority_count?: number;
};

export type PublicPhysicalPoint = {
  kind: "point" | "cluster";
  classification: "physical";
  marker_token?: string;
  latitude: number;
  longitude: number;
  severity_level: number;
  count?: number;
};

export type PublicBrandSummary = {
  classification: "digital";
  discovery_token: string;
  brand_name: string;
  brand_display_name: string;
  total: number;
};

export type PublicDiscoveryResolveResponse = {
  kind: "report" | "brand";
  classification: "physical" | "digital";
  public_id?: string;
  brand_name?: string;
  canonical_path: string;
};
