import { describe, expect, it } from 'vitest';
import { chiffresConfirmes } from '../components/Estimator';
import { hasMesure, mesure } from '../lib/programme';
import textes from '../../../rag/data/programme/textes.jsonl?raw';
import { CHIFFRAGES, effectiveValues, estimate, isConfirmed } from './chiffrages';

const calc = (id: string, values: Record<string, number> = {}, tags: string[] = []) => estimate(id, values, new Set(tags))!;
const text = (id: string) => mesure(id).texte;
/** Amounts use a non-breaking space so that « 1 040 € » is never split over two lines. */
const sp = (value: string) => value.replace(/ /g, '\u00a0');

describe('chiffrages rest on the programme', () => {
  it('only concern measures that exist, and rely on figures written in that very measure', () => {
    for (const [id, chiffrage] of Object.entries(CHIFFRAGES)) {
      expect(hasMesure(id), id).toBe(true);
      for (const figure of chiffrage.figures) expect(text(id), `${id} : « ${figure} »`).toContain(figure);
      expect(chiffrage.hypothese.length, id).toBeGreaterThan(40);
      if (chiffrage.appui) {
        const source = textes.split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((t) => t.id === chiffrage.appui!.texte);
        for (const figure of chiffrage.appui.figures) expect(source?.texte, `${id} : « ${figure} »`).toContain(figure);
      }
    }
  });

  it('computes the gains from the figures of the programme', () => {
    expect(calc('p2c02-ss03-m001', { salaire_net: 1400, quotite: 100 }).valeur).toBe(sp('+300 €'));
    expect(calc('p2c02-ss03-m001', { salaire_net: 700, quotite: 50 }).valeur).toBe(sp('+150 €'));
    expect(calc('p2c02-ss01-m003', { salaire_net: 1800, quotite: 100 }).valeur).toBe('Déjà au-dessus');
    expect(calc('p2c02-ss01-m005', { apl: 200 }).valeur).toBe(sp('+20 €'));
    expect(calc('p2c02-ss01-m004', { traitement: 2000 }).valeur).toBe(sp('+200 €'));
    expect(calc('p3c01-ss07-m002', { carriere_complete: 1, pension: 1100 }).valeur).toBe(sp('+600 €'));
    expect(calc('p3c01-ss07-m002', { carriere_complete: 0, pension: 1000 }).valeur).toBe(sp('+337 €'));
    expect(calc('p3c01-ss01-m001', { revenus: 700 }).valeur).toBe(sp('+637 €'));
    expect(calc('p3c02-ss03-m002', { revenus: 700 }).valeur).toBe(sp('+637 €'));
    expect(calc('p3c02-ss05-m001', { aah: 1000 }).valeur).toBe(sp('+700 €'));
    expect(calc('p3c01-ss08-m001', { mutuelle: 70, reste_charge: 200 }).valeur).toBe(sp('+1 040 €'));
    expect(calc('p4c02-ss02-m001', { nb_enfants: 2, cantine: 60, frais_ecole: 150 }).valeur).toBe(sp('+1 500 €'));
    expect(calc('p3c03-ss04-m003', { creche: 300 }).valeur).toBe(sp('+3 300 €'));
    expect(calc('p2c02-ss03-m006', { bas: 2000 }).valeur).toBe(sp('40 000 €'));
    expect(calc('p2c02-ss02-m004', { patrimoine_m: 150 }).valeur).toBe(sp('3 M€'));
    expect(calc('p4c02-ss07-m002').valeur).toBe(`≈ ${sp('15 300 €')}`);
  });

  it('computes the working time and the retirement date from the rules of the programme', () => {
    expect(calc('p3c01-ss04-m001', { heures: 39, penible: 0 }).valeur).toBe('−4 h');
    expect(calc('p3c01-ss04-m001', { heures: 39, penible: 1 }).valeur).toBe('−7 h');
    expect(calc('p3c01-ss04-m001', { heures: 35, penible: 0 }).valeur).toBe('35 h');
    expect(calc('p3c01-ss07-m001', { naissance: 1980, debut_carriere: 18 }).valeur).toBe('2040');
    expect(calc('p3c01-ss07-m001', { naissance: 1980, debut_carriere: 22 }).detail).toContain('62 ans');
  });

  it('exempts inheritances under 150 000 € and says what the programme does not state above', () => {
    expect(calc('p2c02-ss02-m007', { part: 120000 }).court).toMatch(/droits de succession en moins/);
    expect(calc('p2c02-ss02-m007', { part: 80000 }).valeur).toBe(sp('0 €'));
    expect(calc('p2c02-ss02-m007', { part: 200000 }).valeur).toBe('Au-dessus');
    expect(CHIFFRAGES['p2c02-ss02-m007'].hypothese).toContain('ne donne pas le barème');
  });

  it('shows a loss as a loss, and leaves the CSG out of the income tax', () => {
    const haut = calc('p2c02-ss02-m001', { couple: 0, net1: 9000, enfants_foyer: 0 });
    expect(haut.valeur.startsWith('−')).toBe(true);
    expect(haut.court).toBeUndefined();
    expect(haut.detail).toContain('Impôt sur le revenu');
    expect(haut.detail).not.toContain('CSG');
    expect(CHIFFRAGES['p2c02-ss02-m001'].hypothese).toContain('la CSG n’y est pas incluse');
  });

  it('only puts on the image the figures the person has set', () => {
    const id = 'p2c02-ss03-m001';
    const tags = new Set<string>();
    expect(isConfirmed(id, {}, tags)).toBe(false);
    expect(chiffresConfirmes([id], {}, tags)).toEqual([]);
    const set = { salaire_net: 1400, quotite: 100 };
    expect(effectiveValues(id, set, tags)).toEqual(set);
    expect(chiffresConfirmes([id, 'p2c02-ss01-m003'], set, tags)).toEqual([`${sp('+300 €')} par mois avec le SMIC à 1 700 €`]);
  });
});
