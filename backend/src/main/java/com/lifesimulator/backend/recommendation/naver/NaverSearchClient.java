package com.lifesimulator.backend.recommendation.naver;

import java.util.List;

public interface NaverSearchClient {
  List<NaverSearchDocument> search(NaverSearchRequest request);
}
