import { describe, expect, it } from 'vitest';
import { hasMesure } from '../lib/engine';
import { ESTIMATIONS, estimate, inputValue } from './estimations';

const none = new Set<string>();
const n = (s: string) => s.replace(/ /g, ' ');

describe('estimations', () => {
  it('are attached to existing measures, with defaults inside their bounds', () => {
    for (const [id, estimation] of Object.entries(ESTIMATIONS)) {
      expect(hasMesure(id), id).toBe(true);
      for (const input of estimation.inputs) {
        const v = inputValue(input, {}, none);
        expect(v >= input.min && v <= input.max, `${id}/${input.id}`).toBe(true);
      }
      expect(estimate(id, {}, none)?.valeur, id).toBeTruthy();
    }
  });

  it('computes the SMIC gain pro rata of working time', () => {
    expect(n(estimate('s01-ss08-m001', { salaire_net: 1400, quotite: 100 }, none)!.valeur)).toBe('+300 €');
    expect(n(estimate('s01-ss08-m001', { salaire_net: 1000, quotite: 80 }, none)!.detail)).toBe('par mois, soit +4 320 € par an');
    expect(estimate('s01-ss08-m001', { salaire_net: 1500, quotite: 50 }, none)!.court).toBeUndefined();
  });

  it('computes the retirement year and the 40 annuities', () => {
    const r = estimate('s01-ss14-m001', { naissance: 1990, debut_carriere: 25 }, none)!;
    expect(r.valeur).toBe('2050');
    expect(r.detail).toContain('à 65 ans, en 2055');
  });

  it('uses 32 hours when the job is hard, prefilled from the answers', () => {
    expect(estimate('s01-ss10-m002', { heures: 39 }, new Set(['penible']))!.valeur).toBe('−7 h');
    expect(estimate('s01-ss10-m002', { heures: 39 }, none)!.valeur).toBe('−4 h');
    expect(estimate('s01-ss10-m002', { heures: 35, penible: 0 }, none)!.court).toBeUndefined();
  });

  it('sums school savings over children', () => {
    expect(n(estimate('s06-ss03-m001', { nb_enfants: 2, cantine: 60, frais_ecole: 150 }, none)!.valeur)).toBe('+1 500 €');
  });
});

describe('confirmation', () => {
  it('requires every amount to be set, toggles excepted', async () => {
    const { isConfirmed } = await import('./estimations');
    expect(isConfirmed('s01-ss08-m001', { salaire_net: 1300 })).toBe(false);
    expect(isConfirmed('s01-ss08-m001', { salaire_net: 1300, quotite: 100 })).toBe(true);
    expect(isConfirmed('s01-ss10-m002', { heures: 39 })).toBe(true);
    expect(isConfirmed('s01-ss10-m003', {})).toBe(true);
  });
});

describe('tax calculators', () => {
  const taxes = estimate('s01-ss01-m001', { couple: 0, net1: 1500, enfants_foyer: 0 }, none)!;

  it('shows a gain with its breakdown for a modest salary', () => {
    expect(n(taxes.valeur)).toBe('+406 €');
    expect(n(taxes.detail)).toContain('Impôt sur le revenu : 390 € → 547 €');
    expect(n(taxes.detail)).toContain('CSG : 2 179 € → 1 615 €');
    expect(taxes.court).toBeDefined();
  });

  it('shows a loss, not a gain, for a high salary', () => {
    const r = estimate('s01-ss01-m001', { couple: 0, net1: 8000, enfants_foyer: 0 }, none)!;
    expect(r.valeur.startsWith('−')).toBe(true);
    expect(r.court).toBeUndefined();
  });

  it('shares the calculator between income tax and CSG', () => {
    expect(ESTIMATIONS['s01-ss01-m002']).toBe(ESTIMATIONS['s01-ss01-m001']);
  });

  it('hides the partner salary unless in a couple, and does not require it', async () => {
    const { visibleInputs, isConfirmed } = await import('./estimations');
    expect(visibleInputs('s01-ss01-m001', {}, none).map((i) => i.id)).not.toContain('net2');
    expect(visibleInputs('s01-ss01-m001', {}, new Set(['couple'])).map((i) => i.id)).toContain('net2');
    expect(isConfirmed('s01-ss01-m001', { net1: 1500, enfants_foyer: 0 }, none)).toBe(true);
    expect(isConfirmed('s01-ss01-m001', { net1: 1500, enfants_foyer: 0 }, new Set(['couple']))).toBe(false);
  });

  it('computes the inheritance saving for two children', () => {
    const r = estimate('s01-ss01-m006', { couple_heritage: 0, patrimoine: 400000, heritiers: 2 }, none)!;
    expect(n(r.valeur)).toBe('+32 389 €');
    expect(n(r.detail)).toContain('Droits : 36 389 € → 4 000 €');
  });

  it('says so when there is no inheritance tax in either case', () => {
    const r = estimate('s01-ss01-m006', { couple_heritage: 1, patrimoine: 400000, heritiers: 2 }, none)!;
    expect(r.valeur).toBe('0 €');
    expect(r.court).toBeUndefined();
  });
});
