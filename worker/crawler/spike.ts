// T-W1-01 — 104 Crawler Spike
// 目標：驗證 ≥ 50 個台北市/新北市 JD 可被抓取
//       確認地區/徵才積極度/回覆天數/聯絡時間 4 個 selector 穩定可用
//
// 執行：pnpm tsx worker/crawler/spike.ts

import { chromium } from "playwright";
import { buildSearchUrl, buildJobUrl, AREA_CODES } from "../../lib/crawler/selectors";

interface SpikeResult {
  jobNo: string;
  url: string;
  title?: string;
  company?: string;
  location?: string;
  salaryRange?: string;
  seniority?: string;
  remote?: boolean;
  // 4 個新欄位
  recruitmentActivity?: string;
  replyDays?: string;
  contactTime?: string;
  // 狀態
  success: boolean;
  error?: string;
  durationMs: number;
}

// 從 104 搜尋結果頁面直接抽取 job links（不走 JSON API）
async function fetchJobList(
  browserCtx: import("playwright").BrowserContext,
  keyword: string,
  pages = 2
): Promise<string[]> {
  const jobNos: string[] = [];
  const page = await browserCtx.newPage();

  for (let p = 1; p <= pages; p++) {
    const url = buildSearchUrl(keyword, p);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
      // 等待職缺卡片或任何 /job/ 連結出現
      await page.waitForSelector("a[href*='/job/']", { timeout: 10000 }).catch(() => null);
      await sleep(2000);

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
      console.log(`  "${keyword}" page ${p}: ${links.length} 筆`);
    } catch (err) {
      console.warn(`  "${keyword}" page ${p} failed: ${String(err).slice(0, 80)}`);
    }
    await sleep(2000);
  }
  await page.close();
  return jobNos;
}

// 從單一 JD 頁面抓取所有欄位
async function scrapeJob(page: import("playwright").Page, jobNo: string): Promise<SpikeResult> {
  const url = buildJobUrl(jobNo);
  const start = Date.now();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500); // 等 JS render

    const result: SpikeResult = {
      jobNo,
      url,
      success: false,
      durationMs: 0,
    };

    // ── 基本欄位 ──
    result.title = await getText(page, ["h1"]);
    result.company = await getText(page, [
      "a.btn-link.t3",
      ".job-header__title a",
      ".breadcrumb-list__item:nth-child(2)",
    ]);
    result.salaryRange = await getText(page, [
      "p:has-text('月薪')",
      "p:has-text('年薪')",
      "p:has-text('面議')",
    ]);
    result.seniority = await getText(page, [
      "span:has-text('年以上')",
      "span:has-text('年以下')",
      "span:has-text('不拘')",
    ]);

    // ── 地區 ──
    result.location = await getText(page, [
      "span:has-text('台北')",
      "span:has-text('新北')",
    ]);

    // ── 遠端 ──
    const remoteText = await getText(page, ["span:has-text('遠端')"]);
    result.remote = !!remoteText?.includes("遠端");

    // ── 4 個新欄位 ── (parsed from .job-header__title block)
    const headerText = await getText(page, [".job-header__title"]);
    if (headerText) {
      // 徵才積極度 (e.g. "徵才積極度：活躍")
      const actMatch = headerText.match(/徵才積極度[：:]\s*(\S+)/);
      result.recruitmentActivity = actMatch ? actMatch[1] : undefined;

      // 聯絡過求職者 (e.g. "14 小時前聯絡過求職者" or "3 天前聯絡過求職者")
      const contactMatch = headerText.match(/(\d+\s*[小時天]+前聯絡過求職者)/);
      result.contactTime = contactMatch ? contactMatch[1] : undefined;
    }

    // 回覆天數 — displayed in different section
    result.replyDays = await getText(page, [
      "p:has-text('天內回覆')",
      "span:has-text('天內回覆')",
      "div:has-text('天內回覆')",
    ]);

    result.success = !!result.title && !!result.company;
    result.durationMs = Date.now() - start;
    return result;

  } catch (err) {
    return {
      jobNo,
      url,
      success: false,
      error: String(err),
      durationMs: Date.now() - start,
    };
  }
}

// 嘗試多個 selector，回傳第一個有值的結果
async function getText(page: import("playwright").Page, selectors: string[]): Promise<string | undefined> {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: 1500 }).catch(() => false);
      if (visible) {
        const text = (await el.innerText()).trim();
        if (text) return text;
      }
    } catch {
      // 繼續嘗試下一個 selector
    }
  }
  return undefined;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 T-W1-01 104 Crawler Spike 開始\n");
  console.log(`地區篩選: 台北市 (${AREA_CODES["台北市"]}) + 新北市 (${AREA_CODES["新北市"]})`);

  // Step 1 + 2: 共用同一個 browser context
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--headless=new",
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "zh-TW",
    extraHTTPHeaders: { "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8" },
  });

  // Step 1: 取得 job list
  console.log("\n── Step 1: 搜尋職缺清單 ──");
  const keywords = ["軟體工程師", "前端工程師", "後端工程師", "專案管理", "數據分析"];
  let allJobNos: string[] = [];
  for (const kw of keywords) {
    const nos = await fetchJobList(context, kw, 2);
    allJobNos.push(...nos);
  }
  allJobNos = [...new Set(allJobNos)];
  console.log(`\n總計取得 ${allJobNos.length} 個不重複職缺，取前 55 個進行 spike`);
  const target = allJobNos.slice(0, 55);

  // Step 2: Playwright 爬取每個 JD 詳細頁
  console.log("\n── Step 2: 逐一爬取 JD 詳細頁 ──");
  const page = await context.newPage();

  const results: SpikeResult[] = [];
  for (let i = 0; i < target.length; i++) {
    const jobNo = target[i];
    process.stdout.write(`  [${i + 1}/${target.length}] ${jobNo} ... `);
    const result = await scrapeJob(page, jobNo);
    results.push(result);
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${result.title ?? "(no title)"} | ${result.durationMs}ms`);
    // rate limit: 5 秒/JD
    if (i < target.length - 1) await sleep(5000);
  }

  await browser.close();

  // Step 3: 報告
  console.log("\n── Step 3: Spike Report ──");
  const success = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const avgMs = results.reduce((s, r) => s + r.durationMs, 0) / results.length;

  console.log(`\n📊 成功率: ${success.length}/${results.length} = ${((success.length / results.length) * 100).toFixed(1)}%`);
  console.log(`⏱  平均耗時: ${avgMs.toFixed(0)}ms (限制 ≤ 5000ms)`);

  // 新欄位命中率
  const fields = ["location", "recruitmentActivity", "replyDays", "contactTime"] as const;
  console.log("\n📍 新欄位 Selector 命中率（成功的 JD 中）:");
  for (const field of fields) {
    const hit = success.filter((r) => r[field]).length;
    const pct = success.length > 0 ? ((hit / success.length) * 100).toFixed(1) : "0";
    const icon = Number(pct) >= 50 ? "✅" : "⚠️ ";
    console.log(`  ${icon} ${field.padEnd(22)}: ${hit}/${success.length} (${pct}%)`);
  }

  // 範例輸出
  if (success.length > 0) {
    const sample = success[0];
    console.log("\n📄 範例 JD:");
    console.log(`  title:               ${sample.title}`);
    console.log(`  company:             ${sample.company}`);
    console.log(`  location:            ${sample.location ?? "—"}`);
    console.log(`  salary:              ${sample.salaryRange ?? "—"}`);
    console.log(`  recruitmentActivity: ${sample.recruitmentActivity ?? "—"}`);
    console.log(`  replyDays:           ${sample.replyDays ?? "—"}`);
    console.log(`  contactTime:         ${sample.contactTime ?? "—"}`);
  }

  if (failed.length > 0) {
    console.log(`\n❌ 失敗清單 (${failed.length} 個):`);
    failed.slice(0, 5).forEach((r) => console.log(`  ${r.jobNo}: ${r.error?.slice(0, 80)}`));
  }

  // AC 判定
  console.log("\n── AC 判定 ──");
  const successRate = success.length / results.length;
  const acSuccessRate = successRate >= 0.9;
  const acAvgTime = avgMs <= 5000;
  console.log(`${acSuccessRate ? "✅" : "❌"} 成功率 ≥ 90%: ${(successRate * 100).toFixed(1)}%`);
  console.log(`${acAvgTime ? "✅" : "❌"} 平均耗時 ≤ 5s: ${avgMs.toFixed(0)}ms`);

  if (!acSuccessRate || !acAvgTime) {
    console.log("\n⚠️  AC 未全部通過，需調整 selector 或改用備案（Cake/Yourator）");
    process.exit(1);
  }
  console.log("\n🎉 Spike 通過！可進入 T-W2-05 production 化");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
