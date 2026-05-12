package com.lifesimulator.backend.recommendation.youtube;

import java.util.List;

public interface YoutubeSearchClient {
  List<YoutubeSearchVideo> search(YoutubeSearchRequest request);
}
