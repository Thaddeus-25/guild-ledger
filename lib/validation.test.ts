import { describe, expect, it } from "vitest";
import { createStarterData } from "./starterData";
import { validateCategoryInput, type CategoryInput } from "./validation";

const pouches = createStarterData().categories;
const petsInput: CategoryInput = { name: "Pets", type: "expense", icon: "heart", limit: "" };

describe("validateCategoryInput", () => {
  it("accepts a new pouch with no limit", () => {
    expect(validateCategoryInput(petsInput, pouches)).toEqual({
      ok: true,
      value: { name: "Pets", type: "expense", icon: "heart", monthlyLimitCents: undefined },
    });
  });

  it("trims spaces from the name", () => {
    const result = validateCategoryInput({ ...petsInput, name: "  Pets  " }, pouches);
    expect(result.ok && result.value.name).toBe("Pets");
  });

  it("needs a name of 30 characters or fewer", () => {
    expect(validateCategoryInput({ ...petsInput, name: "   " }, pouches)).toEqual({
      ok: false,
      errors: { name: "Give the pouch a name." },
    });
    expect(validateCategoryInput({ ...petsInput, name: "x".repeat(31) }, pouches)).toEqual({
      ok: false,
      errors: { name: "Keep the name to 30 characters or fewer." },
    });
  });

  it("rejects a name already used by a pouch of the same type, ignoring capitals", () => {
    expect(validateCategoryInput({ ...petsInput, name: "provisions" }, pouches)).toEqual({
      ok: false,
      errors: { name: "You already have a pouch called Provisions." },
    });
  });

  it("lets a pouch keep its own name when edited", () => {
    const result = validateCategoryInput({ ...petsInput, name: "Provisions" }, pouches, "provisions");
    expect(result.ok).toBe(true);
  });

  it("allows the same name for the other type", () => {
    const result = validateCategoryInput({ ...petsInput, name: "Provisions", type: "income" }, pouches);
    expect(result.ok).toBe(true);
  });

  it("turns the limit into cents, and explains a bad limit", () => {
    const withLimit = validateCategoryInput({ ...petsInput, limit: "200" }, pouches);
    expect(withLimit.ok && withLimit.value.monthlyLimitCents).toBe(20000);

    expect(validateCategoryInput({ ...petsInput, limit: "abc" }, pouches)).toEqual({
      ok: false,
      errors: { limit: "Use numbers only, like 12.50." },
    });
  });

  it("never gives income pouches a limit", () => {
    const result = validateCategoryInput({ ...petsInput, type: "income", limit: "200" }, pouches);
    expect(result.ok && result.value.monthlyLimitCents).toBeUndefined();
  });

  it("reports every problem at once", () => {
    const result = validateCategoryInput({ ...petsInput, name: "", limit: "abc" }, pouches);
    expect(result).toEqual({
      ok: false,
      errors: { name: "Give the pouch a name.", limit: "Use numbers only, like 12.50." },
    });
  });
});
