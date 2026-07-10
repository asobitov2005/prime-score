import {
  FRONTEND_API_TIMEOUT_MS,
  getFrontendClientApiBaseUrl,
  getFrontendServerApiBaseUrl,
} from "@/lib/api-base";
import { performClientUserAuthedFetch } from "@/lib/user-auth-client";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export type ApiRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export interface ApiRequestContext {
  baseUrl: string;
  fetchImpl: typeof fetch;
  request: ApiRequest;
  requestForm: ApiRequest;
}

async function readErrorMessage(response: Response, path: string): Promise<string> {
  let message = `Request failed for ${path}`;
  try {
    const payload = (await response.json()) as {
      detail?: string;
      message?: string;
    };
    return payload.detail ?? payload.message ?? message;
  } catch {
    try {
      const text = await response.text();
      if (text.trim()) {
        message = text.trim();
      }
    } catch {
      // Keep the generic message when the response body cannot be read.
    }
  }
  return message;
}

function createRequest(
  baseUrl: string,
  fetchImpl: typeof fetch,
  includeJsonContentType: boolean,
): ApiRequest {
  return async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = init?.signal ? null : new AbortController();
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS)
      : null;

    let response: Response;
    try {
      response = await performClientUserAuthedFetch(
        path,
        {
          ...init,
          signal: init?.signal ?? controller?.signal,
        },
        {
          baseUrl,
          fetchImpl,
          includeJsonContentType,
        },
      );
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("PrimeScore server is not responding.", 504);
      }
      throw error;
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (!response.ok) {
      throw new ApiError(
        await readErrorMessage(response, path),
        response.status,
      );
    }
    return (await response.json()) as T;
  };
}

export function createApiRequestContext(
  config: ApiClientConfig = {},
): ApiRequestContext {
  let baseUrl = config.baseUrl ?? getFrontendClientApiBaseUrl();
  if (baseUrl.startsWith("/") && typeof window === "undefined") {
    baseUrl = getFrontendServerApiBaseUrl();
  }
  const fetchImpl = config.fetchImpl ?? fetch;
  return {
    baseUrl,
    fetchImpl,
    request: createRequest(baseUrl, fetchImpl, true),
    requestForm: createRequest(baseUrl, fetchImpl, false),
  };
}
