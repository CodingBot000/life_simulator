package com.lifesimulator.backend.simulation;

import com.lifesimulator.backend.routing.BackendRoutingDecision;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class SimulationStageSkipReasonResolver {

  public Map<String, String> reasonsFor(
    BackendRoutingDecision routingDecision,
    List<String> skippedStageNames
  ) {
    Map<String, String> reasons = new LinkedHashMap<>();
    for (String stageName : skippedStageNames) {
      reasons.put(stageName, reasonFor(routingDecision, stageName));
    }
    return reasons;
  }

  private String reasonFor(BackendRoutingDecision routingDecision, String stageName) {
    return switch (stageName) {
      case "scenario_a", "scenario_b" -> scenarioReason(routingDecision);
      case "risk_a", "risk_b" -> riskReason(routingDecision);
      case "ab_reasoning" -> abReasoningReason(routingDecision);
      case "reflection" -> reflectionReason(routingDecision);
      default -> defaultReason(routingDecision);
    };
  }

  private String scenarioReason(BackendRoutingDecision routingDecision) {
    return "복잡도와 애매함이 모두 낮아 별도 시나리오 확장 없이 Planner와 Advisor 중심으로 처리했습니다.";
  }

  private String riskReason(BackendRoutingDecision routingDecision) {
    return String.format(
      "현재 %s 경로이며 위험도는 %s, 부족 정보는 %d개입니다. 상세 리스크 평가는 위험도가 높거나 부족 정보가 많은 경우에만 실행합니다.",
      routingDecision.executionMode(),
      routingDecision.riskBand(),
      routingDecision.stateUnknownCount()
    );
  }

  private String abReasoningReason(BackendRoutingDecision routingDecision) {
    return String.format(
      "현재 %s 경로입니다. A/B 심층 비교는 위험도, 복잡도, 애매함 중 하나가 high인 full 경로에서만 실행합니다.",
      routingDecision.executionMode()
    );
  }

  private String reflectionReason(BackendRoutingDecision routingDecision) {
    return String.format(
      "현재 %s 경로입니다. Reflection은 결과 재검토가 필요한 full 경로에서만 실행합니다.",
      routingDecision.executionMode()
    );
  }

  private String defaultReason(BackendRoutingDecision routingDecision) {
    return String.format(
      "현재 %s 경로의 실행 대상이 아니어서 생략했습니다.",
      routingDecision.executionMode()
    );
  }
}
