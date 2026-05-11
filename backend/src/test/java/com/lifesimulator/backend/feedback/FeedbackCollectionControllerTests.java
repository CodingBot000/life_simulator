package com.lifesimulator.backend.feedback;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifesimulator.backend.correction.StateCorrectionController;
import com.lifesimulator.backend.correction.StateCorrectionRequest;
import com.lifesimulator.backend.correction.StateCorrectionResponse;
import com.lifesimulator.backend.correction.StateCorrectionService;
import com.lifesimulator.backend.learning.DatasetCandidateBuildRequest;
import com.lifesimulator.backend.learning.DatasetCandidateController;
import com.lifesimulator.backend.learning.DatasetCandidateService;
import com.lifesimulator.backend.outcome.OutcomeFollowupController;
import com.lifesimulator.backend.outcome.OutcomeFollowupRequest;
import com.lifesimulator.backend.outcome.OutcomeFollowupResponse;
import com.lifesimulator.backend.outcome.OutcomeFollowupService;
import com.lifesimulator.backend.review.GuardrailReviewController;
import com.lifesimulator.backend.review.GuardrailReviewRequest;
import com.lifesimulator.backend.review.GuardrailReviewResponse;
import com.lifesimulator.backend.review.GuardrailReviewService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class FeedbackCollectionControllerTests {

  @Test
  void feedbackControllerPassesSessionHeaderToService() {
    FeedbackService feedbackService = mock(FeedbackService.class);
    FeedbackSummaryService summaryService = mock(FeedbackSummaryService.class);
    FeedbackController controller = new FeedbackController(feedbackService, summaryService);
    FeedbackRequest request = new FeedbackRequest("request-1", "advisor", "A", "agree", 5, List.of(), null, null);
    HttpHeaders headers = headers();
    when(feedbackService.create(request, "session-1")).thenReturn(new FeedbackResponse("fb-1", "request-1", "advisor", "agree", 5, "created", "updated"));

    FeedbackResponse response = controller.create(request, headers);

    assertThat(response.feedbackId()).isEqualTo("fb-1");
    verify(feedbackService).create(request, "session-1");
  }

  @Test
  void outcomeControllerPassesSessionHeaderToService() {
    OutcomeFollowupService service = mock(OutcomeFollowupService.class);
    OutcomeFollowupController controller = new OutcomeFollowupController(service);
    OutcomeFollowupRequest request = new OutcomeFollowupRequest("request-1", "A", 4, 2, null, List.of(), 0, null);
    when(service.create(request, "session-1")).thenReturn(new OutcomeFollowupResponse("out-1", "request-1", "A", 4, 2, "created", "updated"));

    OutcomeFollowupResponse response = controller.create(request, headers());

    assertThat(response.followupId()).isEqualTo("out-1");
    verify(service).create(request, "session-1");
  }

  @Test
  void correctionControllerPassesSessionHeaderToService() {
    StateCorrectionService service = mock(StateCorrectionService.class);
    StateCorrectionController controller = new StateCorrectionController(service);
    StateCorrectionRequest request = new StateCorrectionRequest("request-1", "stateContext.state_summary.agent_guidance", null, null, "user_correction", null);
    when(service.create(request, "session-1")).thenReturn(new StateCorrectionResponse("corr-1", "request-1", "stateContext.state_summary.agent_guidance", "user_correction", "created"));

    StateCorrectionResponse response = controller.create(request, headers());

    assertThat(response.correctionId()).isEqualTo("corr-1");
    verify(service).create(request, "session-1");
  }

  @Test
  void guardrailReviewControllerPassesSessionHeaderToService() {
    GuardrailReviewService service = mock(GuardrailReviewService.class);
    GuardrailReviewController controller = new GuardrailReviewController(service);
    GuardrailReviewRequest request = new GuardrailReviewRequest("request-1", "user", "good", null, List.of(), null);
    when(service.create(request, "session-1")).thenReturn(new GuardrailReviewResponse("grv-1", "request-1", "good", null, "created"));

    GuardrailReviewResponse response = controller.create(request, headers());

    assertThat(response.reviewId()).isEqualTo("grv-1");
    verify(service).create(request, "session-1");
  }

  @Test
  void learningControllerDelegatesBuildAndList() {
    DatasetCandidateService service = mock(DatasetCandidateService.class);
    DatasetCandidateController controller = new DatasetCandidateController(service);
    DatasetCandidateBuildRequest request = new DatasetCandidateBuildRequest("request-1");
    when(service.build(request)).thenReturn(Map.of("requestId", "request-1", "persisted", 1));
    when(service.list("candidate", 10)).thenReturn(Map.of("status", "candidate", "items", List.of()));

    assertThat(controller.build(request)).containsEntry("persisted", 1);
    assertThat(controller.list("candidate", 10)).containsEntry("status", "candidate");
    verify(service).build(request);
    verify(service).list("candidate", 10);
  }

  private HttpHeaders headers() {
    HttpHeaders headers = new HttpHeaders();
    headers.set("x-session-id", " session-1 ");
    return headers;
  }
}
