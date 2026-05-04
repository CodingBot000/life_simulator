type BackendErrorBody = {
  error?: string;
  error_code?: string;
  trace_id?: string;
  rate_limit_scope?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly traceId: string | null;
  readonly rateLimitScope: string | null;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string | null;
      traceId?: string | null;
      rateLimitScope?: string | null;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code ?? null;
    this.traceId = options.traceId ?? null;
    this.rateLimitScope = options.rateLimitScope ?? null;
  }
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/$/u, "");

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function readBodyText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function parseJsonBody(text: string): unknown {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function errorMessageForStatus(status: number) {
  if (status === 429) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "백엔드 요청 중 오류가 발생했습니다.";
}

function toBackendErrorBody(value: unknown): BackendErrorBody {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as BackendErrorBody;
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await readBodyText(response);
  const parsed = parseJsonBody(text);

  if (!response.ok) {
    const errorBody = toBackendErrorBody(parsed);
    throw new ApiError(
      errorBody.error?.trim() || errorMessageForStatus(response.status),
      {
        status: response.status,
        code: errorBody.error_code ?? null,
        traceId: errorBody.trace_id ?? response.headers.get("x-trace-id"),
        rateLimitScope:
          errorBody.rate_limit_scope ?? response.headers.get("x-rate-limit-scope"),
      },
    );
  }

  if (parsed === null) {
    throw new ApiError("백엔드 응답을 JSON으로 해석하지 못했습니다.", {
      status: response.status,
      traceId: response.headers.get("x-trace-id"),
    });
  }

  return parsed as T;
}
