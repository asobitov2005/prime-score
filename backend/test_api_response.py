import requests
import json

cookies = {"session_id": "bba81a44-376c-45dc-8899-d3c4e729d8c0"} # Assuming user is logged in
r = requests.get(f"http://localhost:8000/api/writing/submissions/6e91fb6d-df27-45da-978f-9209baedf616/result", cookies=cookies)
if r.status_code == 200:
    data = r.json()
    print(data.keys())
    if "roast" in data:
        print("Roast is present:", data["roast"] is not None)
    else:
        print("Roast key is MISSING")
else:
    print(r.status_code, r.text)
