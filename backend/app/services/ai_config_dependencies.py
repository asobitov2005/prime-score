from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID
import httpx
from google import genai
from google.oauth2 import service_account
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.models.ai import AiProviderConfig, AiProviderModel, AiUseCaseBinding
from app.models.enums import AiProvider, AiUseCase
from app.services.speaking_roast_prompt import UZBEK_ROAST_MODE_INSTRUCTION

__all__ = [name for name in globals() if not name.startswith('__')]
