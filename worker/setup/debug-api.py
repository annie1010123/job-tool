import os, json
from urllib.parse import quote
from dotenv import load_dotenv
load_dotenv(".env.local")
from curl_cffi import requests as cf_requests

BASE_URL   = "https://www.104.com.tw"
SEARCH_API = f"{BASE_URL}/jobs/search/api/jobs"
DETAIL_API = f"{BASE_URL}/job/ajax/content"
AREA_CODES = "6001001000%2C6001002000"
SESSION_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

session = cf_requests.Session(impersonate="chrome124")

def headers(referer): return {
    "User-Agent": SESSION_UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8",
    "Referer": referer,
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}

# 1. Search API — inspect structure
kw = "專案管理"
kw_enc = quote(kw)
referer = f"{BASE_URL}/jobs/search/?keyword={kw_enc}&area={AREA_CODES}&order=12"
url = f"{SEARCH_API}?ro=0&kwop=7&keyword={kw_enc}&area={AREA_CODES}&order=12&asc=0&sr=99&page=1&mode=s&jobsource=2018indexpoc"

resp = session.get(url, headers=headers(referer), timeout=20)
data = resp.json()

print("=== SEARCH API TOP-LEVEL KEYS ===")
print(list(data.keys()))

print("\n=== FIRST ITEM KEYS ===")
if isinstance(data.get("data"), list) and data["data"]:
    first = data["data"][0]
    print(list(first.keys()))
    print("\n=== FIRST ITEM ===")
    print(json.dumps(first, ensure_ascii=False, indent=2)[:1500])

# Check for totalPage / pagination
print("\n=== PAGINATION INFO ===")
for k, v in data.items():
    if k != "data":
        print(f"  {k}: {v}")

# 2. Detail API — inspect structure for first job
if isinstance(data.get("data"), list) and data["data"]:
    job_no = data["data"][0].get("jobNo") or data["data"][0].get("jobId") or data["data"][0].get("custNo")
    print(f"\n=== DETAIL API (jobNo field check) ===")
    # Check all fields that might be job ID
    for k in data["data"][0]:
        v = data["data"][0][k]
        if isinstance(v, str) and len(v) < 30:
            print(f"  {k}: {v}")
