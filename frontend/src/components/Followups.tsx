import { ArrowRight, Globe } from 'lucide-react';
import type { Followup } from '../lib/types';

export default function Followups({ items, busy, available, onSelect }: {
  items: Followup[]; busy: boolean; available: boolean; onSelect: (item: Followup) => void;
}) {
  if (!items.length) return null;
  return <section className="followups" aria-label="Questions pour approfondir la mesure">
    <div className="followups-heading"><strong>Pour aller plus loin</strong><span><Globe size={12} />Avec recherche web</span></div>
    <p>{items[0].measure_title}</p>
    <div className="followup-list">{items.map(item => <button key={`${item.measure_id}-${item.label}`}
      disabled={busy || !available} title={item.question} onClick={() => onSelect(item)}>
      <span>{item.label}</span><ArrowRight size={14} />
    </button>)}</div>
    {!available && <small>Les recherches externes deviennent disponibles lorsque la génération et la recherche web sont activées.</small>}
  </section>;
}
