#!/usr/bin/env python3
"""
JobPilot 104 Crawler (Python + curl_cffi)
Anti-detection:
  (1) TLS fingerprint: curl_cffi impersonate Chrome124
  (2) UA pool + session stickiness
  (3) Dynamic Referer
  (4) Random delay
  (5) Hourly quota
  (6) 429 exponential backoff
  (7) Circuit breaker
  (8) Two-stage flow (list → detail for skills)
  (9) Early pagination stop + URL dedup
"""

import os
import re
import json
import time
import random
from datetime import datetime, timedelta
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv(".env.local")

from curl_cffi import requests as cf_requests
import psycopg2

# ── Config ────────────────────────────────────────────────────────────────────

AREA_CODES   = "6001001000%2C6001002000"
BASE_URL     = "https://www.104.com.tw"
SEARCH_API   = f"{BASE_URL}/jobs/search/api/jobs"
DETAIL_API   = f"{BASE_URL}/job/ajax/content"
PAGES_PER_KW = 5
MAX_PER_HOUR = 1500
MAX_ERRORS   = 5
GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-embedding-001:embedContent"

SESSION_UA = random.choice([
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
])

# ── Session state ─────────────────────────────────────────────────────────────

session = cf_requests.Session(impersonate="chrome124")
request_timestamps: list[float] = []
consecutive_errors = 0

# ── Helpers ───────────────────────────────────────────────────────────────────

def sleep(s: float): time.sleep(s)

def human_delay():
    base = 0.5 + random.random() * 1.0
    extra = (3 + random.random() * 7) if random.random() < 0.05 else 0
    sleep(base + extra)

def enforce_hourly_quota():
    now = time.time()
    while request_timestamps and request_timestamps[0] < now - 3600:
        request_timestamps.pop(0)
    if len(request_timestamps) >= MAX_PER_HOUR:
        wait = request_timestamps[0] + 3600 - now
        print(f"  ⏳ 小時配額滿，等待 {int(wait)}s")
        sleep(wait)
    request_timestamps.append(now)

def base_headers(referer: str) -> dict:
    return {
        "User-Agent": SESSION_UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8",
        "Referer": referer,
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
    }

def api_fetch(url: str, referer: str, retries: int = 0) -> dict:
    global consecutive_errors
    if consecutive_errors >= MAX_ERRORS:
        raise RuntimeError(f"Circuit breaker: {consecutive_errors} 次連續錯誤")
    enforce_hourly_quota()

    resp = session.get(url, headers=base_headers(referer), timeout=20)
    if resp.status_code == 429:
        wait = 30 * (2 ** min(retries + 1, 3))
        print(f"  ⚠️ 429 退避 {wait}s")
        sleep(wait)
        return api_fetch(url, referer, retries + 1)
    if resp.status_code != 200:
        consecutive_errors += 1
        raise RuntimeError(f"HTTP {resp.status_code}")
    consecutive_errors = 0
    return resp.json()

# ── Search API ────────────────────────────────────────────────────────────────

def fetch_job_nos(keyword: str, max_pages: int = 3, cutoff: datetime | None = None) -> list[tuple[str, float]]:
    """Returns list of (job_url, hrBehaviorPR) tuples."""
    seen: dict[str, float] = {}
    kw_enc = quote(keyword)
    referer = f"{BASE_URL}/jobs/search/?keyword={kw_enc}&area={AREA_CODES}&order=12"

    for page in range(1, max_pages + 1):
        url = (f"{SEARCH_API}?ro=0&kwop=7&keyword={kw_enc}"
               f"&area={AREA_CODES}&order=12&asc=0&sr=99"
               f"&page={page}&mode=s&jobsource=2018indexpoc")
        try:
            data = api_fetch(url, referer)
            items = data.get("data") or []
            if not items:
                break

            hit_cutoff = False
            for item in items:
                job_url = (item.get("link") or {}).get("job")
                if not job_url:
                    continue
                if cutoff and item.get("appearDate"):
                    d = datetime.strptime(str(item["appearDate"]), "%Y%m%d")
                    if d < cutoff:
                        hit_cutoff = True
                        break
                hr_score = float(item.get("hrBehaviorPR") or 0)
                seen[job_url] = max(seen.get(job_url, 0), hr_score)

            if hit_cutoff:
                break

            last_page = (data.get("metadata") or {}).get("pagination", {}).get("lastPage", 1)
            if page >= last_page:
                break

            human_delay()
        except Exception as e:
            print(f"  搜尋第 {page} 頁失敗: {e}")
            break

    return list(seen.items())

# ── Detail API ────────────────────────────────────────────────────────────────

def _extract_reply_days(reply: str) -> str | None:
    if not reply:
        return None
    m = re.search(r'\d+\s*個?\s*工作天內|\d+\s*天內', reply)
    return m.group(0) + "回覆" if m else reply[:20] or None

def fetch_job_detail(job_url: str, hr_score: float = 0.0) -> dict | None:
    job_slug = job_url.split("/job/")[-1]
    url = f"{DETAIL_API}/{job_slug}"
    try:
        data = api_fetch(url, job_url)
        d = data.get("data", {})
        header  = d.get("header", {})
        if not header.get("jobName") or not header.get("custName"):
            return None
        detail    = d.get("jobDetail", {})
        contact   = d.get("contact", {})
        condition = d.get("condition", {})

        skills = [s.get("description", "") for s in condition.get("specialty", []) if s.get("description")]
        posted_at = header.get("appearDate") or None
        recruitment_activity = "活躍徵才" if hr_score >= 0.8 else None

        return {
            "jobNo":               job_slug,
            "externalUrl":         job_url,
            "title":               header.get("jobName"),
            "companyName":         header.get("custName"),
            "salaryRange":         detail.get("salary"),
            "location":            detail.get("addressRegion"),
            "skills":              skills,
            "description":         detail.get("jobDescription"),
            "recruitmentActivity": recruitment_activity,
            "replyDays":           _extract_reply_days(contact.get("reply", "")),
            "contactTime":         None,
            "postedAt":            posted_at,
            "applicantCount":      None,
            "remote":              bool(detail.get("remoteWork")),
            "seniority":           detail.get("workExp"),
        }
    except Exception as e:
        print(f"  detail 失敗 {job_url}: {str(e)[:60]}")
        return None

# ── Embedding ─────────────────────────────────────────────────────────────────

def embed_jd(job: dict) -> list[float]:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return []
    skills_str = ", ".join(job.get("skills") or [])
    text = (
        f"職缺：{job.get('title', '')}\n"
        f"公司：{job.get('companyName', '')}\n"
        f"技能：{skills_str}\n"
        f"地點：{job.get('location', '')}\n"
        f"年資：{job.get('seniority', '')}\n"
        f"薪資：{job.get('salaryRange', '')}\n"
        f"描述：{(job.get('description') or '')[:800]}"
    )
    resp = session.post(
        f"{GEMINI_EMBED_URL}?key={api_key}",
        headers={"Content-Type": "application/json"},
        json={"model": "models/gemini-embedding-001", "content": {"parts": [{"text": text}]}, "outputDimensionality": 768},
        timeout=30,
    )
    if resp.status_code != 200:
        return []
    return resp.json()["embedding"]["values"]

# ── DB ────────────────────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(os.environ["DIRECT_URL"])

import hashlib

def content_hash(job: dict) -> str:
    text = f"{job.get('title','')}{job.get('salaryRange','')}{job.get('description','')}"
    return hashlib.md5(text.encode()).hexdigest()

def retry(fn, retries=2, delay=3):
    for attempt in range(retries + 1):
        try:
            return fn()
        except Exception as e:
            if attempt == retries:
                raise
            print(f"  ⚠️ 重試 ({attempt+1}/{retries}): {str(e)[:60]}")
            sleep(delay * (attempt + 1))

def upsert_jd(conn, job: dict) -> tuple[str, bool]:
    """Returns (jd_id, content_changed)."""
    h = content_hash(job)
    with conn.cursor() as cur:
        cur.execute('SELECT id, "contentHash" FROM "Jd" WHERE "externalUrl" = %s', (job["externalUrl"],))
        existing = cur.fetchone()
        changed = existing is None or existing[1] != h

        cur.execute("""
            INSERT INTO "Jd" (
                id, "externalUrl", title, "companyName", skills, "salaryRange",
                seniority, remote, location, description, "recruitmentActivity",
                "replyDays", "contactTime", "postedAt", "applicantCount", "crawledAt", source,
                "contentHash", "contentUpdatedAt", "delistedAt"
            ) VALUES (
                gen_random_uuid()::text, %(externalUrl)s, %(title)s, %(companyName)s,
                %(skills)s::jsonb, %(salaryRange)s, %(seniority)s, %(remote)s,
                %(location)s, %(description)s, %(recruitmentActivity)s, %(replyDays)s,
                %(contactTime)s, %(postedAt)s, %(applicantCount)s, NOW(), '104',
                %(contentHash)s, CASE WHEN TRUE THEN NOW() END, NULL
            )
            ON CONFLICT ("externalUrl") DO UPDATE SET
                title                 = EXCLUDED.title,
                "companyName"         = EXCLUDED."companyName",
                skills                = EXCLUDED.skills,
                "salaryRange"         = EXCLUDED."salaryRange",
                seniority             = EXCLUDED.seniority,
                remote                = EXCLUDED.remote,
                location              = EXCLUDED.location,
                description           = EXCLUDED.description,
                "recruitmentActivity" = EXCLUDED."recruitmentActivity",
                "replyDays"           = EXCLUDED."replyDays",
                "contactTime"         = EXCLUDED."contactTime",
                "postedAt"            = EXCLUDED."postedAt",
                "applicantCount"      = EXCLUDED."applicantCount",
                "crawledAt"           = NOW(),
                "contentHash"         = EXCLUDED."contentHash",
                "contentUpdatedAt"    = CASE WHEN "Jd"."contentHash" IS DISTINCT FROM EXCLUDED."contentHash" THEN NOW() ELSE "Jd"."contentUpdatedAt" END,
                "delistedAt"          = NULL
            RETURNING id
        """, {**job, "skills": json.dumps(job.get("skills") or [], ensure_ascii=False), "contentHash": h})
        row = cur.fetchone()
        conn.commit()
        return row[0], changed

def upsert_embedding(conn, jd_id: str, vector: list[float]):
    def _do():
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO "JdEmbedding" ("jdId", embedding)
                VALUES (%s, %s::vector(768))
                ON CONFLICT ("jdId") DO UPDATE SET embedding = EXCLUDED.embedding
            """, (jd_id, f"[{','.join(str(x) for x in vector)}]"))
            conn.commit()
    retry(_do)

def get_keywords(conn) -> list[str]:
    with conn.cursor() as cur:
        cur.execute('SELECT "expandedKeywords" FROM "JobIntent"')
        rows = cur.fetchall()
    all_kws: list[str] = []
    for (kws,) in rows:
        parsed = kws if isinstance(kws, list) else json.loads(kws)
        all_kws.extend(parsed)
    return list(set(all_kws))

def get_existing_urls(conn) -> set[str]:
    with conn.cursor() as cur:
        cur.execute('SELECT "externalUrl" FROM "Jd" WHERE "delistedAt" IS NULL')
        return {row[0] for row in cur.fetchall()}

def check_delisted(conn, seen_urls: set[str]) -> int:
    """Mark jobs not seen in this crawl and older than 3 days as delisted."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE "Jd"
            SET "delistedAt" = NOW()
            WHERE "delistedAt" IS NULL
              AND "crawledAt" < NOW() - INTERVAL '3 days'
              AND "externalUrl" NOT IN (SELECT unnest(%s::text[]))
            RETURNING id
        """, (list(seen_urls),))
        count = cur.rowcount
        conn.commit()
        return count

def send_health_report(conn, stats: dict):
    """Log crawl health stats to a simple table or print summary."""
    print(f"\n{'='*50}")
    print(f"📊 爬蟲健康報告")
    print(f"{'='*50}")
    print(f"  關鍵字數：{stats['keywords']}")
    print(f"  搜尋到職缺：{stats['found']}")
    print(f"  新職缺：{stats['new']}")
    print(f"  已存在（更新）：{stats['existing_refreshed']}")
    print(f"  儲存成功：{stats['saved']}")
    print(f"  儲存失敗：{stats['failed']}")
    print(f"  內容有變動：{stats['content_changed']}")
    print(f"  標記下架：{stats['delisted']}")
    print(f"  Embedding 成功：{stats['embedded']}")
    print(f"  耗時：{stats['duration_sec']:.0f} 秒")
    if stats['failed'] > stats['saved'] * 0.3:
        print(f"  ⚠️ 警告：失敗率超過 30%！")
    print(f"{'='*50}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    start_time = time.time()
    print("🚀 JobPilot 104 Crawler (Python + curl_cffi)\n")
    conn = get_conn()

    keywords = get_keywords(conn)
    print(f"關鍵字 {len(keywords)} 個: {', '.join(keywords)}")
    if not keywords:
        print("沒有關鍵字，結束")
        conn.close()
        return

    # ── Phase 1: 搜尋職缺清單 ──
    print("\n── Phase 1: 搜尋職缺清單 ──")
    cutoff = (datetime.now() - timedelta(days=3)).replace(hour=0, minute=0, second=0, microsecond=0)

    seen: dict[str, float] = {}
    for kw in keywords:
        pairs = fetch_job_nos(kw, PAGES_PER_KW, cutoff)
        print(f'  "{kw}": {len(pairs)} 筆')
        for url, score in pairs:
            seen[url] = max(seen.get(url, 0), score)
        sleep(0.8 + random.random() * 0.6)

    print(f"\n總計 {len(seen)} 個不重複職缺")

    existing = get_existing_urls(conn)
    new_pairs = [(u, s) for u, s in seen.items() if u not in existing]
    existing_pairs = [(u, s) for u, s in seen.items() if u in existing]
    print(f"新職缺 {len(new_pairs)} 個，已存在 {len(existing_pairs)} 個")

    # ── Phase 2: 抓取新職缺詳情 ──
    print("\n── Phase 2: 抓取新職缺詳情 ──")
    saved = failed = content_changed = embedded = 0
    existing_refreshed = 0

    for i, (job_url, hr_score) in enumerate(new_pairs):
        slug = job_url.split("/job/")[-1]
        print(f"[新 {i+1}/{len(new_pairs)}] {slug} ... ", end="", flush=True)
        job = fetch_job_detail(job_url, hr_score)
        if not job:
            print("❌ API 失敗")
            failed += 1
            continue
        try:
            def _save():
                return upsert_jd(conn, job)
            jd_id, changed = retry(_save)
            if changed:
                content_changed += 1
            vector = retry(lambda: embed_jd(job))
            if len(vector) == 768:
                upsert_embedding(conn, jd_id, vector)
                embedded += 1
            saved += 1
            print(f"✅ {job['title']} @ {job['companyName']}")
        except Exception as e:
            print(f"❌ 錯誤: {str(e)[:80]}")
            failed += 1
        human_delay()

    # ── Phase 3: 更新已存在的職缺（偵測內容變動）──
    if existing_pairs:
        print(f"\n── Phase 3: 更新已存在的 {len(existing_pairs)} 個職缺 ──")
        for i, (job_url, hr_score) in enumerate(existing_pairs):
            slug = job_url.split("/job/")[-1]
            print(f"[更新 {i+1}/{len(existing_pairs)}] {slug} ... ", end="", flush=True)
            job = fetch_job_detail(job_url, hr_score)
            if not job:
                print("⏭ 跳過")
                continue
            try:
                jd_id, changed = retry(lambda: upsert_jd(conn, job))
                existing_refreshed += 1
                if changed:
                    content_changed += 1
                    vector = retry(lambda: embed_jd(job))
                    if len(vector) == 768:
                        upsert_embedding(conn, jd_id, vector)
                        embedded += 1
                    print(f"🔄 內容變動！{job['title']}")
                else:
                    print(f"✓ 無變動")
            except Exception as e:
                print(f"❌ {str(e)[:60]}")
            human_delay()

    # ── Phase 4: 下架偵測 ──
    print("\n── Phase 4: 下架偵測 ──")
    all_seen_urls = set(seen.keys())
    delisted = check_delisted(conn, all_seen_urls)
    print(f"  標記下架：{delisted} 筆")

    # ── Phase 5: 健康報告 ──
    duration = time.time() - start_time
    stats = {
        "keywords": len(keywords),
        "found": len(seen),
        "new": len(new_pairs),
        "existing_refreshed": existing_refreshed,
        "saved": saved,
        "failed": failed,
        "content_changed": content_changed,
        "delisted": delisted,
        "embedded": embedded,
        "duration_sec": duration,
    }
    send_health_report(conn, stats)

    conn.close()

if __name__ == "__main__":
    main()
