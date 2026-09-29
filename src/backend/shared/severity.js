// Severity derivation + presentation (Architecture Plan §3 + severity 4 extension)
//
// Derived from the victim's last My Status update:
//   critical = a level-2 value  (trapped / no food & water / severe injury)
//   warning  = a level-1 value  (need help / low food & water / minor injury)
//
//   2+ critical → VERY_HIGH (4)
//   1 critical  → HIGH (3)
//   2+ warning  → MEDIUM (2)
//   1 warning   → LOW (1)
//   none        → 0 (no SOS needed — prompt a status update instead)

import { SEVERITY } from "./enums";

export function deriveSeverity({ safety = 0, water = 0, injury = 0 } = {}) {
  const values = [safety, water, injury];
  const critical = values.filter((v) => v === 2).length;
  const warning = values.filter((v) => v === 1).length;

  if (critical >= 2) return SEVERITY.VERY_HIGH;
  if (critical === 1) return SEVERITY.HIGH;
  if (warning >= 2) return SEVERITY.MEDIUM;
  if (warning === 1) return SEVERITY.LOW;
  return 0;
}

export const SEVERITY_LABEL = {
  [SEVERITY.LOW]: "Low",
  [SEVERITY.MEDIUM]: "Medium",
  [SEVERITY.HIGH]: "High",
  [SEVERITY.VERY_HIGH]: "Very High",
};

export const SEVERITY_COLOR = {
  [SEVERITY.LOW]: "#FFD54F",
  [SEVERITY.MEDIUM]: "#FFAB40",
  [SEVERITY.HIGH]: "#FF5252",
  [SEVERITY.VERY_HIGH]: "#FF1744",
};
