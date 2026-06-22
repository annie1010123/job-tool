import { describe, it, expect } from "vitest";
import { parseCoachJson } from "./coach";
import { GOOD_FIXTURE, VAGUE_FIXTURE } from "./coach.fixture";

describe("parseCoachJson", () => {
  it("好答案 → grade good（並能清理 ```json fence）", () => {
    const r = parseCoachJson(GOOD_FIXTURE);
    expect(r.grade).toBe("good");
    expect(r.strengths.length).toBeGreaterThan(0);
  });

  it("空泛答案 → grade needs_improvement，improvements 非空且每點有 example", () => {
    const r = parseCoachJson(VAGUE_FIXTURE);
    expect(r.grade).toBe("needs_improvement");
    expect(r.improvements.length).toBeGreaterThan(0);
    for (const i of r.improvements) {
      expect(i.issue.length).toBeGreaterThan(0);
      expect(i.example.length).toBeGreaterThan(0);
    }
  });

  it("壞 JSON → 丟出錯誤（呼叫端會 fallback）", () => {
    expect(() => parseCoachJson("not json at all")).toThrow();
  });

  it("缺欄位 → schema 驗證丟錯", () => {
    expect(() => parseCoachJson('{"grade":"good"}')).toThrow();
  });
});
