package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public record RecommendationContext(
  String requestId,
  String locale,
  UserContext user,
  DecisionContext decision,
  ResultContext result,
  List<String> allowedProviderNames,
  int maxItems
) {
  public RecommendationContext {
    requestId = normalize(requestId);
    locale = normalize(locale).isBlank() ? "ko" : normalize(locale);
    user = user == null ? new UserContext("", List.of(), "") : user;
    decision = decision == null ? new DecisionContext("", List.of(), "") : decision;
    result = result == null ? new ResultContext("", List.of(), List.of(), "") : result;
    allowedProviderNames = allowedProviderNames == null ? List.of() : List.copyOf(allowedProviderNames);
    maxItems = Math.max(1, maxItems);
  }

  public boolean allowsProvider(String providerName) {
    if (allowedProviderNames.isEmpty()) {
      return true;
    }
    return allowedProviderNames
      .stream()
      .anyMatch(provider -> provider.equalsIgnoreCase(providerName));
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
