import { ArrowRight, BookOpen, Gamepad2, Megaphone } from 'lucide-react';
import type { Mode } from '../App';
import { Footnote, Header, Sticker } from '../components/common';
import { Bubble, Mascot } from '../components/Mascot';
import { MARQUE } from '../content/brand';

export function Home({ onPick }: { onPick: (page: Mode | 'explorer') => void }) {
  return (
    <div className="page">
      <Header onHome={() => undefined} />
      <main className="home">
        <section className="home-hero">
          <div>
            <h1>Ça change quoi <span className="marker">pour moi</span>&nbsp;?</h1>
            <p className="lede">Répondez à quelques questions sur votre situation et découvrez les mesures qui vous concernent le plus&nbsp;!</p>
          </div>
          <div className="home-mascot">
            <Bubble className="bubble-down">{MARQUE.salutation}<strong>{MARQUE.surnom}</strong>.</Bubble>
            <Mascot mood="happy" size={190} className="bob" />
          </div>
        </section>

        <section className="mode-grid">
          <button className="mode-card mode-game" onClick={() => onPick('jeu')}>
            <Sticker tone="red" tilt={4}>1 à 5 minutes</Sticker>
            <span className="mode-icon"><Gamepad2 size={30} strokeWidth={2.4} /></span>
            <strong>Je joue</strong>
            <span>Réponds à quelques questions, en version courte, normale ou longue : tu obtiens ton classement de mesures.</span>
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
        <button className="explorer-link" onClick={() => onPick('explorer')}><BookOpen size={18} strokeWidth={2.5} /> Parcourir les 1&nbsp;069 mesures du programme <ArrowRight size={16} strokeWidth={2.6} /></button>
        <Footnote />
      </main>
    </div>
  );
}
