from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.schemas.admin_ai_dependencies import *

class AdminWritingPromptPreviewRequest(BaseModel):
    task_type: WritingTaskTypeScope
    task_prompt_text: str = ""
    image_summary: str = ""
    essay_text: str = ""

class AdminWritingPromptPreviewRead(BaseModel):
    grader_system: str
    grader_user: str
    improved_version: str
    roast_system: str
    roast_user: str

class AdminWritingConfigAuditRead(BaseModel):
    id: UUID
    actor_admin_id: UUID | None = None
    entity_type: str
    entity_id: UUID
    action: str
    previous_version: int | None = None
    new_version: int | None = None
    metadata_json: dict = Field(default_factory=dict)
    created_at: datetime
