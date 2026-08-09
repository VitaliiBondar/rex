import { describe, it, expect } from "vitest";
import { fullNameGenitive } from "./documents";

describe("fullNameGenitive", () => {
  it("прізвище у родовому відмінку — капслоком, ім'я й по батькові — ні", async () => {
    const result = await fullNameGenitive("Хорхулу Роман Ігорович", "MALE");
    expect(result).toBe("ХОРХУЛУ Романа Ігоровича");
  });

  it("жіночий рід, без по батькові", async () => {
    const result = await fullNameGenitive("Іванова Марія", "FEMALE");
    expect(result).toBe("ІВАНОВОЇ Марії");
  });
});
