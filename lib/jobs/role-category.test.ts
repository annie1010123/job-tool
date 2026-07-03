import { describe, it, expect } from "vitest";
import { inferRoleCategory } from "./role-category";

describe("inferRoleCategory", () => {
  it("PM 職稱 → 產品/專案管理", () => {
    expect(inferRoleCategory("產品經理 PM")).toBe("產品/專案管理");
  });

  it("英文 Product Manager → 產品/專案管理", () => {
    expect(inferRoleCategory("Product Manager")).toBe("產品/專案管理");
  });

  it("行銷職稱 → 行銷", () => {
    expect(inferRoleCategory("數位行銷專員")).toBe("行銷");
  });

  it("UX Designer → UIUX 設計", () => {
    expect(inferRoleCategory("UX Designer")).toBe("UIUX 設計");
  });

  it("前端工程師 → 工程", () => {
    expect(inferRoleCategory("前端工程師")).toBe("工程");
  });

  it("無關鍵字 → 其他", () => {
    expect(inferRoleCategory("業務助理")).toBe("其他");
  });

  it("大小寫不敏感：ENGINEER → 工程", () => {
    expect(inferRoleCategory("ENGINEER")).toBe("工程");
  });
});
