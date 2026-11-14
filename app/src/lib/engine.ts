import { EN_TETE, LONGUEURS, POIDS_BESOIN, POIDS_INTERET, QUESTION_LIST, QUESTIONS } from '../content/questions';
import type { Condition, Longueur, Mode, Question, Tag } from '../content/types';
import { MESURES, type Categorie, type Mesure, type Portee } from './programme';

/** Question id -> chosen choice ids. An empty list means "skipped". */
export type Answers = Record<string, string[]>;

export function tagsOf(answers: Answers): Set<Tag> {
  const tags = new Set<Tag>();
  for (const [questionId, choiceIds] of Object.entries(answers)) {
    for (const choice of QUESTIONS[questionId]?.choices ?? []) {
      if (choiceIds.includes(choice.id)) choice.tags.forEach((t) => tags.add(t));
    }
  }
  return tags;
}

const matches = (condition: Condition, tags: Set<Tag>) => condition.some((group) => group.every((t) => tags.has(t)));
const isVisible = (question: Question, tags: Set<Tag>) => !question.si || matches(question.si, tags);

const ORDRE: Longueur[] = ['court', 'normal'];
const isIncluded = (question: Question, longueur: Longueur, mode: Mode) =>
  ORDRE.indexOf(question.niveau) <= ORDRE.indexOf(longueur) && !(question.jeuSeul && mode === 'militant');

/** Questions of the journey not answered yet, in order. */
export function remaining(answers: Answers, longueur: Longueur, mode: Mode = 'jeu'): Question[] {
  const tags = tagsOf(answers);
  return QUESTION_LIST.filter((q) => isIncluded(q, longueur, mode) && !(q.id in answers) && isVisible(q, tags));
}

/** Questions of the journey already answered or still to ask: the length of the progress bar. */
export const journeySize = (answers: Answers, longueur: Longueur, mode: Mode = 'jeu') =>
  QUESTION_LIST.filter((q) => isIncluded(q, longueur, mode) && q.id in answers).length + remaining(answers, longueur, mode).length;

/** Choices of a question that can still be ticked (a later round of interests hides those already given). */
export function availableChoices(question: Question, tags: Set<Tag>) {
  if (!question.sansDoublon) return question.choices;
  const given = new Set([...tags].filter((t) => /^[ijk]:/.test(t)).map((t) => t.slice(2)));
  return question.choices.filter((c) => !c.tags.some((t) => given.has(t.slice(2))));
}

export interface Profile {
  /** Situation tags (publics of the taxonomy). */
  situation: Set<Tag>;
  /** Interest -> weight (topics ticked at the end). */
  interets: Map<string, number>;
  /** Themes of a difficulty the person has stated. */
  besoins: Set<string>;
}

export function profileOf(tags: Set<Tag>): Profile {
  const situation = new Set<Tag>();
  const interets = new Map<string, number>();
  const besoins = new Set<string>();
  for (const tag of tags) {
    const [rang, theme] = tag.split(':');
    if (rang === 'b') besoins.add(theme);
    else if (theme && rang in POIDS_INTERET) interets.set(theme, Math.max(interets.get(theme) ?? 0, POIDS_INTERET[rang]));
    else situation.add(tag);
  }
  return { situation, interets, besoins };
}

const OUTRE_MER_SEUL = (m: Mesure) => m.publics.includes('outre_mer') && !m.publics.some((p) => p === 'rural' || p === 'grande_ville');

const BASE: Record<Categorie, number> = { cle: 2, comp: 1, sous: 0.5 };
const PORTEE: Record<Portee, number> = { large: 1.5, ciblee: 0.5, collective: 0 };

/**
 * Relevance of a measure for a profile (0 = not for this person).
 * A measure aimed at some publics only counts if the person is one of them; a measure for everyone
 * only counts if it belongs to a theme the person cares about or struggles with. A measure tagged
 * outre_mer with no other territory only concerns these territories, whatever its other publics.
 */
export function score(m: Mesure, profile: Profile): number {
  if (OUTRE_MER_SEUL(m) && !profile.situation.has('outre_mer')) return 0;
  const matched = m.publics.filter((t) => profile.situation.has(t)).length;
  if (m.publics.length && !matched) return 0;
  let interet = 0;
  m.themes.forEach((theme, i) => {
    const need = m.portee === 'large' && profile.besoins.has(theme) ? POIDS_BESOIN : 0;
    interet = Math.max(interet, Math.max(profile.interets.get(theme) ?? 0, need) * (i === 0 ? 1 : 0.6));
  });
  if (!matched && !interet) return 0;
  const fit = matched ? 4 * Math.min(matched, 2) + (2 * matched) / m.publics.length : 0;
  return BASE[m.categorie] + PORTEE[m.portee] + fit + interet;
}

export interface Ranked { mesure: Mesure; score: number }

/** Every measure relevant for the answers, best first; ties keep the order of the book. */
export function rank(answers: Answers): Ranked[] {
  const profile = profileOf(tagsOf(answers));
  return MESURES.map((mesure) => ({ mesure, score: score(mesure, profile) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

const words = new Map<string, Set<string>>();
function wordsOf(m: Mesure) {
  let found = words.get(m.id);
  if (!found) {
    found = new Set(m.texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z0-9]{4,}/g));
    words.set(m.id, found);
  }
  return found;
}
/** Two measures on the same thing (the programme repeats some across chapters): half of the shorter one's words are in the other. */
function sameTopic(a: Mesure, b: Mesure) {
  const x = wordsOf(a), y = wordsOf(b);
  let common = 0;
  for (const w of x) if (y.has(w)) common++;
  return common >= 3 && common / Math.min(x.size, y.size) > 0.45;
}

/**
 * The `count` best measures, at most `cap` per sub-section and without near-duplicates so that the
 * list stays varied. If that leaves too few, the best remaining ones fill the list.
 */
export function select(ranked: Ranked[], count: number, cap = 2): Ranked[] {
  const perSection = new Map<string, number>();
  const chosen: Ranked[] = [];
  for (const r of ranked) {
    if (chosen.length >= count) break;
    const used = perSection.get(r.mesure.sousSection) ?? 0;
    if (used < cap && !chosen.some((c) => sameTopic(c.mesure, r.mesure))) { chosen.push(r); perSection.set(r.mesure.sousSection, used + 1); }
  }
  for (const r of ranked) {
    if (chosen.length >= count) break;
    if (!chosen.includes(r)) chosen.push(r);
  }
  return chosen;
}

/** Without any usable answer: the key measures that concern the most people, in the order of the book. */
const parDefaut = (): Ranked[] => MESURES.filter((m) => m.categorie === 'cle' && m.portee !== 'collective').map((mesure) => ({ mesure, score: 1 }));

/** The ranking shown to the person: `top` are highlighted, `others` follow; `defaut` when no answer allowed to target. */
export function classement(answers: Answers, longueur: Longueur) {
  const ranked = rank(answers);
  const defaut = ranked.length === 0;
  // A situation that few measures target is completed by the key measures that concern many people.
  const seen = new Set(ranked.map((r) => r.mesure.id));
  const all = select([...ranked, ...parDefaut().filter((r) => !seen.has(r.mesure.id))], LONGUEURS[longueur].mesures);
  return { top: all.slice(0, EN_TETE), others: all.slice(EN_TETE), defaut };
}

/** Drop the answers given after `questionId` in `history`, and that one too. */
export function rewind(answers: Answers, history: string[], questionId: string): [Answers, string[]] {
  const index = history.lastIndexOf(questionId);
  if (index < 0) return [answers, history];
  const dropped = new Set(history.slice(index));
  return [Object.fromEntries(Object.entries(answers).filter(([id]) => !dropped.has(id))), history.slice(0, index)];
}
