package com.lifesimulator.backend.recommendation.youtube;

import java.util.List;

public interface YoutubeVideoSeedRepository {
  List<YoutubeVideoSeed> findByTopic(String locale, String topic, int limit);
}
