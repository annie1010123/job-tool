export type RoleCategory = "產品/專案管理" | "行銷" | "UIUX 設計" | "工程" | "其他";

const RULES: Array<{ category: RoleCategory; keywords: string[] }> = [
  {
    category: "產品/專案管理",
    keywords: ["pm", "產品", "專案", "product", "project"],
  },
  {
    category: "行銷",
    keywords: ["行銷", "marketing", "社群", "內容", "品牌", "growth"],
  },
  {
    category: "UIUX 設計",
    keywords: ["設計", "ui", "ux", "design"],
  },
  {
    category: "工程",
    keywords: ["工程師", "engineer", "developer", "前端", "後端", "資料"],
  },
];

export function inferRoleCategory(title: string): RoleCategory {
  const lower = title.toLowerCase();
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return rule.category;
      }
    }
  }
  return "其他";
}
