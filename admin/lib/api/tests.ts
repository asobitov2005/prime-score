import { requestJson } from "@/lib/api/core";
import type {
  BackendAdminDraft,
  BackendAdminTest,
} from "@/lib/api/test-contracts";
import {
  mapAdminDraft,
  mapAdminTest,
} from "@/lib/api/test-from-backend";
import { toBackendDraftPayload } from "@/lib/api/test-to-backend";
import type {
  AdminTestDraftState,
  AdminTestSummary,
} from "@/lib/types";

export const testsApi = {
  async listTests(): Promise<AdminTestSummary[]> {
    const response = await requestJson<BackendAdminTest[]>("/tests");
    return response.map(mapAdminTest);
  },

  async getDraft(testId: string): Promise<AdminTestDraftState> {
    const response = await requestJson<BackendAdminDraft>(
      `/tests/${testId}/draft`,
    );
    return mapAdminDraft(response);
  },

  async createDraft(draft: AdminTestDraftState): Promise<AdminTestSummary> {
    const response = await requestJson<BackendAdminTest>("/tests/draft", {
      method: "POST",
      body: JSON.stringify(toBackendDraftPayload(draft)),
    });
    return mapAdminTest(response);
  },

  async updateDraft(
    testId: string,
    draft: AdminTestDraftState,
    options: { allowNewVersion?: boolean } = {},
  ): Promise<AdminTestSummary> {
    const search = new URLSearchParams();
    if (options.allowNewVersion) {
      search.set("allow_new_version", "true");
    }
    const suffix = search.size ? `?${search.toString()}` : "";
    const response = await requestJson<BackendAdminTest>(
      `/tests/${testId}/draft${suffix}`,
      {
        method: "PUT",
        body: JSON.stringify(toBackendDraftPayload(draft)),
      },
    );
    return mapAdminTest(response);
  },

  async quickFixPublished(
    testId: string,
    draft: AdminTestDraftState,
  ): Promise<AdminTestSummary> {
    const response = await requestJson<BackendAdminTest>(
      `/tests/${testId}/quick-fix`,
      {
        method: "PUT",
        body: JSON.stringify(toBackendDraftPayload(draft)),
      },
    );
    return mapAdminTest(response);
  },

  async publishTest(testId: string): Promise<AdminTestSummary> {
    const response = await requestJson<BackendAdminTest>(
      `/tests/${testId}/publish`,
      { method: "POST" },
    );
    return mapAdminTest(response);
  },

  deleteDraft(testId: string): Promise<{ message: string }> {
    return requestJson(`/tests/${testId}`, { method: "DELETE" });
  },

  bulkPublish(
    ids: string[],
    status: "published" | "draft" | "archived",
  ): Promise<{ message: string }> {
    return requestJson("/tests/bulk-publish", {
      method: "PATCH",
      body: JSON.stringify({ ids, status }),
    });
  },

  bulkAccess(
    ids: string[],
    accessType: "public" | "premium",
  ): Promise<{ message: string }> {
    return requestJson("/tests/bulk-status", {
      method: "PATCH",
      body: JSON.stringify({ ids, access_type: accessType }),
    });
  },
};
