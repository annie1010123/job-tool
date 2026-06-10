import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "playwright";

const jobNo = "8486f";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "zh-TW",
  });
  const page = await context.newPage();

  let captured: unknown = null;

  page.on("response", async (resp) => {
    if (resp.url().includes(`/job/ajax/content/${jobNo}`) || resp.url().includes(`/job/${jobNo}`)) {
      console.log("📡 URL:", resp.url(), "status:", resp.status());
      try {
        const text = await resp.text();
        console.log("first 500 chars:", text.slice(0, 500));
        captured = JSON.parse(text);
      } catch {}
    }
  });

  console.log("navigating to job page...");
  await page.goto(`https://www.104.com.tw/job/${jobNo}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  if (captured) {
    const d = (captured as { data?: Record<string, unknown> })?.data ?? {};
    console.log("\n=== data keys:", Object.keys(d));
    const jobDetail = (d.jobDetail ?? d.job ?? {}) as Record<string, unknown>;
    console.log("jobDetail keys:", Object.keys(jobDetail));
    const desc = (jobDetail.jobDescription ?? jobDetail.description ?? "") as string;
    console.log("description length:", desc?.length ?? 0);
    console.log("description preview:", desc?.slice(0, 200) ?? "NULL");
  } else {
    console.log("no API response captured");
    // Try DOM
    const domDesc = await page.$eval("div.job-description, .job-desc", (el) => el.textContent ?? "").catch(() => "");
    console.log("DOM description:", domDesc.slice(0, 200));
  }

  await browser.close();
}
main().catch(console.error);
