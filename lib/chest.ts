import type { ChestState } from "./chestArt";

export const CHEST_STATE_NAMES: Record<ChestState, string> = {
  wealthy: "Wealthy",
  comfortable: "Comfortable",
  cautious: "Cautious",
  low: "Low",
  critical: "Critical",
  overspent: "Overspent",
};

// How full the treasure chest looks, from the share of this month's income still left.
// 80%+ wealthy, 60%+ comfortable, 40%+ cautious, 20%+ low, 0%+ critical, below 0 overspent.
export function chestState(incomeCents: number, remainingCents: number): ChestState {
  if (remainingCents < 0) return "overspent";
  if (incomeCents <= 0) return "critical"; // no income yet: the chest is empty
  const percentLeft = (remainingCents / incomeCents) * 100;
  if (percentLeft >= 80) return "wealthy";
  if (percentLeft >= 60) return "comfortable";
  if (percentLeft >= 40) return "cautious";
  if (percentLeft >= 20) return "low";
  return "critical";
}
