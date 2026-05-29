package com.lifesimulator.backend.memory;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

@Component
public class SessionIdResolver {

  private static final int MAX_SESSION_ID_LENGTH = 128;

  public String resolve(HttpHeaders headers) {
    String value = headers.getFirst("x-session-id");
    if (value == null) {
      return "";
    }
    String trimmed = value.trim();
    if (trimmed.length() <= MAX_SESSION_ID_LENGTH) {
      return trimmed;
    }
    return trimmed.substring(0, MAX_SESSION_ID_LENGTH);
  }
}
