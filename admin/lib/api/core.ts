import { fetchAdminApi } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";

export const adminApiBaseUrl = ADMIN_PUBLIC_API_BASE_URL;

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${adminApiBaseUrl}${path}`;
  const response = await fetchAdminApi(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    let detail = errorText.trim();
    try {
      const parsed = JSON.parse(errorText) as { detail?: string };
      if (parsed?.detail?.trim()) {
        detail = parsed.detail.trim();
      }
    } catch {
      // Keep the raw response body when it is not JSON.
    }
    throw new Error(
      detail
        ? `Admin API request failed: ${response.status} ${response.statusText} - ${detail}`
        : `Admin API request failed: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as T;
}

export async function uploadAdminFile(
  path: string,
  file: File,
): Promise<{ publicUrl: string; filename: string; contentType: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetchAdminApi(`${adminApiBaseUrl}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ? ` - ${payload.detail}` : "";
    } catch {
      detail = "";
    }
    throw new Error(
      `File upload failed: ${response.status} ${response.statusText}${detail}`,
    );
  }
  const payload = (await response.json()) as {
    public_url: string;
    filename: string;
    content_type: string;
  };
  return {
    publicUrl: payload.public_url,
    filename: payload.filename,
    contentType: payload.content_type,
  };
}
