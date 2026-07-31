import { describe, it, expect } from "vitest";
import { nextMonth, previousMonth, monthsBetween } from "./format";

describe("nextMonth", () => {
  it("переходить на наступний місяць у межах року", () => {
    expect(nextMonth("2026-07")).toBe("2026-08");
  });

  it("коректно переходить через межу року (грудень → січень)", () => {
    expect(nextMonth("2026-12")).toBe("2027-01");
  });
});

describe("previousMonth", () => {
  it("переходить на попередній місяць у межах року", () => {
    expect(previousMonth("2026-07")).toBe("2026-06");
  });

  it("коректно переходить через межу року (січень → грудень)", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
  });
});

describe("monthsBetween", () => {
  it("повертає інклюзивний список місяців від start до end", () => {
    expect(monthsBetween("2026-05", "2026-07")).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  it("коректно переходить через межу року", () => {
    expect(monthsBetween("2025-11", "2026-01")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });

  it("start === end — список з одного місяця", () => {
    expect(monthsBetween("2026-07", "2026-07")).toEqual(["2026-07"]);
  });
});
