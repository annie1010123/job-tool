import type { BrowserContext, Page } from "playwright";
import { buildSearchUrl, buildJobUrl } from "./selectors";

export interface ScrapedJob {
  jobNo: string;
  externalUrl: string;
  title: string;
  companyName: string;
  salaryRange?: string;
  seniority?: string;
  location?: string;
  remote: boolean;
  skills: string[];
  description?: string;
  recruitmentActivity?: string;
  replyDays?: string;
  contactTime?: string;
  postedAt?: string;
  applicantCount?: number;
}

export async function fetchJobNos(
  context: BrowserContext,
  keyword: string,
  pages = 3
): Promise<string[]> {
  const jobNos: string[] = [];
  const page = await context.newPage();

  for (let p = 1; p <= pages; p++) {
    const url = buildSearchUrl(keyword, p);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForSelector("a[href*='/job/']", { timeout: 10000 }).catch(() => null);
      await sleep(1500);

      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll("a[href*='/job/']");
        const nos: string[] = [];
        anchors.forEach((a) => {
          const href = (a as HTMLAnchorElement).href;
          const match = href.match(/\/job\/([a-zA-Z0-9]+)/);
          if (match && match[1].length > 4) nos.push(match[1]);
        });
        return [...new Set(nos)];
      });
      jobNos.push(...links);
    } catch {
      // skip failed pages
    }
    await sleep(2000);
  }

  await page.close();
  return [...new Set(jobNos)];
}

export async function scrapeJob(page: Page, jobNo: string): Promise<ScrapedJob | null> {
  const url = buildJobUrl(jobNo);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500);

    const title = await getText(page, ["h1"]);
    const companyName = await getText(page, [
      "a.btn-link.t3",
      ".job-header__title a",
      ".breadcrumb-list__item:nth-child(2)",
    ]);

    if (!title || !companyName) return null;

    const salaryRange = await getText(page, [
      "p:has-text('月薪')",
      "p:has-text('年薪')",
      "p:has-text('面議')",
    ]);
    const seniority = await getText(page, [
      "span:has-text('年以上')",
      "span:has-text('年以下')",
      "span:has-text('不拘')",
    ]);
    const location = await getText(page, [
      "span:has-text('台北')",
      "span:has-text('新北')",
    ]);
    const remoteText = await getText(page, ["span:has-text('遠端')"]);
    const remote = !!remoteText?.includes("遠端");

    const skills = await page
      .$$eval("div.b-tags--top a, ul.job-requirement-table li", (els) =>
        els.map((e) => e.textContent?.trim() ?? "").filter(Boolean).slice(0, 20)
      )
      .catch(() => [] as string[]);

    const description = await getText(page, ["div.job-description", "section.content"]);

    const headerText = await getText(page, [".job-header__title"]);
    let recruitmentActivity: string | undefined;
    let contactTime: string | undefined;
    if (headerText) {
      const actMatch = headerText.match(/徵才積極度[：:]\s*(\S+)/);
      recruitmentActivity = actMatch?.[1];
      const contactMatch = headerText.match(/(\d+\s*[小時天]+前聯絡過求職者)/);
      contactTime = contactMatch?.[1];
    }

    const replyDays = await getText(page, [
      "p:has-text('天內回覆')",
      "span:has-text('天內回覆')",
      "div:has-text('天內回覆')",
    ]);

    // 更新日期（e.g. "05/18 更新"）
    const postedRaw = await getText(page, [
      "span:has-text('更新')",
      "p:has-text('更新')",
      "time",
    ]);
    const postedAt = postedRaw?.match(/\d{2}\/\d{2}/)?.[0];

    // 應徵人數（e.g. "已有 3 人應徵"）
    const applicantRaw = await getText(page, [
      "p:has-text('人應徵')",
      "span:has-text('人應徵')",
      "div:has-text('人應徵')",
    ]);
    const applicantMatch = applicantRaw?.match(/(\d+)\s*人應徵/);
    const applicantCount = applicantMatch ? parseInt(applicantMatch[1]) : undefined;

    return {
      jobNo,
      externalUrl: url,
      title,
      companyName,
      salaryRange,
      seniority,
      location,
      remote,
      skills,
      description,
      recruitmentActivity,
      replyDays,
      contactTime,
      postedAt,
      applicantCount,
    };
  } catch {
    return null;
  }
}

async function getText(page: Page, selectors: string[]): Promise<string | undefined> {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: 1500 }).catch(() => false);
      if (visible) {
        const text = (await el.innerText()).trim();
        if (text) return text;
      }
    } catch {
      // try next selector
    }
  }
  return undefined;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
