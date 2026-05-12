package com.lifesimulator.backend.recommendation.youtube;

public class YoutubeOembedException extends RuntimeException {
  public YoutubeOembedException(String message) {
    super(message);
  }

  public YoutubeOembedException(String message, Throwable cause) {
    super(message, cause);
  }
}
