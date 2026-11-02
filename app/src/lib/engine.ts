import data from '../data/mesures.json';
import { QUESTIONS } from '../content/questions';
import type { Condition, Question, Tag, Target, Theme } from '../content/types';

export interface Mesure { texte: string; sousSection: string }

const MESURES = data.mesures as Record<string, Mesure>;
/** Campaign site of Jean-Luc Mélenchon: where to read the programme. */
export const SITE_URL = 'https://melenchon2027.fr/';
export const SITE_LABEL = 'melenchon2027.fr';

export const hasMesure = (id: string) => id in MESURES;
export function mesure(id: string): Mesure {
  const found = MESURES[id];
  if (!found) throw new Error(`Mesure inconnue : ${id}`);
  return found;
}

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

export const matches = (condition: Condition, tags: Set<Tag>) =>
  condition.some((group) => group.every((t) => tags.has(t)));

export function isVisible(question: Question, tags: Set<Tag>) {
  if (question.sauf?.some((t) => tags.has(t))) return false;
  return !question.si || matches(question.si, tags);
}

/** Visible questions of the theme not answered yet, in order. */
export function remaining(theme: Theme, answers: Answers): Question[] {
  const tags = tagsOf(answers);
  return theme.questions.map((id) => QUESTIONS[id]).filter((q) => !(q.id in answers) && isVisible(q, tags));
}

export function score(target: Target, tags: Set<Tag>) {
  if (!matches(target.si, tags)) return 0;
  return target.poids + (target.plus?.filter((t) => tags.has(t)).length ?? 0);
}

export interface Ranked { target: Target; score: number }

/** Relevant measures of the theme, most relevant first; ties keep the authoring order. */
export function rank(theme: Theme, answers: Answers): Ranked[] {
  const tags = tagsOf(answers);
  return theme.cibles
    .map((target) => ({ target, score: score(target, tags) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Drop the answers given after `questionId` in `history`, and that one too. */
export function rewind(answers: Answers, history: string[], questionId: string): [Answers, string[]] {
  const index = history.lastIndexOf(questionId);
  if (index < 0) return [answers, history];
  const dropped = new Set(history.slice(index));
  return [Object.fromEntries(Object.entries(answers).filter(([id]) => !dropped.has(id))), history.slice(0, index)];
}
