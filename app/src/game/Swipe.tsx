import { Calculator, Heart, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MeasureQuote } from '../components/common';
import { ESTIMATIONS } from '../content/estimations';
import type { Theme } from '../content/types';
import type { Ranked } from '../lib/engine';

const THRESHOLD = 110;

/** Card stack: keep ("ça me parle") or pass each measure, by drag, button or arrow keys. */
export function Swipe({ theme, ranked, onDone }: { theme: Theme; ranked: Ranked[]; onDone: (kept: string[], seen: string[]) => void }) {
  const [index, setIndex] = useState(0);
  const [kept, setKept] = useState<string[]>([]);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null);
  const origin = useRef<number | null>(null);

  const decide = (keep: boolean) => {
    if (leaving || index >= ranked.length) return;
    const id = ranked[index].target.mesure;
    const nextKept = keep ? [...kept, id] : kept;
    setLeaving(keep ? 'right' : 'left');
    window.setTimeout(() => {
      setKept(nextKept);
      setLeaving(null);
      setDx(0);
      if (index + 1 >= ranked.length) onDone(nextKept, ranked.map((r) => r.target.mesure));
      else setIndex(index + 1);
    }, 260);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide(true);
      if (e.key === 'ArrowLeft') decide(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const release = () => {
    if (origin.current === null) return;
    origin.current = null;
    if (dx > THRESHOLD) decide(true);
    else if (dx < -THRESHOLD) decide(false);
    else setDx(0);
  };

  const visible = ranked.slice(index, index + 3);
  const strength = Math.min(1, Math.abs(dx) / THRESHOLD);

  return (
    <section className="screen swipe-screen">
      <div className="swipe-count"><strong>{Math.min(index + 1, ranked.length)}</strong> / {ranked.length}</div>
      <div className="stack">
        {visible.map((r, depth) => {
          const top = depth === 0;
          const style: React.CSSProperties = top
            ? { transform: `translateX(${dx}px) rotate(${dx / 16}deg)`, transition: origin.current === null ? undefined : 'none' }
            : { transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.05}) rotate(${depth % 2 ? 2.5 : -2.5}deg)` };
          return (
            <article key={r.target.mesure}
              className={`swipe-card accent-${theme.accent} ${top && leaving ? `leave-${leaving}` : ''}`}
              style={{ ...style, zIndex: 10 - depth }}
              aria-hidden={!top}
              onPointerDown={top ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); origin.current = e.clientX; setDx(0); } : undefined}
              onPointerMove={top ? (e) => { if (origin.current !== null) setDx(e.clientX - origin.current); } : undefined}
              onPointerUp={top ? release : undefined}
              onPointerCancel={top ? release : undefined}>
              {top && <span className="stamp stamp-yes" style={{ opacity: dx > 0 ? strength : 0 }}>Ça me parle</span>}
              {top && <span className="stamp stamp-no" style={{ opacity: dx < 0 ? strength : 0 }}>Bof</span>}
              <span className="swipe-label">Pour toi</span>
              <h3>{r.target.tu}</h3>
              {ESTIMATIONS[r.target.mesure] && <span className="swipe-chip"><Calculator size={15} strokeWidth={2.6} /> Chiffrage à la fin si tu gardes</span>}
              <span className="swipe-divider">Dans le programme</span>
              <MeasureQuote id={r.target.mesure} compact />
            </article>
          );
        })}
      </div>
      <div className="swipe-actions">
        <button className="round-btn round-no" onClick={() => decide(false)} aria-label="Pas pour moi">
          <X size={30} strokeWidth={3} />
        </button>
        <span className="swipe-hint">Glisse la carte<br />ou utilise les boutons</span>
        <button className="round-btn round-yes" onClick={() => decide(true)} aria-label="Ça me parle">
          <Heart size={28} strokeWidth={3} fill="currentColor" />
        </button>
      </div>
    </section>
  );
}
