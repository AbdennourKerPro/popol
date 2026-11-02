import { describe, expect, it } from 'vitest';
import { heritage, impotRevenu, progressive } from './fiscalite';

/*
 * Expected values come from an independent re-implementation of the rules read in the official
 * simulators (see fiscalite.ts). They guard against porting mistakes, not against errors in the
 * rules themselves, which are the simulators' own.
 */
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 1);

describe('progressive', () => {
  it('applies marginal rates above each threshold', () => {
    expect(progressive(5, [0, 10], [0.1, 0.5])).toBeCloseTo(0.5);
    expect(progressive(30, [0, 10], [0.1, 0.5])).toBeCloseTo(11);
    expect(progressive(-5, [0, 10], [0.1, 0.5])).toBe(0);
    expect(progressive(8, [10, 20], [0.1, 0.5])).toBe(0);
  });
});

describe('impotRevenu', () => {
  it.each([
    { net: [1500], enfants: 0, expected: [390.09, 547.48, 2178.62, 1615.1] },
    { net: [3000], enfants: 0, expected: [4805.9, 4607.68, 4357.23, 3840.39] },
    { net: [2000, 1500], enfants: 2, expected: [300.22, 1295.29, 5083.44, 3884.29] },
    { net: [8000], enfants: 0, expected: [26211.52, 29166.45, 11619.28, 15894.49] },
    { net: [1200], enfants: 1, expected: [0, 0, 1742.89, 1251.44] },
  ])('matches the reference computation for $net with $enfants children', ({ net, enfants, expected }) => {
    const r = impotRevenu({ netMensuel: net, enfants });
    [r.actuel.ir, r.propose.ir, r.actuel.csg, r.propose.csg].forEach((v, i) => near(v, expected[i]));
    near(r.gain, expected[0] + expected[2] - expected[1] - expected[3]);
  });

  it('shows a loss for high incomes and a gain for modest ones, without forcing either', () => {
    expect(impotRevenu({ netMensuel: [3000], enfants: 0 }).gain).toBeGreaterThan(0);
    expect(impotRevenu({ netMensuel: [8000], enfants: 0 }).gain).toBeLessThan(0);
    expect(impotRevenu({ netMensuel: [1500], enfants: 0 }).gain).toBeGreaterThan(0);
  });

  it('applies the couple décote threshold to couples', () => {
    // 1 300 € net each: 1 176 € before décote, 264 € with the couple décote (835 € with the single one).
    near(impotRevenu({ netMensuel: [1300, 1300], enfants: 0 }).actuel.ir, 264.16);
    expect(impotRevenu({ netMensuel: [1100, 1100], enfants: 0 }).actuel.ir).toBe(0);
  });
});

describe('heritage', () => {
  it('computes the tax of two children today and with the proposal', () => {
    const r = heritage({ patrimoine: 400_000, heritiers: 2, couple: false });
    near(r.actuel.droits, 36388.7);
    near(r.propose.droits, 4000);
    near(r.gain, 32388.7);
    near(r.propose.netParHeritier, 198_000);
    expect(r.propose.plafonne).toBe(false);
  });

  it('halves the share per parent for a couple, below the allowances', () => {
    const r = heritage({ patrimoine: 400_000, heritiers: 2, couple: true });
    expect(r.actuel.droits).toBe(0);
    expect(r.propose.droits).toBe(0);
  });

  it('caps what one heir can receive at 12 million euros', () => {
    const r = heritage({ patrimoine: 2_000_000_000, heritiers: 1, couple: false });
    expect(r.propose.plafonne).toBe(true);
    near(r.propose.netParHeritier, 12_000_000);
    expect(r.propose.droits).toBeCloseTo(2_000_000_000 - 12_000_000, 0);
  });

  it('ignores negative patrimoine amounts', () => {
    expect(heritage({ patrimoine: 0, heritiers: 1, couple: false }).gain).toBe(0);
  });
});
