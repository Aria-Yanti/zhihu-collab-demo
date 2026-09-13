const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 30_000;

export interface GenerateStructuredInput {
  system: string;
  prompt: string;
  schema: unknown;
}

function isDemoMode(): boolean {
  return process.env.DEMO_MODE?.trim().toLowerCase() === "true";
}

function endpoint(): string {
  const baseUrl = process.env.LLM_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function model(): string {
  return process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function request(input: GenerateStructuredInput, apiKey: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model(),
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "structured_output", strict: true, schema: input.schema },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("choices" in payload)) {
      throw new Error("LLM response did not contain choices");
    }

    const choices = (payload as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error("LLM response contained no choices");
    }

    const content = (choices[0] as { message?: { content?: unknown } }).message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("LLM response contained no structured content");
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new Error("LLM response contained invalid JSON");
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`LLM request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateStructured<T>({
  system,
  prompt,
  schema,
}: GenerateStructuredInput): Promise<T> {
  if (isDemoMode()) {
    throw new Error("LLM calls are disabled when DEMO_MODE=true");
  }

  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("LLM_API_KEY is not configured");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return (await request({ system, prompt, schema }, apiKey)) as T;
    } catch (error) {
      lastError = error;
      if (attempt === 0) continue;
    }
  }

  throw new Error(`Structured LLM generation failed: ${errorMessage(lastError)}`);
}
