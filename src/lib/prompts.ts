import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadPrompt(fileName: string): string {
  return readFileSync(join(process.cwd(), "prompts", fileName), "utf8").trim();
}

export const plannerPrompt = loadPrompt("planner.md");
export const scenarioPrompt = loadPrompt("scenario.md");
export const riskPrompt = loadPrompt("risk.md");
export const advisorPrompt = loadPrompt("advisor.md");

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
  },
  required: ["three_months", "one_year", "three_years"],
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
  },
  required: ["risk_level", "reasons"],
} as const;

export const advisorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommended_option: {
      type: "string",
      enum: ["A", "B"],
    },
    reason: {
      type: "string",
    },
  },
  required: ["recommended_option", "reason"],
} as const;
