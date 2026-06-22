import { describe, it, expect } from "vitest";
import { CORE_QUESTIONS } from "./core-questions";

describe("CORE_QUESTIONS", () => {
  it("每題都有唯一 coreKey 與必要欄位", () => {
    expect(CORE_QUESTIONS.length).toBeGreaterThanOrEqual(6);
    const keys = CORE_QUESTIONS.map((q) => q.coreKey);
    expect(new Set(keys).size).toBe(keys.length); // 唯一
    for (const q of CORE_QUESTIONS) {
      expect(q.coreKey).toMatch(/^[a-z_]+$/);
      expect(q.question.length).toBeGreaterThan(4);
      expect(q.hint.length).toBeGreaterThan(4);
      expect(q.defaultVersions.length).toBeGreaterThan(0);
    }
  });

  it("自我介紹預設兩個版本（30秒/1分鐘）", () => {
    const intro = CORE_QUESTIONS.find((q) => q.coreKey === "self_intro");
    expect(intro?.defaultVersions).toEqual(["30秒", "1分鐘"]);
  });
});
