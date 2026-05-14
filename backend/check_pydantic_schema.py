from app.services.writing_checker import _GraderPayload
import json

print(json.dumps(_GraderPayload.model_json_schema()))
