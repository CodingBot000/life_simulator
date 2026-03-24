import "server-only";

import OpenAI from "openai";

type JsonSchema = {
  type: string;
  [key: string]: unknown;
};

type StructuredOutputParams = {
  schemaName: string;
  schema: JsonSchema;
  prompt: string;
  input: string;
};

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5";
const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export async function generateStructuredOutput<T>({
  schemaName,
  schema,
  prompt,
  input,
}: StructuredOutputParams): Promise<T> {
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local before running the simulation.",
    );
  }

  if (!client) {
    throw new Error("OpenAI client could not be initialized.");
  }

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    temperature: 0.3,
    input: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: input,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        schema,
        strict: true,
      },
    },
  });

  const rawText = response.output_text?.trim();

  if (!rawText) {
    throw new Error(`OpenAI returned an empty response for ${schemaName}.`);
  }

  try {
    return JSON.parse(rawText) as T;
  } catch (error) {
    console.error(`[openai] failed to parse ${schemaName}`, error, rawText);
    throw new Error(`Failed to parse JSON response for ${schemaName}.`);
  }
}

export { OPENAI_MODEL };
