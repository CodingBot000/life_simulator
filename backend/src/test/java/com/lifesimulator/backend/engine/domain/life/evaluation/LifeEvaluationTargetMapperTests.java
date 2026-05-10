package com.lifesimulator.backend.engine.domain.life.evaluation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.engine.evaluation.DecisionEvaluationTarget;
import org.junit.jupiter.api.Test;

class LifeEvaluationTargetMapperTests {

  private final LifeEvaluationTargetMapper mapper = new LifeEvaluationTargetMapper();

  @Test
  void mapsLifeReasoningTargetsToEngineTargets() {
    assertThat(mapper.targetFor("reasoning_a")).isEqualTo(DecisionEvaluationTarget.REASONING_A);
    assertThat(mapper.targetFor("a_reasoning")).isEqualTo(DecisionEvaluationTarget.REASONING_A);
    assertThat(mapper.targetFor("reasoning_b")).isEqualTo(DecisionEvaluationTarget.REASONING_B);
    assertThat(mapper.targetFor("advisor")).isEqualTo(DecisionEvaluationTarget.ADVISOR);
    assertThat(mapper.targetFor("guardrail")).isEqualTo(DecisionEvaluationTarget.GUARDRAIL);
  }

  @Test
  void normalizesLifeOptionLabels() {
    assertThat(mapper.optionIdFor("option_a")).isEqualTo("A");
    assertThat(mapper.optionIdFor("b")).isEqualTo("B");
    assertThat(mapper.optionIdFor("undecided")).isEqualTo("undecided");
  }
}
