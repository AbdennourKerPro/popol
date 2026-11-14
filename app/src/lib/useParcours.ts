import { useMemo, useState } from 'react';
import type { Longueur, Mode, Question } from '../content/types';
import { type Answers, classement, journeySize, remaining, rewind, tagsOf } from './engine';

/** State of one question journey (a person's answers), shared by the game and the militant guide. */
export function useParcours(mode: Mode) {
  const [longueur, setLongueur] = useState<Longueur | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [history, setHistory] = useState<string[]>([]);

  const left = useMemo(() => (longueur ? remaining(answers, longueur, mode) : []), [answers, longueur, mode]);
  const tags = useMemo(() => tagsOf(answers), [answers]);
  const result = useMemo(() => (longueur && !left.length ? classement(answers, longueur) : null), [answers, longueur, left.length]);

  return {
    longueur, answers, tags, left, result,
    /** Question being asked, if the journey is not over. */
    question: left[0] as Question | undefined,
    answered: history.length,
    total: longueur ? journeySize(answers, longueur, mode) : 0,
    /** Choose or lengthen the journey: the answers already given are kept. */
    start: (next: Longueur) => setLongueur(next),
    answer(question: Question, choiceIds: string[]) {
      setAnswers((a) => ({ ...a, [question.id]: choiceIds }));
      setHistory((h) => [...h, question.id]);
    },
    /** Undo the last answer, or go back to the choice of length when there is none. */
    back() {
      if (!history.length) return setLongueur(null);
      const [a, h] = rewind(answers, history, history[history.length - 1]);
      setAnswers(a);
      setHistory(h);
    },
    revisit(questionId: string) {
      const [a, h] = rewind(answers, history, questionId);
      setAnswers(a);
      setHistory(h);
    },
    reset() { setLongueur(null); setAnswers({}); setHistory([]); },
  };
}
export type Parcours = ReturnType<typeof useParcours>;
