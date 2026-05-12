package com.lifesimulator.backend.recommendation.naver;

public class NaverSearchException extends RuntimeException {
  public NaverSearchException(String message) {
    super(message);
  }

  public NaverSearchException(String message, Throwable cause) {
    super(message, cause);
  }
}
