from app.services.writing_checker import _response_schema
import json
print(json.dumps(_response_schema(), default=str))
