import { proxyMockCatalog } from "@/lib/server-mock-catalog";

export function GET(request: Request) {
  return proxyMockCatalog(request, "online-mocks");
}
