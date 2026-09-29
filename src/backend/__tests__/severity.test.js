import { deriveSeverity, SEVERITY_LABEL, SEVERITY_COLOR } from "../shared/severity";
import { SEVERITY } from "../shared/enums";

describe("deriveSeverity", () => {
  test("all-clear status returns 0 (no SOS needed)", () => {
    expect(deriveSeverity({ safety: 0, water: 0, injury: 0 })).toBe(0);
  });

  test("single warning returns LOW", () => {
    expect(deriveSeverity({ safety: 1, water: 0, injury: 0 })).toBe(SEVERITY.LOW);
    expect(deriveSeverity({ safety: 0, water: 1, injury: 0 })).toBe(SEVERITY.LOW);
    expect(deriveSeverity({ safety: 0, water: 0, injury: 1 })).toBe(SEVERITY.LOW);
  });

  test("two warnings return MEDIUM", () => {
    expect(deriveSeverity({ safety: 1, water: 1, injury: 0 })).toBe(SEVERITY.MEDIUM);
    expect(deriveSeverity({ safety: 1, water: 1, injury: 1 })).toBe(SEVERITY.MEDIUM);
  });

  test("single critical returns HIGH", () => {
    expect(deriveSeverity({ safety: 2, water: 0, injury: 0 })).toBe(SEVERITY.HIGH);
    expect(deriveSeverity({ safety: 0, water: 2, injury: 0 })).toBe(SEVERITY.HIGH);
    expect(deriveSeverity({ safety: 0, water: 0, injury: 2 })).toBe(SEVERITY.HIGH);
  });

  test("two+ critical return VERY_HIGH", () => {
    expect(deriveSeverity({ safety: 2, water: 2, injury: 0 })).toBe(SEVERITY.VERY_HIGH);
    expect(deriveSeverity({ safety: 2, water: 2, injury: 2 })).toBe(SEVERITY.VERY_HIGH);
  });

  test("critical beats warning", () => {
    expect(deriveSeverity({ safety: 2, water: 1, injury: 1 })).toBe(SEVERITY.HIGH);
  });

  test("empty status defaults to all-clear", () => {
    expect(deriveSeverity({})).toBe(0);
    expect(deriveSeverity()).toBe(0);
  });
});

describe("severity presentation", () => {
  test("every level has a label and distinct color", () => {
    for (const level of [1, 2, 3, 4]) {
      expect(SEVERITY_LABEL[level]).toBeTruthy();
      expect(SEVERITY_COLOR[level]).toMatch(/^#[0-9A-F]{6}$/i);
    }
    const colors = new Set(Object.values(SEVERITY_COLOR));
    expect(colors.size).toBe(4);
  });
});
