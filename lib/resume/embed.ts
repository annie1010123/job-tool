import { GoogleGenAI } from "@google/genai";
import type { ParsedResume } from "./parse";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function embedResume(rawText: string, parsed: ParsedResume): Promise<number[]> {
  const text = [
    parsed.title ?? "",
    parsed.seniority ?? "",
    parsed.industry ?? "",
    `技能：${parsed.skills.join(", ")}`,
    `經歷：${parsed.yearsExperience ?? 0} 年`,
    rawText.slice(0, 2000),
  ]
    .filter(Boolean)
    .join("\n");

  const resp = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: [{ role: "user", parts: [{ text }] }],
    config: { outputDimensionality: 768 },
  });
  return resp.embeddings?.[0]?.values ?? [];
}

export async function embedText(text: string): Promise<number[]> {
  const resp = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: [{ role: "user", parts: [{ text }] }],
    config: { outputDimensionality: 768 },
  });
  return resp.embeddings?.[0]?.values ?? [];
}
