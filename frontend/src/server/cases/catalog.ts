import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  CasePreset,
  CasePresetCategory,
  SimulationRequest,
} from "@/lib/types";
import {
  isPriorityId,
  MAX_PRIORITY_SELECTIONS,
  normalizePriorityIds,
} from "@/lib/priorities";

const CASES_DIR = path.join(process.cwd(), "playground", "inputs", "cases");

const CATEGORY_LABELS: Record<CasePresetCategory, string> = {
  career: "커리어",
  relationship: "관계",
  finance: "재무",
  living: "거주",
  education: "교육",
  health: "건강",
  other: "기타",
};

function titleFromSlug(slug: string): string {
  const core = slug.replace(/^case-\d+-/, "");

  if (!core) {
    return slug;
  }

  return core
    .split("-")
    .map((part) => {
      if (part === "vs") {
        return "vs";
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function inferCategory(slug: string): CasePresetCategory {
  if (
    slug.includes("relationship") ||
    slug.includes("marriage") ||
    slug.includes("cohabitation")
  ) {
    return "relationship";
  }

  if (
    slug.includes("purchase") ||
    slug.includes("fund") ||
    slug.includes("debt") ||
    slug.includes("saving") ||
    slug.includes("money")
  ) {
    return "finance";
  }

  if (
    slug.includes("relocation") ||
    slug.includes("independence") ||
    slug.includes("move") ||
    slug.includes("commute")
  ) {
    return "living";
  }

  if (
    slug.includes("study") ||
    slug.includes("certification") ||
    slug.includes("portfolio")
  ) {
    return "education";
  }

  if (slug.includes("rest")) {
    return "health";
  }

  return "career";
}

function assertSimulationRequest(
  value: unknown,
  filePath: string,
): SimulationRequest {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid case preset: ${filePath}`);
  }

  const request = value as Record<string, unknown>;
  const userProfile = request.userProfile;
  const decision = request.decision;

  if (!userProfile || typeof userProfile !== "object") {
    throw new Error(`Missing userProfile in case preset: ${filePath}`);
  }

  if (!decision || typeof decision !== "object") {
    throw new Error(`Missing decision in case preset: ${filePath}`);
  }

  const profile = userProfile as Record<string, unknown>;
  const rawPriority = profile.priority;

  if (!Array.isArray(rawPriority)) {
    throw new Error(`Missing priority array in case preset: ${filePath}`);
  }

  const normalizedPriority = normalizePriorityIds(
    rawPriority
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim()),
  );

  if (
    normalizedPriority.length === 0 ||
    normalizedPriority.length > MAX_PRIORITY_SELECTIONS ||
    normalizedPriority.length !== rawPriority.length ||
    normalizedPriority.some((priority) => !isPriorityId(priority))
  ) {
    throw new Error(`Invalid priority ids in case preset: ${filePath}`);
  }

  return {
    userProfile: {
      ...(userProfile as SimulationRequest["userProfile"]),
      priority: normalizedPriority,
    },
    decision: decision as SimulationRequest["decision"],
    prior_memory: request.prior_memory as SimulationRequest["prior_memory"],
    state_hints: request.state_hints as SimulationRequest["state_hints"],
  };
}

export async function listCasePresets(): Promise<CasePreset[]> {
  const entries = await fs.readdir(CASES_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    files.map(async (fileName) => {
      const fullPath = path.join(CASES_DIR, fileName);
      const raw = await fs.readFile(fullPath, "utf8");
      const request = assertSimulationRequest(JSON.parse(raw), fullPath);
      const slug = fileName.replace(/\.json$/u, "");
      const category = inferCategory(slug);

      return {
        id: slug,
        slug,
        title: titleFromSlug(slug),
        category,
        categoryLabel: CATEGORY_LABELS[category],
        summary: request.decision.context,
        request,
      };
    }),
  );
}
