import { ArrowRight, Check } from 'lucide-react';
import { THEMES } from '../content/themes';
import type { Theme } from '../content/types';

function Grid({ themes, done, onPick, cta }: { themes: Theme[]; done: Set<string>; onPick: (id: string) => void; cta: string }) {
  return (
    <div className="theme-grid">
      {themes.map((theme) => {
        const Icon = theme.icon;
        return (
          <button key={theme.id} className={`theme-card accent-${theme.accent}`} onClick={() => onPick(theme.id)}>
            {done.has(theme.id) && <span className="theme-done"><Check size={16} strokeWidth={3} /> Fait</span>}
            <span className="theme-icon"><Icon size={34} strokeWidth={2.3} /></span>
            <strong>{theme.titre}</strong>
            <span className="theme-accroche">{theme.accroche}</span>
            <span className="theme-cta">{cta} <ArrowRight size={16} strokeWidth={2.6} /></span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemePicker({ done, onPick, cta }: { done: Set<string>; onPick: (id: string) => void; cta: string }) {
  return (
    <>
      <Grid themes={THEMES.filter((t) => !t.groupe)} done={done} onPick={onPick} cta={cta} />
      <h2 className="theme-section">Explorer les autres sujets</h2>
      <p className="theme-section-lede">Pas de question sur ta situation ici : tu choisis ce qui compte pour toi.</p>
      <Grid themes={THEMES.filter((t) => t.groupe === 'explorer')} done={done} onPick={onPick} cta={cta} />
    </>
  );
}
