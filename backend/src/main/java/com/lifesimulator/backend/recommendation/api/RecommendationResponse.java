package com.lifesimulator.backend.recommendation.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lifesimulator.backend.recommendation.core.ProviderStatus;
import com.lifesimulator.backend.recommendation.core.RecommendationDisclosure;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationItem;
import com.lifesimulator.backend.recommendation.core.RecommendationQuery;
import com.lifesimulator.backend.recommendation.core.RecommendationResult;
import java.util.List;

public record RecommendationResponse(
  @JsonProperty("request_id") String requestId,
  @JsonProperty("generated_at") String generatedAt,
  RecommendationIntentResponse intent,
  RecommendationDisclosureResponse disclosure,
  List<RecommendationItemResponse> items,
  @JsonProperty("provider_status") List<ProviderStatusResponse> providerStatus
) {
  public static RecommendationResponse from(RecommendationResult result) {
    return new RecommendationResponse(
      result.requestId(),
      result.generatedAt().toString(),
      RecommendationIntentResponse.from(result.intent()),
      RecommendationDisclosureResponse.from(result.disclosure()),
      result.items().stream().map(RecommendationItemResponse::from).toList(),
      result.providerStatus().stream().map(ProviderStatusResponse::from).toList()
    );
  }

  public static RecommendationResponse disabled(String requestId) {
    return new RecommendationResponse(
      requestId,
      java.time.OffsetDateTime.now().toString(),
      RecommendationIntentResponse.empty(),
      new RecommendationDisclosureResponse("추천", "추천 기능이 비활성화되어 있습니다.", false),
      List.of(),
      List.of(new ProviderStatusResponse("catalog", "disabled", 0, "recommendations disabled"))
    );
  }

  public record RecommendationIntentResponse(
    String topic,
    @JsonProperty("audience_context") String audienceContext,
    @JsonProperty("product_types") List<String> productTypes,
    List<RecommendationQueryResponse> queries,
    @JsonProperty("negative_filters") List<String> negativeFilters,
    @JsonProperty("safety_level") String safetyLevel
  ) {
    static RecommendationIntentResponse from(RecommendationIntent intent) {
      return new RecommendationIntentResponse(
        intent.topic(),
        intent.audienceContext(),
        intent.productTypes(),
        intent.queries().stream().map(RecommendationQueryResponse::from).toList(),
        intent.negativeFilters(),
        intent.safetyLevel()
      );
    }

    static RecommendationIntentResponse empty() {
      return new RecommendationIntentResponse(
        "disabled",
        "",
        List.of(),
        List.of(),
        List.of(),
        "normal"
      );
    }
  }

  public record RecommendationQueryResponse(
    String provider,
    String query,
    String reason
  ) {
    static RecommendationQueryResponse from(RecommendationQuery query) {
      return new RecommendationQueryResponse(query.provider(), query.query(), query.reason());
    }
  }

  public record RecommendationDisclosureResponse(
    String label,
    String text,
    @JsonProperty("affiliate_included") boolean affiliateIncluded
  ) {
    static RecommendationDisclosureResponse from(RecommendationDisclosure disclosure) {
      return new RecommendationDisclosureResponse(
        disclosure.label(),
        disclosure.text(),
        disclosure.affiliateIncluded()
      );
    }
  }

  public record RecommendationItemResponse(
    String id,
    String provider,
    String type,
    String title,
    String description,
    String url,
    @JsonProperty("image_url") String imageUrl,
    @JsonProperty("price_label") String priceLabel,
    @JsonProperty("mall_name") String mallName,
    @JsonProperty("creator_name") String creatorName,
    @JsonProperty("is_affiliate") boolean affiliate,
    boolean sponsored,
    String why,
    @JsonProperty("rank_score") double rankScore
  ) {
    static RecommendationItemResponse from(RecommendationItem item) {
      return new RecommendationItemResponse(
        item.id(),
        item.provider(),
        item.type(),
        item.title(),
        item.description(),
        item.url(),
        item.imageUrl(),
        item.priceLabel(),
        item.mallName(),
        item.creatorName(),
        item.affiliate(),
        item.sponsored(),
        item.why(),
        item.rankScore()
      );
    }
  }

  public record ProviderStatusResponse(
    String provider,
    String status,
    @JsonProperty("item_count") int itemCount,
    String message
  ) {
    static ProviderStatusResponse from(ProviderStatus status) {
      return new ProviderStatusResponse(
        status.provider(),
        status.status(),
        status.itemCount(),
        status.message()
      );
    }
  }
}
