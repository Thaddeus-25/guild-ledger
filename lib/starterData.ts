import type { SaveFile } from "./types";

// What a brand-new ledger looks like. Starter pouches use readable ids;
// pouches the user creates later get random ids.
export function createStarterData(): SaveFile {
  return {
    version: 1,
    categories: [
      { id: "wages", name: "Wages", type: "income", icon: "coin" },
      { id: "other-income", name: "Other Income", type: "income", icon: "gem" },
      { id: "provisions", name: "Provisions", type: "expense", icon: "bread" },
      { id: "lodging", name: "Lodging", type: "expense", icon: "house" },
      { id: "travel", name: "Travel", type: "expense", icon: "boot" },
      { id: "tavern", name: "Tavern", type: "expense", icon: "mug" },
      { id: "supplies", name: "Supplies", type: "expense", icon: "potion" },
      { id: "other", name: "Other", type: "expense", icon: "scroll" },
    ],
    transactions: [],
    logbookDays: [],
    settings: { showRewards: true },
  };
}
