import OpenAI from "openai";

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

const clients = new Map<string, OpenAI>();

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new ProviderNotConfiguredError(
      "OPENAI_API_KEY is not configured for the OpenAI provider.",
    );
  }

  const existing = clients.get(apiKey);

  if (existing) {
    return existing;
  }

  const client = new OpenAI({ apiKey });
  clients.set(apiKey, client);
  return client;
}

export const openAiProvider: LLMProvider = {
  name: "openai",
  async invokeStructured(
    request: ProviderStructuredRequest,
  ): Promise<ProviderStructuredResponse> {
    const client = getClient();
    const startedAt = Date.now();
    const response = await client.responses.create(
      {
        model: request.model,
        temperature: request.temperature,
        metadata: {
          request_id: request.metadata.requestId,
          trace_id: request.metadata.traceId,
          route_name: request.metadata.routeName,
          stage_name: request.metadata.stageName,
        },
        input: [
          {
            role: "system",
            content: request.prompt,
          },
          {
            role: "user",
            content: request.input,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: request.schemaName,
            schema: request.schema,
            strict: true,
          },
        },
      },
      {
        signal: request.signal,
      },
    );

    const rawText = response.output_text?.trim();

    if (!rawText) {
      const error = new Error(
        `OpenAI returned an empty response for ${request.schemaName}.`,
      ) as Error & { code?: string };
      error.code = "empty_provider_response";
      throw error;
    }

    return {
      provider: "openai",
      model: response.model ?? request.model,
      rawText,
      parsedOutput: JSON.parse(rawText),
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      latencyMs: Date.now() - startedAt,
    };
  },
};
