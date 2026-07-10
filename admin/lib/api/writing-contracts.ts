import type {
  AdminWritingAnchorSet,
  AdminWritingPromptProfile,
  AdminWritingRubric,
} from "@/lib/types";

export interface BackendPromptProfile {
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

export interface BackendRubric {
  id: string;
  task_type_scope: AdminWritingRubric["taskTypeScope"];
  version: number;
  body: string;
  status: AdminWritingRubric["status"];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BackendAnchorSet {
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

export interface BackendPromptPreview {
  grader_system: string;
  grader_user: string;
  improved_version: string;
  roast_system: string;
  roast_user: string;
}

export interface BackendAuditEntry {
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

export function mapPromptProfile(
  profile: BackendPromptProfile,
): AdminWritingPromptProfile {
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

export function mapRubric(rubric: BackendRubric): AdminWritingRubric {
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

export function mapAnchorSet(
  anchorSet: BackendAnchorSet,
): AdminWritingAnchorSet {
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
