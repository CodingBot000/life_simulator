import type { PriorityLocale } from "@/lib/priorities";
import type { SimulationRequest, SimulationResponse } from "@/lib/types";

export type RecommendationItemType =
  | "book"
  | "youtube_channel"
  | "youtube_video"
  | "course"
  | "template"
  | "product"
  | "service";

export interface RecommendationRequest {
  request_id: string;
  locale: PriorityLocale;
  case_input: SimulationRequest;
  simulation_response: SimulationResponse;
  max_items?: number;
  enabled_providers?: string[];
}

export interface RecommendationIntent {
  topic: string;
  audience_context: string;
  product_types: RecommendationItemType[];
  queries: {
    provider: string;
    query: string;
    reason: string;
  }[];
  negative_filters: string[];
  safety_level: "normal" | "sensitive" | "restricted" | string;
}

export interface RecommendationDisclosure {
  label: string;
  text: string;
  affiliate_included: boolean;
}

export interface RecommendationItem {
  id: string;
  provider: string;
  type: RecommendationItemType | string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  price_label: string | null;
  mall_name: string | null;
  creator_name: string | null;
  is_affiliate: boolean;
  sponsored: boolean;
  why: string;
  rank_score: number;
}

export interface RecommendationProviderStatus {
  provider: string;
  status: "ok" | "disabled" | "error" | string;
  item_count: number;
  message: string | null;
}

export interface RecommendationResponse {
  request_id: string;
  generated_at: string;
  intent: RecommendationIntent;
  disclosure: RecommendationDisclosure;
  items: RecommendationItem[];
  provider_status: RecommendationProviderStatus[];
}
