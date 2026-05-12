package com.lifesimulator.backend.recommendation.youtube;

public class YoutubeSearchException extends RuntimeException {

  public YoutubeSearchException(String message) {
    super(message);
  }

  public YoutubeSearchException(String message, Throwable cause) {
    super(message, cause);
  }
}
