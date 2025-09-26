import type { LeadSignalsT } from "@/lib/schemas";

export function computeLeadScore(ls: LeadSignalsT): number {
  let s = 0;
  if (ls.authority === "Owner/Partner") s += 20;
  if (ls.budgetBand === "$5k–$20k") s += 15;
  if (ls.budgetBand === "$20k–$50k" || ls.budgetBand === ">$50k") s += 30;
  if (["Now (0–30d)", "Soon (31–90d)"].includes(ls.urgency)) s += 15;
  if (ls.dataReadiness === "Medium") s += 10;
  if (ls.dataReadiness === "High") s += 20;
  if (["Basic SaaS", "Integrated"].includes(ls.stackMaturity)) s += 10;
  if ((ls.researchCoverage ?? 0) >= 60) s += 5;
  return Math.max(0, Math.min(100, s));
}
