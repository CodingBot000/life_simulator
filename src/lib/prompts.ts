import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadPrompt(fileName: string): string {
  return readFileSync(join(process.cwd(), "prompts", fileName), "utf8").trim();
}

export const stateLoaderPrompt = loadPrompt("state_loader.md");
export const plannerPrompt = loadPrompt("planner.md");
export const scenarioPrompt = loadPrompt("scenario.md");
export const riskPrompt = loadPrompt("risk.md");
export const abReasoningPrompt = loadPrompt("ab_reasoning.md");
export const guardrailPrompt = loadPrompt("guardrail.md");
export const advisorPrompt = loadPrompt("advisor.md");
export const reflectionPrompt = loadPrompt("reflection.md");

export const stateLoaderSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    case_id: {
      type: "string",
    },
    user_state: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile_state: {
          type: "object",
          additionalProperties: false,
          properties: {
            risk_preference: {
              type: "string",
            },
            decision_style: {
              type: "string",
            },
            top_priorities: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: ["risk_preference", "decision_style", "top_priorities"],
        },
        situational_state: {
          type: "object",
          additionalProperties: false,
          properties: {
            career_stage: {
              type: "string",
            },
            financial_pressure: {
              type: "string",
            },
            time_pressure: {
              type: "string",
            },
            emotional_state: {
              type: "string",
            },
          },
          required: [
            "career_stage",
            "financial_pressure",
            "time_pressure",
            "emotional_state",
          ],
        },
        memory_state: {
          type: "object",
          additionalProperties: false,
          properties: {
            recent_similar_decisions: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  topic: {
                    type: "string",
                  },
                  selected_option: {
                    type: "string",
                  },
                  outcome_note: {
                    type: "string",
                  },
                },
                required: ["topic", "selected_option", "outcome_note"],
              },
            },
            repeated_patterns: {
              type: "array",
              items: {
                type: "string",
              },
            },
            consistency_notes: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: [
            "recent_similar_decisions",
            "repeated_patterns",
            "consistency_notes",
          ],
        },
      },
      required: ["profile_state", "situational_state", "memory_state"],
    },
    state_summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        decision_bias: {
          type: "string",
        },
        current_constraint: {
          type: "string",
        },
        agent_guidance: {
          type: "string",
        },
      },
      required: ["decision_bias", "current_constraint", "agent_guidance"],
    },
  },
  required: ["case_id", "user_state", "state_summary"],
} as const;

export const plannerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    decision_type: {
      type: "string",
    },
    factors: {
      type: "array",
      items: {
        type: "string",
      },
      minItems: 1,
    },
  },
  required: ["decision_type", "factors"],
} as const;

export const scenarioSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    three_months: {
      type: "string",
    },
    one_year: {
      type: "string",
    },
    three_years: {
      type: "string",
    },
    structured_assessment: {
      type: "object",
      additionalProperties: false,
      properties: {
        stability_outlook: {
          type: "string",
          enum: ["improve", "stable", "mixed", "decline"],
        },
        growth_outlook: {
          type: "string",
          enum: ["improve", "stable", "mixed", "decline"],
        },
        stress_load: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
        missing_info: {
          type: "boolean",
        },
      },
      required: [
        "stability_outlook",
        "growth_outlook",
        "stress_load",
        "missing_info",
      ],
    },
  },
  required: [
    "three_months",
    "one_year",
    "three_years",
    "structured_assessment",
  ],
} as const;

export const riskSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    risk_level: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    reasons: {
      type: "array",
      items: {
        type: "string",
      },
      minItems: 1,
    },
    structured_assessment: {
      type: "object",
      additionalProperties: false,
      properties: {
        risk_factors: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "financial_pressure",
              "time_pressure",
              "stability_loss",
              "growth_tradeoff",
              "emotional_burden",
              "relationship_strain",
              "health_burnout",
              "execution_uncertainty",
            ],
          },
        },
        missing_info: {
          type: "boolean",
        },
        risk_score: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },
      },
      required: ["risk_factors", "missing_info", "risk_score"],
    },
  },
  required: ["risk_level", "reasons", "structured_assessment"],
} as const;

export const abReasoningSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    case_id: {
      type: "string",
    },
    input_summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        user_profile: {
          type: "object",
          additionalProperties: false,
          properties: {
            age: {
              type: "number",
            },
            job: {
              type: "string",
            },
            risk_tolerance: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
            priority: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
          },
          required: ["age", "job", "risk_tolerance", "priority"],
        },
        decision_options: {
          type: "object",
          additionalProperties: false,
          properties: {
            optionA: {
              type: "string",
            },
            optionB: {
              type: "string",
            },
            context: {
              type: "string",
            },
          },
          required: ["optionA", "optionB", "context"],
        },
        planner_goal: {
          type: "string",
        },
      },
      required: ["user_profile", "decision_options", "planner_goal"],
    },
    reasoning: {
      type: "object",
      additionalProperties: false,
      properties: {
        a_reasoning: {
          type: "object",
          additionalProperties: false,
          properties: {
            stance: {
              type: "string",
            },
            summary: {
              type: "string",
            },
            key_assumptions: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
            pros: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
            cons: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
            recommended_option: {
              type: "string",
              enum: ["A", "B"],
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
          },
          required: [
            "stance",
            "summary",
            "key_assumptions",
            "pros",
            "cons",
            "recommended_option",
            "confidence",
          ],
        },
        b_reasoning: {
          type: "object",
          additionalProperties: false,
          properties: {
            stance: {
              type: "string",
            },
            summary: {
              type: "string",
            },
            key_assumptions: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
            pros: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
            cons: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
            recommended_option: {
              type: "string",
              enum: ["A", "B"],
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
          },
          required: [
            "stance",
            "summary",
            "key_assumptions",
            "pros",
            "cons",
            "recommended_option",
            "confidence",
          ],
        },
        comparison: {
          type: "object",
          additionalProperties: false,
          properties: {
            agreements: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
            conflicts: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
            which_fits_user_better: {
              type: "string",
              enum: ["A", "B"],
            },
            reason: {
              type: "string",
            },
          },
          required: [
            "agreements",
            "conflicts",
            "which_fits_user_better",
            "reason",
          ],
        },
        final_selection: {
          type: "object",
          additionalProperties: false,
          properties: {
            selected_reasoning: {
              type: "string",
              enum: ["A", "B"],
            },
            selected_option: {
              type: "string",
              enum: ["A", "B"],
            },
            why_selected: {
              type: "string",
            },
            decision_confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
          },
          required: [
            "selected_reasoning",
            "selected_option",
            "why_selected",
            "decision_confidence",
          ],
        },
      },
      required: ["a_reasoning", "b_reasoning", "comparison", "final_selection"],
    },
    structured_signals: {
      type: "object",
      additionalProperties: false,
      properties: {
        conflict: {
          type: "boolean",
        },
        missing_info: {
          type: "boolean",
        },
        low_confidence: {
          type: "boolean",
        },
      },
      required: ["conflict", "missing_info", "low_confidence"],
    },
  },
  required: ["case_id", "input_summary", "reasoning", "structured_signals"],
} as const;

export const guardrailSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    guardrail_triggered: {
      type: "boolean",
    },
    triggers: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "ambiguity_high",
          "reasoning_conflict",
          "low_confidence",
          "high_risk",
        ],
      },
      uniqueItems: true,
    },
    strategy: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "ask_more_info",
          "neutralize_decision",
          "soft_recommendation",
          "risk_warning",
        ],
      },
      uniqueItems: true,
    },
    risk_score: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    confidence_score: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    uncertainty_score: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    reasoning_signals: {
      type: "object",
      additionalProperties: false,
      properties: {
        conflicting_signals: {
          type: "boolean",
        },
        missing_context: {
          type: "boolean",
        },
        weak_evidence: {
          type: "boolean",
        },
        ambiguous_wording: {
          type: "boolean",
        },
        strong_consensus: {
          type: "boolean",
        },
        repeated_evidence: {
          type: "boolean",
        },
      },
      required: [
        "conflicting_signals",
        "missing_context",
        "weak_evidence",
        "ambiguous_wording",
        "strong_consensus",
        "repeated_evidence",
      ],
    },
    final_mode: {
      type: "string",
      enum: ["normal", "cautious", "blocked"],
    },
  },
  required: [
    "guardrail_triggered",
    "triggers",
    "strategy",
    "risk_score",
    "confidence_score",
    "uncertainty_score",
    "reasoning_signals",
    "final_mode",
  ],
} as const;

export const advisorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    decision: {
      type: "string",
      enum: ["A", "B", "undecided"],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    reason: {
      type: "string",
    },
    guardrail_applied: {
      type: "boolean",
    },
    recommended_option: {
      type: "string",
      enum: ["A", "B", "undecided"],
    },
    reasoning_basis: {
      type: "object",
      additionalProperties: false,
      properties: {
        selected_reasoning: {
          type: "string",
          enum: ["A", "B", "undecided"],
        },
        core_why: {
          type: "string",
        },
        decision_confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },
      },
      required: ["selected_reasoning", "core_why", "decision_confidence"],
    },
  },
  required: [
    "decision",
    "confidence",
    "reason",
    "guardrail_applied",
    "recommended_option",
    "reasoning_basis",
  ],
} as const;

export const reflectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    evaluation: {
      type: "string",
    },
    scores: {
      type: "object",
      additionalProperties: false,
      properties: {
        realism: {
          type: "integer",
          minimum: 1,
          maximum: 5,
        },
        consistency: {
          type: "integer",
          minimum: 1,
          maximum: 5,
        },
        profile_alignment: {
          type: "integer",
          minimum: 1,
          maximum: 5,
        },
        recommendation_clarity: {
          type: "integer",
          minimum: 1,
          maximum: 5,
        },
      },
      required: [
        "realism",
        "consistency",
        "profile_alignment",
        "recommendation_clarity",
      ],
    },
    issues: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: ["scenario", "risk", "reasoning", "advisor", "profile"],
          },
          description: {
            type: "string",
          },
        },
        required: ["type", "description"],
      },
    },
    improvement_suggestions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          target: {
            type: "string",
            enum: ["planner", "scenario", "risk", "reasoning", "advisor"],
          },
          suggestion: {
            type: "string",
          },
        },
        required: ["target", "suggestion"],
      },
    },
    overall_comment: {
      type: "string",
    },
    guardrail_review: {
      type: "object",
      additionalProperties: false,
      properties: {
        was_needed: {
          type: "boolean",
        },
        was_triggered: {
          type: "boolean",
        },
        correctness: {
          type: "string",
          enum: ["good", "over", "missing"],
        },
      },
      required: ["was_needed", "was_triggered", "correctness"],
    },
  },
  required: [
    "evaluation",
    "scores",
    "issues",
    "improvement_suggestions",
    "overall_comment",
    "guardrail_review",
  ],
} as const;
