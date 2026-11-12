import { Check, ChevronDown, Heart } from 'lucide-react';
import { THEMES, type Theme } from '../content/taxonomie';
import type { Ranked } from '../lib/engine';
import { emplacement, mesure, phrase, SITE_LABEL } from '../lib/programme';
import { MeasureQuote } from './common';
import { ChiffrageInline } from './Estimator';

const themeLabel = (r: Ranked) => THEMES[r.mesure.themes[0] as Theme]?.label;

/** What a measure says, with the measure it details when it is a sub-measure. */
function Contexte({ r }: { r: Ranked }) {
  if (!r.mesure.parent) return null;
  return <p className="rank-context">Précise : {mesure(r.mesure.parent).texte}</p>;
}

/** Place of a measure whose exact text is already the headline. */
function Source({ r }: { r: Ranked }) {
  return <p className="rank-source"><span>{emplacement(r.mesure)}</span><a href={r.mesure.url} target="_blank" rel="noreferrer">{SITE_LABEL}</a></p>;
}

/** Game: a card to keep (heart) or leave. */
export function CarteJeu({ r, rang, kept, onKeep }: { r: Ranked; rang?: number; kept: boolean; onKeep: () => void }) {
  const m = r.mesure;
  return (
    <li className={`rank-card ${rang ? 'rank-top' : ''} ${kept ? 'kept' : ''}`}>
      <div className="rank-head">
        {rang ? <span className="rank-number">{rang}</span> : null}
        {themeLabel(r) && <span className="rank-theme">{themeLabel(r)}</span>}
        <button className={`keep ${kept ? 'on' : ''}`} onClick={onKeep} aria-pressed={kept} aria-label={kept ? 'Retirer de mon programme' : 'Ça me parle'}>
          {kept ? <Check size={17} strokeWidth={3} /> : <Heart size={17} strokeWidth={3} />} <span>{kept ? 'Gardée' : 'Ça me parle'}</span>
        </button>
      </div>
      <h3>{phrase(m)}</h3>
      <Contexte r={r} />
      {m.resume ? <MeasureQuote mesure={m} compact /> : <Source r={r} />}
      <ChiffrageInline id={m.id} />
    </li>
  );
}

/** Militant: an argument to say, with the exact text one click away. */
export function ArgumentMilitant({ r, rang }: { r: Ranked; rang?: number }) {
  const m = r.mesure;
  return (
    <li className="arg">
      <details>
        <summary>
          {rang ? <span className="rank-number rank-small">{rang}</span> : <span className={`heat heat-${Math.min(Math.round(r.score / 3), 4)}`} aria-hidden="true" />}
          <strong>{phrase(m)}</strong>
          <ChevronDown size={18} strokeWidth={2.5} className="arg-chevron" />
        </summary>
        <Contexte r={r} />
        {m.resume ? <MeasureQuote mesure={m} compact /> : <Source r={r} />}
        <ChiffrageInline id={m.id} />
      </details>
    </li>
  );
}
