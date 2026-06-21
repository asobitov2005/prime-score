"use client";

import { refreshClientUserAccessToken } from "@/lib/user-auth-client";
import { useAuthStore } from "@/store/auth-store";

function withClientUserAuthHeaders(headers?: HeadersInit): Headers {
  const nextHeaders = new Headers(headers);
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return nextHeaders;
}

export async function fetchInternalUserApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestWithAuth = () =>
    fetch(input, {
      ...init,
      headers: withClientUserAuthHeaders(init?.headers),
    });

  let response = await requestWithAuth();
  if (response.status !== 401) {
    return response;
  }

  const refreshedAccessToken = await refreshClientUserAccessToken(undefined, fetch, { clearOnFailure: false });
  if (!refreshedAccessToken) {
    return response;
  }

  response = await requestWithAuth();
  return response;
}
