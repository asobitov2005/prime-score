import { getAdminClientApiBaseUrl } from "@/lib/admin-api-base";

export const ADMIN_PUBLIC_API_BASE_URL = typeof window === "undefined"
  ? "/api/admin"
  : getAdminClientApiBaseUrl();
