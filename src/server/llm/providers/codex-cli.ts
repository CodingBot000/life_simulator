import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  LLMProvider,
  ProviderStructuredRequest,
  ProviderStructuredResponse,
} from "../types.ts";

class ProviderNotConfiguredError extends Error {
  code = "provider_not_configured";

  constructor(message: string) {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}

class ProviderInvalidJsonError extends Error {
  code = "provider_invalid_json";

  constructor(message: string) {
    super(message);
    this.name = "ProviderInvalidJsonError";
  }
}

class CodexCliPanicError extends Error {
  code = "codex_cli_panicked";

  constructor(message: string) {
    super(message);
    this.name = "CodexCliPanicError";
  }
}

let cachedFatalCodexFailure: string | null = null;

function approximateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

function resolveReasoningEffort(model: string): "low" | "medium" {
  if (model.includes("mini") || model.includes("spark")) {
    return "low";
  }

  return "medium";
}

function buildPrompt(request: ProviderStructuredRequest): string {
  return [
    "You are generating structured JSON for an internal simulation pipeline.",
    "Do not inspect the workspace, do not run tools, and do not execute shell commands.",
    "Return exactly one JSON object that matches the supplied output schema.",
    `Stage: ${request.metadata.stageName}`,
    "",
    "Stage instructions:",
    request.prompt,
    "",
    "Input JSON:",
    request.input,
  ].join("\n");
}

function buildProviderExecutionError(message: string): Error {
  const error = new Error(
    message || "Codex CLI failed to produce a structured response.",
  ) as Error & { code?: string };
  error.code = "provider_execution_failed";
  return error;
}

function isFatalCodexBootstrapFailure(message: string): boolean {
  return (
    message.includes("system-configuration-0.6.1") &&
    message.includes("Attempted to create a NULL object.")
  );
}

function buildCodexCliPanicError(): CodexCliPanicError {
  return new CodexCliPanicError(
    "Codex CLI panicked locally while initializing macOS system configuration (`Attempted to create a NULL object.`).",
  );
}

function classifyCodexFailure(output: string): Error {
  const message = output.trim();

  if (
    message.includes("Please run `codex login`") ||
    message.includes("Logged out") ||
    message.includes("not logged in")
  ) {
    return new ProviderNotConfiguredError(
      "Codex CLI is not logged in for subscription-backed execution.",
    );
  }

  if (isFatalCodexBootstrapFailure(message)) {
    return buildCodexCliPanicError();
  }

  return buildProviderExecutionError(message);
}

function runCodexCommand(params: {
  args: string[];
  prompt: string;
  signal: AbortSignal;
}): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", params.args, {
      cwd: process.cwd(),
      env: process.env,
      signal: params.signal,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new ProviderNotConfiguredError(
            "Codex CLI is not installed or not available on PATH.",
          ),
        );
        return;
      }

      reject(error);
    });
    child.on("close", (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode,
      });
    });

    child.stdin.write(params.prompt);
    child.stdin.end();
  });
}

export const codexCliProvider: LLMProvider = {
  name: "codex",
  async invokeStructured(
    request: ProviderStructuredRequest,
  ): Promise<ProviderStructuredResponse> {
    if (cachedFatalCodexFailure) {
      throw new CodexCliPanicError(cachedFatalCodexFailure);
    }

    const startedAt = Date.now();
    const tempDir = await mkdtemp(join(tmpdir(), "life-simulator-codex-"));
    const schemaPath = join(tempDir, "schema.json");
    const outputPath = join(tempDir, "last-message.txt");

    try {
      await writeFile(schemaPath, JSON.stringify(request.schema), "utf8");

      const args = [
        "exec",
        "-m",
        request.model,
        "-c",
        `model_reasoning_effort="${resolveReasoningEffort(request.model)}"`,
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--color",
        "never",
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        "-",
      ];

      const result = await runCodexCommand({
        args,
        prompt: buildPrompt(request),
        signal: request.signal,
      });

      if (result.exitCode !== 0) {
        const failureOutput = [result.stderr, result.stdout]
          .filter(Boolean)
          .join("\n");
        const error = classifyCodexFailure(failureOutput);

        if (isFatalCodexBootstrapFailure(failureOutput)) {
          cachedFatalCodexFailure = error.message;
        }

        throw error;
      }

      const rawText = (await readFile(outputPath, "utf8")).trim();

      if (!rawText) {
        const error = new Error(
          `Codex CLI returned an empty response for ${request.schemaName}.`,
        ) as Error & { code?: string };
        error.code = "empty_provider_response";
        throw error;
      }

      let parsedOutput: unknown;

      try {
        parsedOutput = JSON.parse(rawText);
      } catch (error) {
        throw new ProviderInvalidJsonError(
          `Codex CLI returned invalid JSON for ${request.schemaName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      return {
        provider: "codex",
        model: request.model,
        rawText,
        parsedOutput,
        usage: {
          inputTokens:
            approximateTokens(request.prompt) + approximateTokens(request.input),
          outputTokens: approximateTokens(rawText),
          totalTokens:
            approximateTokens(request.prompt) +
            approximateTokens(request.input) +
            approximateTokens(rawText),
        },
        latencyMs: Date.now() - startedAt,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  },
};
