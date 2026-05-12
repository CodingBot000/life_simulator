package com.lifesimulator.backend.recommendation.intent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.llm.LlmJsonClient;
import com.lifesimulator.backend.engine.llm.LlmJsonRequest;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.core.RecommendationQuery;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class LlmRecommendationIntentExtractor implements RecommendationIntentExtractor {

  private static final List<String> ALLOWED_TOPICS = List.of(
    "career_change",
    "financial_planning",
    "relationship",
    "learning",
    "wellbeing",
    "general_decision_support"
  );

  private final LlmJsonClient llmJsonClient;
  private final ObjectMapper objectMapper;
  private final RecommendationIntentSchemaFactory schemaFactory;

  public LlmRecommendationIntentExtractor(
    LlmJsonClient llmJsonClient,
    ObjectMapper objectMapper,
    RecommendationIntentSchemaFactory schemaFactory
  ) {
    this.llmJsonClient = llmJsonClient;
    this.objectMapper = objectMapper;
    this.schemaFactory = schemaFactory;
  }

  @Override
  public RecommendationIntent extract(RecommendationContext context) {
    if (!llmJsonClient.enabled()) {
      throw new IllegalStateException("LLM intent extractor is disabled because LLM client is disabled.");
    }
    JsonNode output = llmJsonClient
      .completeJson(new LlmJsonRequest(
        "recommendation_intent",
        prompt(context),
        schemaFactory.outputSchema(),
        fallback()
      ))
      .output();
    return intent(output);
  }

  private RecommendationIntent intent(JsonNode node) {
    String topic = allowedTopic(text(node, "topic"));
    return new RecommendationIntent(
      topic,
      text(node, "audience_context"),
      stringList(node.path("product_types")),
      queries(node.path("queries")),
      stringList(node.path("negative_filters")),
      text(node, "safety_level", "normal")
    );
  }

  private List<RecommendationQuery> queries(JsonNode node) {
    if (!node.isArray()) {
      return List.of();
    }
    List<RecommendationQuery> queries = new ArrayList<>();
    for (JsonNode item : node) {
      String query = text(item, "query");
      if (!query.isBlank()) {
        queries.add(new RecommendationQuery(
          text(item, "provider", "catalog"),
          query,
          text(item, "reason", "llm intent match")
        ));
      }
    }
    return queries;
  }

  private List<String> stringList(JsonNode node) {
    if (!node.isArray()) {
      return List.of();
    }
    List<String> values = new ArrayList<>();
    for (JsonNode item : node) {
      String value = item.asText("").trim();
      if (!value.isBlank()) {
        values.add(value);
      }
    }
    return values;
  }

  private JsonNode fallback() {
    ObjectNode node = objectMapper.createObjectNode();
    node.put("topic", "general_decision_support");
    node.put("audience_context", "");
    node.putArray("product_types").add("book").add("template");
    node.putArray("queries").addObject().put("provider", "catalog").put("query", "의사결정").put("reason", "fallback");
    node.putArray("negative_filters");
    node.put("safety_level", "normal");
    return node;
  }

  private String prompt(RecommendationContext context) {
    return """
      Extract a recommendation intent for an in-app recommendation catalog.
      Return only JSON that satisfies the schema.
      Do not recommend medical, legal, or speculative financial products.
      Prefer educational product types: book, template, course, youtube_channel, youtube_video.

      Allowed topics:
      - career_change
      - financial_planning
      - relationship
      - learning
      - wellbeing
      - general_decision_support

      Locale: %s
      User job: %s
      User priorities: %s
      Risk tolerance: %s
      Decision context: %s
      Option labels: %s
      Selected option: %s
      Advisor reason: %s
      Planner factors: %s
      Suggested actions: %s
      """
      .formatted(
        context.locale(),
        context.user().job(),
        context.user().priorities(),
        context.user().riskTolerance(),
        context.decision().topicText(),
        context.decision().optionLabels(),
        context.decision().selectedOption(),
        context.result().advisorReason(),
        context.result().plannerFactors(),
        context.result().suggestedActions()
      );
  }

  private String allowedTopic(String value) {
    String topic = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    return ALLOWED_TOPICS.contains(topic) ? topic : "general_decision_support";
  }

  private String text(JsonNode node, String field) {
    return text(node, field, "");
  }

  private String text(JsonNode node, String field, String fallback) {
    String value = node.path(field).asText(fallback);
    return value == null ? fallback : value.trim();
  }
}
