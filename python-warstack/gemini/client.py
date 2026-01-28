from __future__ import annotations

from typing import Any

try:
    import google.generativeai as genai
except ImportError as exc:
    raise SystemExit(
        "Missing google-generativeai. Install with: pip install google-generativeai"
    ) from exc


class GeminiClient:
    def __init__(self, api_key: str, model_name: str) -> None:
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.generation_config = {
            "temperature": 0.4,
            "top_p": 0.9,
            "top_k": 40,
            "max_output_tokens": 1200,
        }

    def generate(self, prompt: str) -> str:
        response = self.model.generate_content(
            prompt, generation_config=self.generation_config
        )
        return getattr(response, "text", "") or ""
