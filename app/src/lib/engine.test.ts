import { describe, expect, it } from 'vitest';
import { dureeEstimee, QUESTION_LIST, QUESTIONS, tempsRestant } from '../content/questions';
import { PUBLIC_IDS, THEME_IDS } from '../content/taxonomie';
import taxonomie from '../../data/taxonomie.json';
import { type Answers, availableChoices, classement, profileOf, rank, remaining, rewind, score, select, tagsOf } from './engine';
import { MESURES, mesure } from './programme';

describe('taxonomy and questions', () => {
  it('display ids match the vocabulary used for annotation', () => {
    expect(THEME_IDS.sort()).toEqual(Object.keys(taxonomie.themes).sort());
  });

  const produced = new Set(QUESTION_LIST.flatMap((q) => q.choices.flatMap((c) => c.tags)));
  it('every public of the taxonomy can be produced by an answer', () => {
    expect(PUBLIC_IDS.filter((p) => !produced.has(p))).toEqual([]);
  });
  it('every tag an answer produces is a public or an interest of the taxonomy', () => {
    const unknown = [...produced].filter((t) => !PUBLIC_IDS.includes(t) && !THEME_IDS.includes(t.split(':')[1] as never));
    expect(unknown).toEqual([]);
  });
  it('has unique question and choice ids, and the three journeys grow', () => {
    expect(new Set(QUESTION_LIST.map((q) => q.id)).size).toBe(QUESTION_LIST.length);
    for (const q of QUESTION_LIST) expect(new Set(q.choices.map((c) => c.id)).size).toBe(q.choices.length);
    const count = (l: 'court' | 'normal' | 'long') => remaining({}, l).length;
    expect([count('court'), count('normal'), count('long')]).toEqual([6, 11, 20]);
  });
});

describe('time estimates', () => {
  it('gives each journey a duration from its number of questions, and the time left while answering', () => {
    expect([6, 11, 20].map(dureeEstimee)).toEqual(['≈ 2 min', '≈ 3 min', '≈ 5 min']);
    expect([0, 3, 4, 8, 20].map(tempsRestant)).toEqual(['', 'Moins d’une minute', 'Moins d’une minute', '≈ 2 min restantes', '≈ 5 min restantes']);
  });
});

describe('programme data', () => {
  it('holds the whole programme with its structure', () => {
    expect(MESURES).toHaveLength(1069);
    expect(MESURES.filter((m) => m.categorie === 'sous').every((m) => m.parent && mesure(m.parent))).toBe(true);
  });
  it('annotates every measure with valid labels', () => {
    for (const m of MESURES) {
      expect(m.themes.length, m.id).toBeGreaterThan(0);
      expect(m.themes.every((t) => THEME_IDS.includes(t as never)), m.id).toBe(true);
      expect(m.publics.every((p) => PUBLIC_IDS.includes(p)), m.id).toBe(true);
    }
  });
  it('can reach every measure: some profile ranks it, and it can be opened in the explorer', () => {
    for (const m of MESURES) {
      const profile = profileOf(new Set([...m.publics, ...m.themes.map((t) => `i:${t}`)]));
      expect(score(m, profile), m.id).toBeGreaterThan(0);
    }
  });
});

describe('journey', () => {
  const salarieLocataire: Answers = { statut: ['prive'], logement: ['locataire'], compte: ['logement', 'pouvoir_achat'] };

  it('asks conditional and later-round questions only when they apply', () => {
    expect(remaining({}, 'court').map((q) => q.id)).toEqual(['statut', 'age', 'foyer', 'logement', 'lieu', 'compte']);
    expect(remaining(salarieLocataire, 'normal').map((q) => q.id)).toContain('compte2');
    const second = availableChoices(QUESTIONS.compte2, tagsOf(salarieLocataire));
    expect(second.map((c) => c.id)).not.toContain('logement');
    expect(second.map((c) => c.id)).toContain('sante');
  });

  it('only offers a measure aimed at publics to a person who is one of them', () => {
    const farmers = MESURES.find((m) => m.publics.length === 1 && m.publics[0] === 'agriculteur')!;
    expect(rank({ statut: ['prive'], compte: [] }).some((r) => r.mesure.id === farmers.id)).toBe(false);
    expect(rank({ statut: ['agriculteur'] }).some((r) => r.mesure.id === farmers.id)).toBe(true);
  });

  it('ranks by situation and interests, with a varied top', () => {
    const top = classement({ ...salarieLocataire, age: ['jeune'] }, 'court');
    expect(top.top).toHaveLength(10);
    expect(top.top.length + top.others.length).toBe(15);
    const perSection = new Map<string, number>();
    for (const r of top.top) perSection.set(r.mesure.sousSection, (perSection.get(r.mesure.sousSection) ?? 0) + 1);
    expect(Math.max(...perSection.values())).toBeLessThanOrEqual(2);
    expect(classement(salarieLocataire, 'long').others).toHaveLength(20);
  });

  it('falls back on the key measures that concern many people when nothing can be targeted', () => {
    const none = classement({ statut: [], compte: [] }, 'court');
    expect(none.defaut).toBe(true);
    expect(none.top).toHaveLength(10);
    expect(none.top.every((r) => r.mesure.categorie === 'cle' && r.mesure.portee !== 'collective')).toBe(true);
    expect(classement(salarieLocataire, 'court').defaut).toBe(false);
  });

  it('does not offer the same measure twice, even when the programme states it in two chapters', () => {
    const smic = MESURES.filter((m) => /SMIC/.test(m.texte) && /1 700/.test(m.texte)).map((mesure) => ({ mesure, score: 9 }));
    expect(smic.length).toBeGreaterThan(1);
    expect(select([...smic, ...rank({ statut: ['prive'] })], 12).filter((r) => /SMIC/.test(r.mesure.texte) && /1 700/.test(r.mesure.texte))).toHaveLength(1);
  });

  it('keeps a measure on the Outre-mer for these territories, even when it has other publics', () => {
    const parents = { foyer: ['scolarise'] };
    const measure = 'p5c03-ss05-m005';
    expect(mesure(measure).publics).toEqual(expect.arrayContaining(['outre_mer', 'parent']));
    expect(rank(parents).some((r) => r.mesure.id === measure)).toBe(false);
    expect(rank({ ...parents, lieu: ['outre-mer'] }).some((r) => r.mesure.id === measure)).toBe(true);
    // Several territories remain alternatives.
    expect(rank({ lieu: ['rural'] }).some((r) => r.mesure.id === 'p5c03-ss03-m001')).toBe(true);
  });

  it('shows the universal measures matching a stated difficulty, without the theme being ticked', () => {
    const freeEnergy = 'p3c01-ss01-m004';
    const base = { statut: ['prive'], logement: ['locataire'], compte: ['logement'] };
    expect(rank(base).some((r) => r.mesure.id === freeEnergy)).toBe(false);
    const withBills = { ...base, energie: ['pese'] };
    const { top, others } = classement(withBills, 'normal');
    expect([...top, ...others].some((r) => r.mesure.id === freeEnergy)).toBe(true);
    // A difficulty does not hide the theme from the later rounds of interests.
    expect(availableChoices(QUESTIONS.compte2, tagsOf({ sante: ['maladie'] })).map((c) => c.id)).toContain('sante');
    // ... and only measures that directly reach most people are pulled up.
    expect(rank({ sante: ['maladie'] }).filter((r) => r.mesure.publics.length === 0).every((r) => r.mesure.portee === 'large')).toBe(true);
  });

  it('caps and fills the selection', () => {
    const ranked = rank(salarieLocataire);
    expect(select(ranked, 12)).toHaveLength(12);
    expect(new Set(select(ranked, 12).map((r) => r.mesure.id)).size).toBe(12);
  });

  it('rewinds to a question and drops the later answers', () => {
    const [answers, history] = rewind({ statut: ['prive'], age: ['jeune'], foyer: [] }, ['statut', 'age', 'foyer'], 'age');
    expect(Object.keys(answers)).toEqual(['statut']);
    expect(history).toEqual(['statut']);
  });
});
