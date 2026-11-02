import { ArrowRight, Gamepad2, Megaphone } from 'lucide-react';
import type { Mode } from '../App';
import { Footnote, Header, Sticker } from '../components/common';
import { Bubble, Mascot } from '../components/Mascot';

export function Home({ onPick }: { onPick: (mode: Mode) => void }) {
  return (
    <div className="page">
      <Header onHome={() => undefined} />
      <main className="home">
        <section className="home-hero">
          <div>
            <span className="eyebrow">En soutien à la candidature de Jean-Luc Mélenchon</span>
            <h1>Ça change quoi <span className="marker">pour moi</span>&nbsp;?</h1>
            <p className="lede">Quelques questions sur votre quotidien, et les mesures du programme qui vous concernent vraiment. Citées mot pour mot, avec leur source.</p>
          </div>
          <div className="home-mascot">
            <Bubble className="bubble-down">Salut&nbsp;! Moi c’est <strong>Chati</strong>.</Bubble>
            <Mascot mood="happy" size={190} className="bob" />
          </div>
        </section>

        <section className="mode-grid">
          <button className="mode-card mode-game" onClick={() => onPick('jeu')}>
            <Sticker tone="red" tilt={4}>2 minutes</Sticker>
            <span className="mode-icon"><Gamepad2 size={30} strokeWidth={2.4} /></span>
            <strong>Je joue</strong>
            <span>Réponds à quelques questions, débloque des bonus et trouve les mesures faites pour toi.</span>
            <span className="mode-cta">C’est parti <ArrowRight size={18} strokeWidth={2.6} /></span>
          </button>
          <button className="mode-card mode-militant" onClick={() => onPick('militant')}>
            <Sticker tone="purple" tilt={-4}>Porte-à-porte</Sticker>
            <span className="mode-icon"><Megaphone size={30} strokeWidth={2.4} /></span>
            <strong>Je milite</strong>
            <span>Le guide d’entretien : les questions à poser, et les arguments qui collent à la personne en face.</span>
            <span className="mode-cta">Ouvrir le guide <ArrowRight size={18} strokeWidth={2.6} /></span>
          </button>
        </section>
        <Footnote />
      </main>
    </div>
  );
}
