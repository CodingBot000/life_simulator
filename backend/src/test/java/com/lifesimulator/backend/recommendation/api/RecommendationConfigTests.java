package com.lifesimulator.backend.recommendation.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import com.lifesimulator.backend.recommendation.naver.NaverSearchClient;
import com.lifesimulator.backend.recommendation.naver.NaverSearchDocument;
import com.lifesimulator.backend.recommendation.naver.NaverSearchProvider;
import com.lifesimulator.backend.recommendation.naver.NaverSearchRequest;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class RecommendationConfigTests {

  @TempDir
  private Path tempDir;

  @Test
  void naverCredentialsCanBeLoadedFromLocalDotenv() throws Exception {
    Path dotenv = tempDir.resolve(".env");
    Files.writeString(
      dotenv,
      """
      NAVER_CLIENT_ID=dotenv-client-id
      NAVER_CLIENT_SECRET=dotenv-client-secret
      """
    );
    SimulatorProperties properties = new SimulatorProperties();
    RecommendationConfig config = new RecommendationConfig(List.of(dotenv));
    FakeNaverSearchClient client = new FakeNaverSearchClient();
    NaverSearchProvider provider = config.naverSearchProvider(client, properties);

    var result = provider.search(context(), intent());

    assertThat(result.status().status()).isEqualTo("ok");
    assertThat(client.requests).isNotEmpty();
  }

  private RecommendationIntent intent() {
    return new RecommendationIntent(
      "career_change",
      "developer",
      List.of("book"),
      List.of(),
      List.of(),
      "normal"
    );
  }

  private RecommendationContext context() {
    return new RecommendationContext(
      "request-1",
      "ko",
      new UserContext("developer", List.of(), ""),
      new DecisionContext("이직 고민", List.of("잔류", "이직"), "B"),
      new ResultContext("커리어 전환 검토", List.of(), List.of(), ""),
      List.of("naver"),
      4
    );
  }

  private static class FakeNaverSearchClient implements NaverSearchClient {
    private final List<NaverSearchRequest> requests = new java.util.ArrayList<>();

    @Override
    public List<NaverSearchDocument> search(NaverSearchRequest request) {
      requests.add(request);
      return List.of();
    }
  }
}
