export interface FallbackResult<T> {
  value: T;
  fallbackUsed: boolean;
}

export interface DegradedResponse {
  request_id: string;
  trace_id: string;
  degraded: true;
  route_name: string;
  message: string;
  retryable: boolean;
  selected_model?: string;
  fallback_model?: string;
  error_code: string;
  created_at: string;
}

export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback?: () => Promise<T>,
): Promise<FallbackResult<T>> {
  try {
    return {
      value: await primary(),
      fallbackUsed: false,
    };
  } catch (error) {
    if (!fallback) {
      throw error;
    }

    return {
      value: await fallback(),
      fallbackUsed: true,
    };
  }
}

export function buildDegradedResponse(params: {
  requestId: string;
  traceId: string;
  routeName: string;
  message: string;
  retryable?: boolean;
  selectedModel?: string;
  fallbackModel?: string;
  errorCode?: string;
}): DegradedResponse {
  return {
    request_id: params.requestId,
    trace_id: params.traceId,
    degraded: true,
    route_name: params.routeName,
    message: params.message,
    retryable: params.retryable ?? true,
    selected_model: params.selectedModel,
    fallback_model: params.fallbackModel,
    error_code: params.errorCode ?? "degraded_response",
    created_at: new Date().toISOString(),
  };
}
