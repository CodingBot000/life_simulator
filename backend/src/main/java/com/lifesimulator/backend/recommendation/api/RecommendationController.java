package com.lifesimulator.backend.recommendation.api;

import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationEngine;
import com.lifesimulator.backend.recommendation.life.LifeRecommendationContextMapper;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RecommendationController {

  private final SimulatorProperties properties;
  private final LifeRecommendationContextMapper contextMapper;
  private final RecommendationEngine recommendationEngine;

  public RecommendationController(
    SimulatorProperties properties,
    LifeRecommendationContextMapper contextMapper,
    RecommendationEngine recommendationEngine
  ) {
    this.properties = properties;
    this.contextMapper = contextMapper;
    this.recommendationEngine = recommendationEngine;
  }

  @PostMapping(value = "/api/recommendations", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<RecommendationResponse> recommendations(
    @RequestBody RecommendationRequest request
  ) {
    validate(request);
    if (!properties.getRecommendations().isEnabled()) {
      return ResponseEntity.ok(RecommendationResponse.disabled(request.requestId()));
    }

    RecommendationRequest resolvedRequest = withDefaultProviders(request);
    RecommendationContext context = contextMapper.map(
      resolvedRequest,
      properties.getRecommendations().getMaxItems()
    );
    return ResponseEntity.ok(RecommendationResponse.from(recommendationEngine.recommend(context)));
  }

  private RecommendationRequest withDefaultProviders(RecommendationRequest request) {
    if (!request.enabledProviders().isEmpty()) {
      return request;
    }
    List<String> providers = properties.getRecommendations().getDefaultProviders();
    return new RecommendationRequest(
      request.requestId(),
      request.locale(),
      request.caseInput(),
      request.simulationResponse(),
      request.maxItems() == null ? properties.getRecommendations().getDefaultMaxItems() : request.maxItems(),
      providers
    );
  }

  private void validate(RecommendationRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("request body is required");
    }
    if (request.requestId() == null || request.requestId().isBlank()) {
      throw new IllegalArgumentException("request_id is required");
    }
  }
}
