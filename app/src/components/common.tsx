import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Mascot } from './Mascot';
import { emplacement, type Mesure, SITE_LABEL } from '../lib/programme';

export function Header({ onHome, children }: { onHome: () => void; children?: React.ReactNode }) {
  return (
    <header className="header">
      <button className="header-brand" onClick={onHome} aria-label="Retour à l’accueil">
        <Mascot mood="happy" size={46} />
        <span className="brand-pill">Ça change quoi<span className="brand-dot"> ?</span></span>
      </button>
      <div className="header-end">{children}</div>
    </header>
  );
}

export function BackButton({ onClick, label = 'Retour' }: { onClick: () => void; label?: string }) {
  return <button className="back-button" onClick={onClick}><ArrowLeft size={18} strokeWidth={2.5} />{label}</button>;
}

export function Sticker({ children, tone = 'red', tilt = -3 }: { children: React.ReactNode; tone?: 'red' | 'purple' | 'cream'; tilt?: number }) {
  return <span className={`sticker sticker-${tone}`} style={{ rotate: `${tilt}deg` }}>{children}</span>;
}

/** Exact measure text with its place in the book and a link to that page: never paraphrased. */
export function MeasureQuote({ mesure, compact = false }: { mesure: Mesure; compact?: boolean }) {
  return (
    <figure className={`quote ${compact ? 'quote-compact' : ''}`}>
      <blockquote>{mesure.texte}</blockquote>
      <figcaption>
        <span>{emplacement(mesure)}</span>
        <a href={mesure.url} target="_blank" rel="noreferrer">{SITE_LABEL} <ExternalLink size={11} /></a>
      </figcaption>
    </figure>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <span style={{ width: `${Math.max(6, value * 100)}%` }} />
    </div>
  );
}

const COLORS = ['#4c0297', '#d1271c', '#c9a6ee', '#1d1240', '#ff8a80'];

export function Confetti({ count = 34 }: { count?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} style={{
          left: `${(i * 37) % 100}%`,
          background: COLORS[i % COLORS.length],
          animationDelay: `${(i % 7) * 0.06}s`,
          animationDuration: `${1.1 + (i % 5) * 0.18}s`,
          borderRadius: i % 3 === 0 ? '50%' : '2px',
          ['--drift' as string]: `${((i * 53) % 120) - 60}px`,
          ['--spin' as string]: `${(i * 97) % 720}deg`,
        }} />
      ))}
    </div>
  );
}

const FOOTNOTE = 'Site non officiel, en soutien à la candidature de Jean-Luc Mélenchon. Vos réponses restent sur cet appareil : rien n’est enregistré ni envoyé.';

export function Footnote() {
  return <p className="footnote">{FOOTNOTE} <a href="#mentions">Mentions légales</a></p>;
}
