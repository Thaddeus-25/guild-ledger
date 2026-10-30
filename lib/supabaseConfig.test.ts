import { describe, expect, it } from "vitest";
import { readSupabaseConfig } from "./supabaseConfig";

describe("readSupabaseConfig", () => {
  it("returns null when either value is missing or blank", () => {
    expect(readSupabaseConfig(undefined, "k")).toBeNull();
    expect(readSupabaseConfig("https://x.supabase.co", "")).toBeNull();
    expect(readSupabaseConfig("  ", "k")).toBeNull();
  });

  it("trims both values", () => {
    expect(readSupabaseConfig(" https://x.supabase.co ", " k ")).toEqual({
      url: "https://x.supabase.co",
      key: "k",
    });
  });
});
