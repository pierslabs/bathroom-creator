import { describe, it, expect } from "vitest";
import { drawerLayout, vanityHeight, VANITY, DRAWER_RATIOS } from "./cabinet";

describe("vanityHeight", () => {
  it("suma patas + cuerpo + encimera/lavabo", () => {
    expect(vanityHeight()).toBeCloseTo(0.08 + 0.75 + 0.05);
    expect(vanityHeight({ ...VANITY, legHeight: 0.1 })).toBeCloseTo(
      0.1 + 0.75 + 0.05,
    );
  });
});

describe("drawerLayout", () => {
  it("reparte los cajones proporcionalmente y la suma == bodyHeight", () => {
    const drawers = drawerLayout(0.75, DRAWER_RATIOS);
    expect(drawers).toHaveLength(3);
    const sum = drawers.reduce((a, d) => a + d.height, 0);
    expect(sum).toBeCloseTo(0.75);
    // 27/75 * 0.75 = 0.27, 24/75 * 0.75 = 0.24.
    expect(drawers[0].height).toBeCloseTo(0.27);
    expect(drawers[1].height).toBeCloseTo(0.24);
    expect(drawers[2].height).toBeCloseTo(0.24);
  });

  it("apila de arriba hacia abajo sin solaparse", () => {
    const drawers = drawerLayout(0.75, DRAWER_RATIOS);
    // El primero (arriba) tiene el centro más alto.
    expect(drawers[0].y).toBeGreaterThan(drawers[1].y);
    expect(drawers[1].y).toBeGreaterThan(drawers[2].y);
    // Borde superior del primero == bodyHeight; inferior del último == 0.
    expect(drawers[0].y + drawers[0].height / 2).toBeCloseTo(0.75);
    expect(drawers[2].y - drawers[2].height / 2).toBeCloseTo(0);
  });

  it("ratios normalizados o no, dan el mismo reparto", () => {
    const a = drawerLayout(0.75, [27, 24, 24]);
    const b = drawerLayout(0.75, [0.27, 0.24, 0.24]);
    a.forEach((d, i) => expect(d.height).toBeCloseTo(b[i].height));
  });

  it("entrada inválida devuelve vacío", () => {
    expect(drawerLayout(0, DRAWER_RATIOS)).toEqual([]);
    expect(drawerLayout(0.75, [])).toEqual([]);
    expect(drawerLayout(0.75, [0, 0])).toEqual([]);
  });
});
