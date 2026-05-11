package com.lifesimulator.backend.recommendation.core;

public record ProviderStatus(
  String provider,
  String status,
  int itemCount,
  String message
) {
  public static ProviderStatus ok(String provider, int itemCount) {
    return new ProviderStatus(provider, "ok", itemCount, null);
  }

  public static ProviderStatus disabled(String provider, String message) {
    return new ProviderStatus(provider, "disabled", 0, message);
  }

  public static ProviderStatus error(String provider, String message) {
    return new ProviderStatus(provider, "error", 0, message);
  }
}
