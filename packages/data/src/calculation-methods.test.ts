import { CalculationMethod } from "adhan";
import { describe, expect, it } from "vitest";
import { CALCULATION_METHODS } from "./calculation-methods.js";

describe("CALCULATION_METHODS", () => {
  it("every method id corresponds to a real adhan.js CalculationMethod factory", () => {
    for (const { id } of CALCULATION_METHODS) {
      expect(typeof CalculationMethod[id]).toBe("function");
    }
  });

  it("has no duplicate ids", () => {
    const ids = CALCULATION_METHODS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
