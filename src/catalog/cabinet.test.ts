import { describe, it, expect } from "vitest";
import { shelfCount, shelfPositions, cabinetLayout } from "./cabinet";
import type { Size } from "../domain/types";

describe("shelfCount", () => {
  it("una balda cada ~gap metros de alto real", () => {
    expect(shelfCount(0.9, 0.35)).toBe(2); // round(2.57)-1
    expect(shelfCount(1.8, 0.35)).toBe(4); // round(5.14)-1
  });

  it("nunca negativo: un mueble muy bajo no tiene baldas", () => {
    expect(shelfCount(0.2, 0.35)).toBe(0);
    expect(shelfCount(0, 0.35)).toBe(0);
  });

  it("gap inválido no rompe", () => {
    expect(shelfCount(1, 0)).toBe(0);
  });
});

describe("shelfPositions", () => {
  it("reparte las baldas uniformemente dentro del hueco interior", () => {
    // natural 0.9, panel 0.02 -> interior [0.02, 0.88], span 0.86.
    // 2 baldas -> en 1/3 y 2/3 del span.
    const ys = shelfPositions(2, 0.9, 0.02);
    expect(ys).toHaveLength(2);
    expect(ys[0]).toBeCloseTo(0.02 + 0.86 / 3);
    expect(ys[1]).toBeCloseTo(0.02 + (2 * 0.86) / 3);
  });

  it("sin baldas o sin hueco devuelve vacío", () => {
    expect(shelfPositions(0, 0.9, 0.02)).toEqual([]);
    expect(shelfPositions(2, 0.03, 0.02)).toEqual([]); // panel se come el alto
  });
});

describe("cabinetLayout", () => {
  const natural: Size = { width: 0.8, height: 0.9, depth: 0.4 };

  it("mueble estándar: 2 baldas, sin divisor (ancho < 0.9)", () => {
    const real: Size = { width: 0.8, height: 0.9, depth: 0.4 };
    const layout = cabinetLayout(real, natural);
    expect(layout.shelfYs).toHaveLength(2);
    expect(layout.hasDivider).toBe(false);
    expect(layout.panel).toBeCloseTo(0.02);
  });

  it("mueble ancho: agrega divisor vertical", () => {
    const real: Size = { width: 1.2, height: 0.9, depth: 0.4 };
    expect(cabinetLayout(real, natural).hasDivider).toBe(true);
  });

  it("mueble alto: más baldas (cuenta por tamaño real, posiciona en natural)", () => {
    const real: Size = { width: 0.8, height: 1.8, depth: 0.4 };
    const layout = cabinetLayout(real, natural);
    expect(layout.shelfYs).toHaveLength(4);
    // Posiciones dentro del rango natural [0.02, 0.88], no del real.
    for (const y of layout.shelfYs) {
      expect(y).toBeGreaterThan(0.02);
      expect(y).toBeLessThan(0.88);
    }
  });
});
