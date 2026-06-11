import { config } from "dotenv";
config({ path: ".env.local" });
import { chromium } from "playwright";
import { scrapeJob } from "../../lib/crawler/crawl";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" });
  const page = await context.newPage();
  try {
    const result = await scrapeJob(page, "7hw0o");
    console.log("title:", result?.title);
    console.log("description length:", result?.description?.length ?? 0);
    console.log("description preview:", result?.description?.slice(0, 200));
  } catch (e) {
    console.error("error:", e);
  }
  await browser.close();
}
main().catch(console.error);
