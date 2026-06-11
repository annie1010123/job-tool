import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import Groq from "groq-sdk";

export interface ParsedJd {
  companyName: string;
  jobTitle: string;
  jdContent: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── 104 via Playwright (intercept ajax/content response) ─────────────────────

function extract104JobNo(url: string): string | null {
  const m = url.match(/104\.com\.tw\/job\/([a-zA-Z0-9]+)/);
  return m?.[1] ?? null;
}

async function parse104(jobNo: string): Promise<ParsedJd | null> {
  const { chromium } = await import("playwright");

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: UA,
      locale: "zh-TW",
      timezoneId: "Asia/Taipei",
    });

    // Stealth
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    const page = await context.newPage();
    const jobPageUrl = `https://www.104.com.tw/job/${jobNo}`;

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes(`/api/jobs/${jobNo}`) && resp.status() === 200,
        { timeout: 30000 }
      ),
      page.goto(jobPageUrl, { waitUntil: "domcontentloaded", timeout: 30000 }),
    ]);

    const json = await response.json() as {
      data?: {
        header?: { jobName?: string; custName?: string };
        jobDetail?: { jobDescription?: string };
        condition?: { specialty?: Array<{ description?: string }> };
      };
    };

    const d = json?.data;
    const jobName = d?.header?.jobName;
    const custName = d?.header?.custName;
    if (!jobName || !custName) return null;

    const description = d?.jobDetail?.jobDescription ?? "";
    const skills = (d?.condition?.specialty ?? [])
      .map((s) => s.description ?? "")
      .filter(Boolean)
      .join("、");

    const jdContent = [description, skills ? `技能要求：${skills}` : ""]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2000);

    return { companyName: custName, jobTitle: jobName, jdContent };
  } catch {
    return null;
  } finally {
    await browser?.close();
  }
}

// ── Generic fetch + Groq fallback ─────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function parseGeneric(url: string): Promise<ParsedJd | null> {
  if (!process.env.GROQ_API_KEY) return null;

  let pageText: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8", Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    pageText = htmlToText(await res.text()).slice(0, 6000);
  } catch {
    return null;
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `從以下網頁文字中抽取職缺資訊，只輸出 JSON，不要任何說明或 markdown。\n\n{"companyName":"公司名稱","jobTitle":"職缺名稱","jdContent":"職缺描述摘要（200字以內，繁體中文）"}\n\n若無法辨識，填空字串。\n\n網頁文字：\n${pageText}`,
      }],
    });
    const text = resp.choices[0].message.content ?? "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim()) as ParsedJd;
  } catch {
    return null;
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  const jobNo = extract104JobNo(url);
  if (jobNo) {
    const parsed = await parse104(jobNo);
    if (parsed) return NextResponse.json({ parsed, source: "104" });
  }

  const parsed = await parseGeneric(url);
  if (parsed) return NextResponse.json({ parsed, source: "generic" });

  return NextResponse.json({ error: "fetch_failed" }, { status: 422 });
}
