import { Clock, Gauge } from 'lucide-react';
import { dureeEstimee, LONGUEURS } from '../content/questions';
import type { Longueur, Mode } from '../content/types';
import { type Answers, remaining } from '../lib/engine';

const ICONS = { court: Clock, normal: Gauge };
const ORDER: Longueur[] = ['court', 'normal'];

/**
 * The journeys with their number of questions and estimated time. When the answers
 * already given are passed, only the longer journeys are offered, with the questions still to ask.
 */
export function LongueurPicker({ mode, onPick, from, answers = {} }: { mode: Mode; onPick: (l: Longueur) => void; from?: Longueur; answers?: Answers }) {
  const offered = from ? ORDER.slice(ORDER.indexOf(from) + 1) : ORDER;
  return (
    <div className="longueur-grid">
      {offered.map((l) => {
        const Icon = ICONS[l];
        const info = LONGUEURS[l];
        const questions = remaining(answers, l, mode).length;
        return (
          <button key={l} className={`longueur-card longueur-${l}`} onClick={() => onPick(l)}>
            <span className="longueur-icon"><Icon size={28} strokeWidth={2.4} /></span>
            <strong>{info.titre}</strong>
            <span className="longueur-duree">{dureeEstimee(questions)} · {questions} question{questions > 1 ? 's' : ''}{from ? ' de plus' : ''}</span>
            <span>{info.description}</span>
          </button>
        );
      })}
    </div>
  );
}
