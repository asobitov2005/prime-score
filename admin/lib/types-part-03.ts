import { AdminDraftChecklistStatus } from "./types-part-01";
import { AdminEditorDecisionFlags, AdminTestDraftContentSection, AdminTestDraftMetadata, AiProvider, AiUseCase, WritingConfigStatus, WritingPromptKey, WritingTaskTypeScope } from "./types-part-02";

export interface AdminAiProviderModel {
  id: string;
  modelId: string;
  displayName: string;
  family: string | null;
  capabilities: Record<string, unknown>;
  contextWindow: number | null;
  isAccessible: boolean;
  isSelectable: boolean;
  sortOrder: number;
}

export interface AdminAiUseCaseBinding {
  id: string | null;
  useCase: AiUseCase;
  providerConfigId: string | null;
  provider: AiProvider | null;
  providerLabel: string | null;
  providerModelId: string | null;
  modelId: string | null;
  modelDisplayName: string | null;
  settingsJson: Record<string, unknown>;
  resolvedSource: string;
}

export interface AdminWritingPromptEntry {
  id?: string;
  key: WritingPromptKey;
  body: string;
  format: "text" | "json";
}

export interface AdminWritingPromptProfile {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  taskTypeScope: WritingTaskTypeScope;
  status: WritingConfigStatus;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  entries: AdminWritingPromptEntry[];
}

export interface AdminWritingRubric {
  id: string;
  taskTypeScope: WritingTaskTypeScope;
  version: number;
  body: string;
  status: WritingConfigStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWritingAnchorItem {
  id?: string;
  band: number;
  essay: string;
  criteria: Record<string, unknown>;
  rationale: string;
  sortOrder?: number;
}

export interface AdminWritingAnchorSet {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  taskTypeScope: WritingTaskTypeScope;
  version: number;
  status: WritingConfigStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: AdminWritingAnchorItem[];
}

export interface AdminWritingPromptPreview {
  graderSystem: string;
  graderUser: string;
  improvedVersion: string;
  roastSystem: string;
  roastUser: string;
}

export interface AdminWritingConfigAuditEntry {
  id: string;
  actorAdminId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  previousVersion: number | null;
  newVersion: number | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
}

export interface AdminTranscriptQuestionLocation {
  questionId?: string;
  questionLabel: string;
  questionPrompt: string;
  startSec: number;
  endSec: number;
  answerText: string;
  correctAnswer: string;
}

export interface AdminTestDraftQuestion {
  id: string;
  label: string;
  prompt: string;
  acceptedAnswers: string[];
  explanation: string;
  variants: string[]; // Added for MCQ options per question
}

export interface AdminTestDraftQuestionGroup {
  id: string;
  sectionId: string;
  title: string;
  instructions: string;
  optionsTitle?: string;
  typeId: string;
  questionStart: number;
  questionEnd: number;
  sharedOptions: string[];
  rawContent?: string;
  // Block-based input fields
  questionBlock?: string;
  answerBlock?: string;
  secondaryBlock?: string; // Used for Headings, Features, etc.
  diagramTitle?: string;
  diagramImageUrl?: string;
  questions: AdminTestDraftQuestion[];
}

export interface AdminTestDraftChecklistItem {
  id: string;
  label: string;
  status: AdminDraftChecklistStatus;
  detail: string;
}

export interface AdminTestDraftReview {
  checklist: AdminTestDraftChecklistItem[];
  notes: string[];
}

export interface AdminTestDraftState {
  metadata: AdminTestDraftMetadata;
  content: {
    sections: AdminTestDraftContentSection[];
  };
  questionGroups: AdminTestDraftQuestionGroup[];
  questions: AdminTestDraftQuestion[]; // Keep for backward compatibility or direct access if needed, but we'll prefer questionGroups
  review: AdminTestDraftReview;
  decisions: AdminEditorDecisionFlags;
}
