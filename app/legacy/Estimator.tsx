import { Calculator } from 'lucide-react';
import { createContext, useContext } from 'react';
import { ESTIMATIONS, estimate, inputValue, isConfirmed, visibleInputs, type Input, type Values } from '../content/estimations';
import type { Tag } from '../content/types';

const display = (input: Input, v: number) => {
  if (input.kind === 'annee') return String(v);
  const n = v.toLocaleString('fr-FR').replace(/ /g, ' ');
  return input.unite ? `${n} ${input.unite}` : n;
};

/** Interactive figure for a measure, when the programme gives enough numbers to compute one. */
export function Estimator({ id, values, tags, onChange }: {
  id: string; values: Values; tags: Set<Tag>; onChange: (input: string, value: number) => void;
}) {
  const estimation = ESTIMATIONS[id];
  if (!estimation) return null;
  const result = estimate(id, values, tags)!;
  const inputs = visibleInputs(id, values, tags);
  const example = !!result.court && !isConfirmed(id, values, tags);
  return (
    <div className="estimator">
      <div className="estimator-head"><Calculator size={17} strokeWidth={2.6} /> {estimation.titre}</div>
      {inputs.map((input) => {
        const v = inputValue(input, values, tags);
        if (input.kind === 'oui-non') {
          return (
            <div key={input.id} className="est-toggle">
              <span>{input.label}</span>
              <div role="group" aria-label={input.label}>
                {[['Non', 0], ['Oui', 1]].map(([label, value]) => (
                  <button key={label} className={v === value ? 'on' : ''} aria-pressed={v === value}
                    onClick={() => onChange(input.id, value as number)}>{label}</button>
                ))}
              </div>
            </div>
          );
        }
        const pct = ((v - input.min) / (input.max - input.min)) * 100;
        return (
          <label key={input.id} className="est-input">
            <span className="est-label">{input.label}<output>{display(input, v)}</output></span>
            <input type="range" min={input.min} max={input.max} step={input.step} value={v}
              style={{ ['--p' as string]: `${pct}%` }}
              onChange={(e) => onChange(input.id, Number(e.target.value))} />
            {input.hint && <small>{input.hint}</small>}
          </label>
        );
      })}
      <div className={`est-result ${result.court && !example ? 'gain' : ''}`}>
        <strong key={result.valeur}>{result.valeur}</strong>
        <span>{result.detail}</span>
        {example && (
          <em className="est-example">
            Valeurs d’exemple : ajuster les curseurs, ou{' '}
            <button onClick={() => inputs.forEach((i) => onChange(i.id, inputValue(i, values, tags)))}>les valider telles quelles</button>
          </em>
        )}
      </div>
      <details className="est-hyp">
        <summary>Comment c’est calculé</summary>
        <p>{estimation.hypothese}</p>
      </details>
    </div>
  );
}

interface EstimationState { values: Values; tags: Set<Tag>; onChange: (input: string, value: number) => void }
export const EstimationContext = createContext<EstimationState | null>(null);

/** Estimator reading its state from the nearest EstimationContext. */
export function ContextEstimator({ id }: { id: string }) {
  const state = useContext(EstimationContext);
  return state ? <Estimator id={id} {...state} /> : null;
}
