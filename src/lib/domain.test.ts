import { describe, it, expect } from "vitest";
import { requiresUnitAssignment } from "./domain";

describe("requiresUnitAssignment", () => {
  it("вимагає підрозділ при виході з UNIT_SEARCH у активний статус", () => {
    expect(requiresUnitAssignment("UNIT_SEARCH", "COLLECTING_DOCS")).toBe(true);
    expect(requiresUnitAssignment("UNIT_SEARCH", "MEDICAL_COMMISSION")).toBe(true);
    expect(requiresUnitAssignment("UNIT_SEARCH", "CONTRACT_SIGNING")).toBe(true);
  });

  it("вимагає підрозділ при зарахуванні напряму з UNIT_SEARCH", () => {
    expect(requiresUnitAssignment("UNIT_SEARCH", "ENLISTED")).toBe(true);
  });

  it("НЕ вимагає підрозділ для відмов з UNIT_SEARCH", () => {
    expect(requiresUnitAssignment("UNIT_SEARCH", "REJECTED_BY_US")).toBe(false);
    expect(requiresUnitAssignment("UNIT_SEARCH", "SELF_WITHDREW")).toBe(false);
  });

  it("НЕ вимагає підрозділ для переходів, що не починаються з UNIT_SEARCH", () => {
    expect(requiresUnitAssignment("COLLECTING_DOCS", "MEDICAL_COMMISSION")).toBe(false);
    expect(requiresUnitAssignment("MEDICAL_COMMISSION", "CONTRACT_SIGNING")).toBe(false);
    expect(requiresUnitAssignment("CONTRACT_SIGNING", "ENLISTED")).toBe(false);
    expect(requiresUnitAssignment("COLLECTING_DOCS", "REJECTED_BY_US")).toBe(false);
  });
});
