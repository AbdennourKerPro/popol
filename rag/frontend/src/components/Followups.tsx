import { ArrowRight } from 'lucide-react';
import type { Followup } from '../lib/types';

export default function Followups({ items, busy, available, onSelect }: {
  items: Followup[]; busy: boolean; available: boolean; onSelect: (item: Followup) => void;
}) {
  if (!items.length) return null;
  return <section className="followups" aria-label="Questions pour approfondir">
    <div className="followups-heading"><strong>Pour aller plus loin</strong></div>
    <div className="followup-list">{items.map(item => <button key={item.question}
      disabled={busy || !available} onClick={() => onSelect(item)}>
      <span>{item.label}</span><ArrowRight size={14} />
    </button>)}</div>
  </section>;
}
