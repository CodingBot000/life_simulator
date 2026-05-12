package com.lifesimulator.backend.recommendation.youtube;

public interface YoutubeOembedClient {
  YoutubeOembedMetadata fetch(String youtubeUrl);
}
