import { requestJson } from "@/lib/api/core";
import type {
  AdminWritingAnchorSet,
  AdminWritingConfigAuditEntry,
  AdminWritingPromptPreview,
  AdminWritingPromptProfile,
  AdminWritingRubric,
} from "@/lib/types";

interface BackendPromptProfile {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  task_type_scope: AdminWritingPromptProfile["taskTypeScope"];
  status: AdminWritingPromptProfile["status"];
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  entries?: Array<{
    id?: string;
    key: AdminWritingPromptProfile["entries"][number]["key"];
    body: string;
    format: "text" | "json";
  }> | null;
}

interface BackendRubric {
  id: string;
  task_type_scope: AdminWritingRubric["taskTypeScope"];
  version: number;
  body: string;
  status: AdminWritingRubric["status"];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BackendAnchorSet {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  task_type_scope: AdminWritingAnchorSet["taskTypeScope"];
  version: number;
  status: AdminWritingAnchorSet["status"];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: Array<{
    id?: string;
    band: number;
    essay: string;
    criteria?: Record<string, unknown> | null;
    rationale?: string;
    sort_order?: number;
  }> | null;
}

interface BackendPromptPreview {
  grader_system: string;
  grader_user: string;
  improved_version: string;
  roast_system: string;
  roast_user: string;
}

interface BackendAuditEntry {
  id: string;
  actor_admin_id?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_version?: number | null;
  new_version?: number | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
}

function mapPromptProfile(profile: BackendPromptProfile): AdminWritingPromptProfile {
  return {
    id: profile.id,
    slug: profile.slug,
    title: profile.title,
    description: profile.description ?? null,
    taskTypeScope: profile.task_type_scope,
    status: profile.status,
    version: profile.version,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    entries: (profile.entries ?? []).map((entry) => ({
      id: entry.id,
      key: entry.key,
      body: entry.body,
      format: entry.format,
    })),
  };
}

function mapRubric(rubric: BackendRubric): AdminWritingRubric {
  return {
    id: rubric.id,
    taskTypeScope: rubric.task_type_scope,
    version: rubric.version,
    body: rubric.body,
    status: rubric.status,
    isActive: rubric.is_active,
    createdAt: rubric.created_at,
    updatedAt: rubric.updated_at,
  };
}

function mapAnchorSet(anchorSet: BackendAnchorSet): AdminWritingAnchorSet {
  return {
    id: anchorSet.id,
    slug: anchorSet.slug,
    title: anchorSet.title,
    description: anchorSet.description ?? null,
    taskTypeScope: anchorSet.task_type_scope,
    version: anchorSet.version,
    status: anchorSet.status,
    isActive: anchorSet.is_active,
    createdAt: anchorSet.created_at,
    updatedAt: anchorSet.updated_at,
    items: (anchorSet.items ?? []).map((item) => ({
      id: item.id,
      band: item.band,
      essay: item.essay,
      criteria: item.criteria ?? {},
      rationale: item.rationale ?? "",
      sortOrder: item.sort_order ?? 0,
    })),
  };
}

export const writingApi = {
  async listWritingPromptProfiles(): Promise<AdminWritingPromptProfile[]> {
    const response = await requestJson<BackendPromptProfile[]>(
      "/writing-config/profiles",
    );
    return response.map(mapPromptProfile);
  },

  async createWritingPromptProfile(input: {
    slug: string;
    title: string;
    description?: string | null;
    taskTypeScope: AdminWritingPromptProfile["taskTypeScope"];
    entries: AdminWritingPromptProfile["entries"];
  }): Promise<AdminWritingPromptProfile> {
    const response = await requestJson<BackendPromptProfile>(
      "/writing-config/profiles",
      {
        method: "POST",
        body: JSON.stringify({
          slug: input.slug,
          title: input.title,
          description: input.description ?? null,
          task_type_scope: input.taskTypeScope,
          entries: input.entries.map((entry) => ({
            key: entry.key,
            body: entry.body,
            format: entry.format,
          })),
        }),
      },
    );
    return mapPromptProfile(response);
  },

  async updateWritingPromptProfile(
    profileId: string,
    input: {
      title?: string;
      description?: string | null;
      entries?: AdminWritingPromptProfile["entries"];
    },
  ): Promise<AdminWritingPromptProfile> {
    const response = await requestJson<BackendPromptProfile>(
      `/writing-config/profiles/${profileId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: input.title,
          description: input.description ?? undefined,
          entries: input.entries?.map((entry) => ({
            key: entry.key,
            body: entry.body,
            format: entry.format,
          })),
        }),
      },
    );
    return mapPromptProfile(response);
  },

  async publishWritingPromptProfile(
    profileId: string,
  ): Promise<AdminWritingPromptProfile> {
    return mapPromptProfile(
      await requestJson<BackendPromptProfile>(
        `/writing-config/profiles/${profileId}/publish`,
        { method: "POST" },
      ),
    );
  },

  async listWritingRubrics(): Promise<AdminWritingRubric[]> {
    const response = await requestJson<BackendRubric[]>(
      "/writing-config/rubrics",
    );
    return response.map(mapRubric);
  },

  async createWritingRubric(input: {
    taskTypeScope: AdminWritingRubric["taskTypeScope"];
    body: string;
  }): Promise<AdminWritingRubric> {
    return mapRubric(
      await requestJson<BackendRubric>("/writing-config/rubrics", {
        method: "POST",
        body: JSON.stringify({
          task_type_scope: input.taskTypeScope,
          body: input.body,
        }),
      }),
    );
  },

  async publishWritingRubric(rubricId: string): Promise<AdminWritingRubric> {
    return mapRubric(
      await requestJson<BackendRubric>(
        `/writing-config/rubrics/${rubricId}/publish`,
        { method: "POST" },
      ),
    );
  },

  async listWritingAnchorSets(): Promise<AdminWritingAnchorSet[]> {
    const response = await requestJson<BackendAnchorSet[]>(
      "/writing-config/anchors",
    );
    return response.map(mapAnchorSet);
  },

  async createWritingAnchorSet(input: {
    slug: string;
    title: string;
    description?: string | null;
    taskTypeScope: AdminWritingAnchorSet["taskTypeScope"];
    items: AdminWritingAnchorSet["items"];
  }): Promise<AdminWritingAnchorSet> {
    return mapAnchorSet(
      await requestJson<BackendAnchorSet>("/writing-config/anchors", {
        method: "POST",
        body: JSON.stringify({
          slug: input.slug,
          title: input.title,
          description: input.description ?? null,
          task_type_scope: input.taskTypeScope,
          items: input.items.map((item) => ({
            band: item.band,
            essay: item.essay,
            criteria: item.criteria,
            rationale: item.rationale,
          })),
        }),
      }),
    );
  },

  async publishWritingAnchorSet(anchorSetId: string): Promise<AdminWritingAnchorSet> {
    return mapAnchorSet(
      await requestJson<BackendAnchorSet>(
        `/writing-config/anchors/${anchorSetId}/publish`,
        { method: "POST" },
      ),
    );
  },

  async previewWritingPrompts(input: {
    taskType: AdminWritingPromptProfile["taskTypeScope"];
    taskPromptText: string;
    imageSummary?: string;
    essayText: string;
  }): Promise<AdminWritingPromptPreview> {
    const preview = await requestJson<BackendPromptPreview>(
      "/writing-config/preview",
      {
        method: "POST",
        body: JSON.stringify({
          task_type: input.taskType,
          task_prompt_text: input.taskPromptText,
          image_summary: input.imageSummary ?? "",
          essay_text: input.essayText,
        }),
      },
    );
    return {
      graderSystem: preview.grader_system,
      graderUser: preview.grader_user,
      improvedVersion: preview.improved_version,
      roastSystem: preview.roast_system,
      roastUser: preview.roast_user,
    };
  },

  async listWritingConfigAuditLog(): Promise<AdminWritingConfigAuditEntry[]> {
    const response = await requestJson<BackendAuditEntry[]>(
      "/writing-config/audit-log",
    );
    return response.map((entry) => ({
      id: entry.id,
      actorAdminId: entry.actor_admin_id ?? null,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      action: entry.action,
      previousVersion: entry.previous_version ?? null,
      newVersion: entry.new_version ?? null,
      metadataJson: entry.metadata_json ?? {},
      createdAt: entry.created_at,
    }));
  },
};
