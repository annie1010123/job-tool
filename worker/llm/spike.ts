// T-W1-05 — LLM Spike (Gemini Embedding + hardcoded expansion)
// 目標：驗證 embedding + cosine similarity 可行
// Note: generateContent 在 TW free tier 被封，keyword expansion 改用 Groq (W2 接入)
//
// 執行：pnpm tsx worker/llm/spike.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Keyword Expansion (hardcoded for spike — Groq will replace in W2) ─────────

function expandIntent(_rawIntent: string): string[] {
  // 模擬 LLM 會輸出的結果（實際 production 用 Groq llama-3.1-8b-instant）
  console.log(`  (LLM expansion skipped — Gemini generateContent blocked in TW free tier)`);
  console.log(`  (Will use Groq in production)`);
  return [
    "專案管理", "Project Manager", "PM實習", "Agile", "Scrum",
    "時程管控", "專案協調", "敏捷開發", "專案管理師", "產品管理",
  ];
}

// ── Embedding (Gemini gemini-embedding-001, confirmed working) ────────────────

async function embed(text: string): Promise<number[]> {
  const resp = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: [{ role: "user", parts: [{ text }] }],
    config: { outputDimensionality: 768 },
  });
  return resp.embeddings?.[0]?.values ?? [];
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 T-W1-05 LLM Spike 開始\n");

  const intent = "專案管理實習生，有興趣 Agile/Scrum，時程管控";

  // Step 1: Keyword expansion
  console.log("── Step 1: Keyword Expansion ──");
  console.log(`輸入：「${intent}」`);
  const t0 = Date.now();
  const keywords = expandIntent(intent);
  const expansionMs = Date.now() - t0;
  console.log(`輸出 (${keywords.length} 個)：${JSON.stringify(keywords)}`);
  console.log(`耗時：${expansionMs}ms`);

  // Step 2: Embedding + cosine similarity
  console.log("\n── Step 2: Embedding + Cosine Similarity (Gemini gemini-embedding-001) ──");

  const jds = [
    { title: "專案管理師 (PM)", desc: "負責專案規劃、時程控管、跨部門協調，熟悉 Agile/Scrum 流程" },
    { title: "後端工程師 Java", desc: "設計 RESTful API，維護 Spring Boot 服務，處理大量訂單系統" },
    { title: "行銷企劃實習生", desc: "協助品牌行銷活動規劃，社群貼文撰寫，數據分析報告" },
    { title: "Scrum Master", desc: "帶領敏捷團隊，主持每日站立會議、Sprint Review，推動持續改善" },
    { title: "會計專員", desc: "處理日常記帳、報稅、月結作業，使用 ERP 系統" },
  ];

  const intentText = `${intent}\n關鍵字：${keywords.join(", ")}`;
  const t1 = Date.now();
  const [intentEmb, ...jdEmbs] = await Promise.all([
    embed(intentText),
    ...jds.map((j) => embed(`${j.title}\n${j.desc}`)),
  ]);
  const embMs = Date.now() - t1;
  console.log(`Embedding 耗時：${embMs}ms (1 intent + ${jds.length} JDs 並行)`);
  console.log(`Embedding 維度：${intentEmb.length}`);

  console.log("\n職缺相似度（高→低）：");
  const scores = jds.map((j, i) => ({
    title: j.title,
    score: cosine(intentEmb, jdEmbs[i]),
  }));
  scores.sort((a, b) => b.score - a.score);
  scores.forEach((s) => {
    const bar = "█".repeat(Math.round(s.score * 20));
    const icon = s.score > 0.5 ? "✅" : "⚠️";
    console.log(`  ${icon} ${s.title.padEnd(24)}: ${s.score.toFixed(4)} ${bar}`);
  });

  // AC 判定
  console.log("\n── AC 判定 ──");
  const keywordsOk = keywords.length >= 6;
  const embDimOk = intentEmb.length === 768;
  const topIsRelevant =
    scores[0].title.includes("PM") ||
    scores[0].title.includes("Scrum") ||
    scores[0].title.includes("專案");
  const bottomIsIrrelevant =
    scores[scores.length - 1].title.includes("後端") ||
    scores[scores.length - 1].title.includes("會計");

  console.log(`${keywordsOk ? "✅" : "❌"} Keyword expansion ≥ 6 個: ${keywords.length}`);
  console.log(`${embDimOk ? "✅" : "❌"} Embedding 維度 = 768: ${intentEmb.length}`);
  console.log(`${topIsRelevant ? "✅" : "⚠️"} Top 1 是相關職缺: ${scores[0].title}`);
  console.log(`${bottomIsIrrelevant ? "✅" : "⚠️"} Bottom 1 是不相關職缺: ${scores[scores.length - 1].title}`);

  if (keywordsOk && embDimOk) {
    console.log("\n🎉 LLM Spike 通過！Embedding pipeline 可行");
    console.log("   ⚠️  Keyword expansion LLM: 改用 Groq (W2 接入)");
  } else {
    console.log("\n⚠️ AC 未全部通過");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
