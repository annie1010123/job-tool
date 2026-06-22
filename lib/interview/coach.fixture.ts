// Recorded LLM 回應 fixture，供 coach 測試使用（不打真 API）。

// 好答案：grade good，improvements 可空。包 ```json fence 以同時測試清理。
export const GOOD_FIXTURE = `\`\`\`json
{
  "grade": "good",
  "summary": "定位清楚、有量化成果，動機也具體。",
  "strengths": ["有量化成果（70%→95%）", "動機點名了具體產品"],
  "improvements": [],
  "structure": [
    {"label": "定位", "ok": true},
    {"label": "成果", "ok": true},
    {"label": "動機", "ok": true}
  ]
}
\`\`\``;

// 空泛答案：grade needs_improvement，improvements 非空且每點有 example。
export const VAGUE_FIXTURE = `{
  "grade": "needs_improvement",
  "summary": "方向對了，但太空泛、缺少具體事例與數字。",
  "strengths": ["有表達學習意願"],
  "improvements": [
    {
      "issue": "「我很有責任感」沒有事例佐證",
      "suggestion": "用一個具體事件證明，並帶出結果",
      "example": "「上次活動廠商臨時退出，我重新盤點資源、改談置換合作，最後如期上線、觸及超標 ◯◯%。」"
    },
    {
      "issue": "結尾動機過於通用",
      "suggestion": "點名你欣賞這家公司的哪個產品或做法",
      "example": "「我特別想加入你們，是因為〔某產品/某 campaign〕。」"
    }
  ],
  "structure": [
    {"label": "情境", "ok": true},
    {"label": "任務", "ok": true},
    {"label": "行動", "ok": false},
    {"label": "結果", "ok": false}
  ]
}`;
