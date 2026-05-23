import { GoogleGenAI } from "@google/genai";
import type { ScrapedJob } from "../crawler/crawl";

export async function embedJd(job: ScrapedJob): Promise<number[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const parts = [
    `職稱：${job.title}`,
    `公司：${job.companyName}`,
    job.salaryRange ? `薪資：${job.salaryRange}` : null,
    job.location ? `地點：${job.location}` : null,
    job.seniority ? `資歷：${job.seniority}` : null,
    job.skills.length > 0 ? `技能：${job.skills.join("、")}` : null,
    job.remote ? "可遠端工作" : null,
    job.description ? `描述：${job.description.slice(0, 500)}` : null,
  ];

  const text = parts.filter(Boolean).join("\n");

  const resp = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: [{ role: "user", parts: [{ text }] }],
    config: { outputDimensionality: 768 },
  });

  return resp.embeddings?.[0]?.values ?? [];
}
