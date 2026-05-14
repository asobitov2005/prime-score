import asyncio
from backend.app.services.ai_config import ResolvedAiUseCaseConfig, build_groq_client
from backend.app.models.enums import AiProvider
import os

from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

try:
    response = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": "Return JSON with a key 'message' and value 'hello'"}],
        response_format={"type": "json_object"},
        max_completion_tokens=100
    )
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")

