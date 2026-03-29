import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

endpoints = [
    {"name": "Health Check", "method": "GET", "url": "http://localhost:8000/health"},
    {"name": "Pipeline Health", "method": "GET", "url": f"{BASE_URL}/health/pipeline"},
    {"name": "Get Signals", "method": "GET", "url": f"{BASE_URL}/signals?limit=5"},
    {"name": "Get Stock OHLCV (Reliance)", "method": "GET", "url": f"{BASE_URL}/stock/RELIANCE?timeframe=1d"},
    {"name": "Get Stock Patterns (Reliance)", "method": "GET", "url": f"{BASE_URL}/stock/RELIANCE/patterns"},
    {"name": "Get Stock Events (Reliance)", "method": "GET", "url": f"{BASE_URL}/stock/RELIANCE/events"},
]

results = []

print("Starting endpoint tests...")
for ep in endpoints:
    print(f"Testing {ep['name']} ({ep['method']} {ep['url']})...")
    try:
        if ep["method"] == "GET":
            response = requests.get(ep["url"], timeout=10)
        
        status = response.status_code
        try:
            data = response.json()
            # Truncate output if it's too long
            if isinstance(data, list) and len(data) > 2:
                data = data[:2] + [{"...": f"{len(data)-2} more items"}]
            if isinstance(data, dict) and "data" in data and isinstance(data["data"], list) and len(data["data"]) > 2:
                data["data"] = data["data"][:2] + [{"...": f"{len(data['data'])-2} more items"}]
        except:
            data = response.text[:200]
            
        results.append({
            "name": ep["name"],
            "url": ep["url"],
            "status": status,
            "response": data
        })
        print(f"  -> Status {status}")
    except Exception as e:
        results.append({
            "name": ep["name"],
            "url": ep["url"],
            "status": "ERROR",
            "response": str(e)
        })
        print(f"  -> ERROR: {e}")

# We'll save the details to a markdown file
with open("test_results.md", "w") as f:
    f.write("# Backend API Test Results\n\n")
    for r in results:
        f.write(f"## {r['name']}\n")
        f.write(f"**URL:** `{r['url']}`\n\n")
        f.write(f"**Status:** `{r['status']}`\n\n")
        f.write("**Response:**\n```json\n")
        if isinstance(r['response'], (dict, list)):
            f.write(json.dumps(r['response'], indent=2))
        else:
            f.write(str(r['response']))
        f.write("\n```\n\n")

print("Tests completed. Results saved to test_results.md")
