import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../content/questions';
import { THEMES, themeById } from '../content/themes';
import data from '../data/mesures.json';
import { hasMesure, rank, remaining, rewind, tagsOf } from './engine';

const pouvoirAchat = themeById('pouvoir-achat')!;

describe('content', () => {
  const produced = new Set(Object.values(QUESTIONS).flatMap((q) => q.choices.flatMap((c) => c.tags)));

  it('cites only measures that exist in the corpus', () => {
    const ids = THEMES.flatMap((t) => [
      ...t.cibles.map((c) => c.mesure), ...t.collectif, ...(t.quiz ? [t.quiz.mesure] : []), ...t.objections.flatMap((o) => o.mesures),
    ]).concat(Object.values(QUESTIONS).flatMap((q) => q.choices.flatMap((c) => (c.teaser ? [c.teaser] : []))));
    expect(ids.filter((id) => !hasMesure(id))).toEqual([]);
  });

  it('offers a path to every measure of the corpus', () => {
    const targeted = new Set(THEMES.flatMap((t) => t.cibles.map((c) => c.mesure)));
    expect(Object.keys(data.mesures).filter((id) => !targeted.has(id))).toEqual([]);
  });

  it('only uses tags that some answer can produce', () => {
    const used = [
      ...THEMES.flatMap((t) => t.cibles.flatMap((c) => [...c.si.flat(), ...(c.plus ?? [])])),
      ...Object.values(QUESTIONS).flatMap((q) => [...(q.si?.flat() ?? []), ...(q.sauf ?? [])]),
    ];
    expect(used.filter((t) => !produced.has(t))).toEqual([]);
  });

  it('references known questions, unique targets and valid quizzes', () => {
    for (const theme of THEMES) {
      expect(theme.questions.every((id) => id in QUESTIONS)).toBe(true);
      const ids = theme.cibles.map((c) => c.mesure);
      expect(new Set(ids).size).toBe(ids.length);
      if (theme.quiz) expect(theme.quiz.options[theme.quiz.bonne]).toBeDefined();
    }
  });
});

describe('engine', () => {
  it('asks conditional questions only when relevant', () => {
    expect(remaining(pouvoirAchat, {}).map((q) => q.id)).not.toContain('salaire');
    const salarie = remaining(pouvoirAchat, { statut: ['prive'] }).map((q) => q.id);
    expect(salarie[0]).toBe('salaire');
    expect(salarie).not.toContain('pension');
    expect(remaining(pouvoirAchat, { statut: ['retraite'] })[0].id).toBe('pension');
  });

  it('hides questions excluded by a tag', () => {
    const travail = themeById('travail')!;
    expect(remaining(travail, { statut: ['retraite'] }).map((q) => q.id)).not.toContain('age');
  });

  it('ranks measures by relevance', () => {
    const answers = { statut: ['prive'], salaire: ['bas'], budget: ['courses'], logement: ['locataire'], apl: ['oui'] };
    const ranked = rank(pouvoirAchat, answers);
    expect(ranked.slice(0, 3).map((r) => r.score)).toEqual([3, 3, 3]);
    expect(ranked.map((r) => r.target.mesure)).toContain('s01-ss08-m001');
    expect(ranked.map((r) => r.target.mesure)).not.toContain('s01-ss08-m003');
  });

  it('adds bonus points for aggravating tags', () => {
    const logement = themeById('logement')!;
    const plain = rank(logement, { logement: ['locataire'] }).find((r) => r.target.mesure === 's01-ss09-m005')!;
    const city = rank(logement, { logement: ['locataire'], ville: ['grande'], loyer: ['lourd'] })
      .find((r) => r.target.mesure === 's01-ss09-m005')!;
    expect(city.score).toBe(plain.score + 2);
  });

  it('treats skipped questions as no information', () => {
    expect(tagsOf({ salaire: [] }).size).toBe(0);
    expect(rank(pouvoirAchat, { statut: [], salaire: ['nsp'] })).toEqual([]);
  });

  it('rewinds to a previous question', () => {
    const [answers, history] = rewind({ statut: ['prive'], salaire: ['bas'], budget: ['courses'] },
      ['statut', 'salaire', 'budget'], 'salaire');
    expect(answers).toEqual({ statut: ['prive'] });
    expect(history).toEqual(['statut']);
  });
});
