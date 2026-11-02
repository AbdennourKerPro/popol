import { ArrowRight, Check } from 'lucide-react';
import { THEMES } from '../content/themes';

export function ThemePicker({ done, onPick, cta }: { done: Set<string>; onPick: (id: string) => void; cta: string }) {
  return (
    <div className="theme-grid">
      {THEMES.map((theme) => {
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
