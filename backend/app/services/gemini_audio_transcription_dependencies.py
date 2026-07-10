from __future__ import annotations

import asyncio
import difflib
import json
import logging
import mimetypes
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote
from urllib.parse import urlparse
import httpx
from google import genai
from google.genai import types as genai_types
from app.core.config import get_settings
from app.db.session import get_session_maker
from app.models.enums import AiProvider, AiUseCase
from app.services.ai_config import (
    ResolvedAiUseCaseConfig,
    build_google_client,
    resolve_ai_use_case_config,
)
from app.services.object_storage import fetch_storage_object

__all__ = [name for name in globals() if not name.startswith('__')]
