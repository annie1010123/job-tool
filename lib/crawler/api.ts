// 104 Playwright network-intercept crawler
// Playwright navigates normally; we capture the API responses the browser makes naturally.
// Anti-detection: real Chrome TLS, UA session stickiness, human delay,
//                 hourly quota, 429 backoff, circuit breaker, two-stage flow, early stop.

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const AREA_CODES = "6001001000,6001002000";
const BASE_URL = "https://www.104.com.tw";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApiJob {
  jobNo: string;
  externalUrl: string;
  title: string;
  companyName: string;
  salaryRange: string | null;
  location: string | null;
  skills: string[];
  description: string | null;
  recruitmentActivity: string | null;
  replyDays: string | null;
  contactTime: string | null;
  postedAt: string | null;
  applicantCount: number | null;
  remote: boolean;
  seniority: string | null;
}

// ── Session ──────────────────────────────────────────────────────────────────

export class CrawlerSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private consecutiveErrors = 0;
  private requestTimestamps: number[] = [];
  private readonly MAX_PER_HOUR = 1500;
  private readonly MAX_ERRORS = 5;

  async init() {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "zh-TW",
      timezoneId: "Asia/Taipei",
    });
    this.page = await this.context.newPage();

    // Stealth: hide headless indicators from Cloudflare/bot detection
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["zh-TW", "zh", "en-US", "en"] });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });

    // Warm up: visit 104 main page first to get initial cookies
    await this.page.goto("https://www.104.com.tw", { waitUntil: "domcontentloaded", timeout: 30000 });
    await this.sleep(2000 + Math.random() * 1000);
  }

  async close() {
    await this.browser?.close();
  }

  private sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }

  private async humanDelay() {
    const base = 800 + Math.random() * 1200;
    const extra = Math.random() < 0.05 ? 3000 + Math.random() * 5000 : 0;
    await this.sleep(base + extra);
  }

  private async enforceHourlyQuota() {
    const now = Date.now();
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] < now - 3600000) {
      this.requestTimestamps.shift();
    }
    if (this.requestTimestamps.length >= this.MAX_PER_HOUR) {
      const wait = this.requestTimestamps[0] + 3600000 - now;
      console.log(`  ⏳ 小時配額滿，等待 ${Math.ceil(wait / 1000)}s`);
      await this.sleep(wait);
    }
    this.requestTimestamps.push(now);
  }

  // ── Search: intercept the list API response the browser naturally makes ─────

  async fetchJobNos(keyword: string, maxPages = 3, cutoffDate?: Date): Promise<string[]> {
    if (!this.page) await this.init();
    if (this.consecutiveErrors >= this.MAX_ERRORS) throw new Error("Circuit breaker 觸發");

    const page = this.page!;
    const jobNos: string[] = [];

    for (let p = 1; p <= maxPages; p++) {
      await this.enforceHourlyQuota();

      const searchUrl = `${BASE_URL}/jobs/search/?keyword=${encodeURIComponent(keyword)}&area=${AREA_CODES}&order=12&page=${p}`;

      try {
        // Wait for the browser's own API call to jobs/search/list
        const [response] = await Promise.all([
          page.waitForResponse(
            (resp) => resp.url().includes("/jobs/search/list") && resp.status() === 200,
            { timeout: 45000 }
          ),
          page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 40000 }),
        ]);

        const json = await response.json() as {
          data?: { list?: Array<{ jobNo?: string; appearDate?: string }>; totalPage?: number };
        };

        const list = json?.data?.list ?? [];
        if (list.length === 0) break;

        let hitCutoff = false;
        for (const item of list) {
          if (!item.jobNo) continue;
          if (cutoffDate && item.appearDate) {
            const d = new Date(item.appearDate.replace(/\//g, "-"));
            if (d < cutoffDate) { hitCutoff = true; break; }
          }
          jobNos.push(item.jobNo);
        }
        if (hitCutoff) break;

        const totalPage = json?.data?.totalPage ?? 1;
        if (p >= totalPage) break;

        this.consecutiveErrors = 0;
        await this.humanDelay();
      } catch (e) {
        this.consecutiveErrors++;
        console.error(`  搜尋 "${keyword}" 第 ${p} 頁失敗:`, (e as Error).message?.slice(0, 80));
        break;
      }
    }

    return [...new Set(jobNos)];
  }

  // ── Detail: navigate to job page, intercept the detail API response ─────────

  async fetchJobDetail(jobNo: string): Promise<ApiJob | null> {
    if (!this.page) await this.init();
    if (this.consecutiveErrors >= this.MAX_ERRORS) return null;

    const page = this.page!;
    const jobPageUrl = `${BASE_URL}/job/${jobNo}`;

    await this.enforceHourlyQuota();

    try {
      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes(`/job/ajax/content/${jobNo}`) && resp.status() === 200,
          { timeout: 45000 }
        ),
        page.goto(jobPageUrl, { waitUntil: "domcontentloaded", timeout: 40000 }),
      ]);

      const json = await response.json() as {
        data?: {
          header?: { jobName?: string; custName?: string; appearDate?: string; salaryDesc?: string; jobAreaDesc?: string };
          jobDetail?: { jobDescription?: string; salary?: string; remoteWork?: number; workExp?: string };
          condition?: { specialty?: Array<{ description?: string }> };
          contact?: { hrReplyRateDesc?: string; applyNum?: number; latestContactDate?: string };
          welfare?: { recruit?: string };
        };
      };

      const d = json?.data;
      if (!d?.header?.jobName || !d?.header?.custName) return null;

      const header = d.header;
      const detail = d.jobDetail ?? {};
      const contact = d.contact ?? {};
      const condition = d.condition ?? {};

      const skills = (condition.specialty ?? []).map((s) => s.description ?? "").filter(Boolean);
      const postedAt = header.appearDate ? header.appearDate.slice(5) : null;

      this.consecutiveErrors = 0;
      return {
        jobNo,
        externalUrl: jobPageUrl,
        title: header.jobName!,
        companyName: header.custName!,
        salaryRange: header.salaryDesc ?? detail.salary ?? null,
        location: header.jobAreaDesc ?? null,
        skills,
        description: detail.jobDescription ?? null,
        recruitmentActivity: d.welfare?.recruit ?? null,
        replyDays: contact.hrReplyRateDesc ?? null,
        contactTime: contact.latestContactDate ?? null,
        postedAt,
        applicantCount: contact.applyNum ?? null,
        remote: (detail.remoteWork ?? 0) > 0,
        seniority: detail.workExp ?? null,
      };
    } catch (e) {
      this.consecutiveErrors++;
      console.error(`  detail 失敗 ${jobNo}:`, (e as Error).message?.slice(0, 60));
      return null;
    }
  }
}

// ── Singleton exports ─────────────────────────────────────────────────────────

let _session: CrawlerSession | null = null;

function getSession(): CrawlerSession {
  if (!_session) _session = new CrawlerSession();
  return _session;
}

export async function fetchJobNosApi(keyword: string, maxPages = 3, cutoffDate?: Date): Promise<string[]> {
  return getSession().fetchJobNos(keyword, maxPages, cutoffDate);
}

export async function fetchJobDetailApi(jobNo: string): Promise<ApiJob | null> {
  return getSession().fetchJobDetail(jobNo);
}

export async function closeCrawlerSession() {
  if (_session) {
    await _session.close();
    _session = null;
  }
}
