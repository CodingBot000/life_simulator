package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public record DecisionContext(
  String topicText,
  List<String> optionLabels,
  String selectedOption
) {
  public DecisionContext {
    topicText = normalize(topicText);
    optionLabels = optionLabels == null ? List.of() : List.copyOf(optionLabels);
    selectedOption = normalize(selectedOption);
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
