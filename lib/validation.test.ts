import { describe, expect, it } from "vitest";
import { createStarterData } from "./starterData";
import {
  validateCategoryInput,
  validateTransactionInput,
  type CategoryInput,
  type TransactionInput,
} from "./validation";

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

const breadInput: TransactionInput = {
  type: "expense",
  amount: "12.50",
  date: "2026-10-29",
  categoryId: "provisions",
  note: "",
};

describe("validateTransactionInput", () => {
  it("accepts a normal entry and stores the amount as cents", () => {
    expect(validateTransactionInput(breadInput, pouches)).toEqual({
      ok: true,
      value: {
        type: "expense",
        amountCents: 1250,
        date: "2026-10-29",
        categoryId: "provisions",
        note: undefined,
      },
    });
  });

  it("trims the note", () => {
    const result = validateTransactionInput({ ...breadInput, note: "  Bread  " }, pouches);
    expect(result.ok && result.value.note).toBe("Bread");
  });

  it("explains a bad amount", () => {
    expect(validateTransactionInput({ ...breadInput, amount: "" }, pouches)).toEqual({
      ok: false,
      errors: { amount: "Enter an amount." },
    });
  });

  it("needs a real calendar date", () => {
    for (const date of ["", "2026-02-30", "soon"]) {
      expect(validateTransactionInput({ ...breadInput, date }, pouches)).toEqual({
        ok: false,
        errors: { date: "Pick a date." },
      });
    }
  });

  it("needs a pouch that exists", () => {
    for (const categoryId of ["", "dragon-hoard"]) {
      expect(validateTransactionInput({ ...breadInput, categoryId }, pouches)).toEqual({
        ok: false,
        errors: { categoryId: "Choose a pouch." },
      });
    }
  });

  it("rejects an income entry in an expense pouch", () => {
    expect(validateTransactionInput({ ...breadInput, type: "income" }, pouches)).toEqual({
      ok: false,
      errors: { categoryId: "Choose a pouch." },
    });
  });

  it("keeps notes to 200 characters", () => {
    expect(validateTransactionInput({ ...breadInput, note: "x".repeat(200) }, pouches).ok).toBe(true);
    expect(validateTransactionInput({ ...breadInput, note: "x".repeat(201) }, pouches)).toEqual({
      ok: false,
      errors: { note: "Keep the note to 200 characters or fewer." },
    });
  });

  it("reports every problem at once", () => {
    const result = validateTransactionInput(
      { type: "expense", amount: "abc", date: "", categoryId: "", note: "" },
      pouches,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        amount: "Use numbers only, like 12.50.",
        date: "Pick a date.",
        categoryId: "Choose a pouch.",
      },
    });
  });
});
