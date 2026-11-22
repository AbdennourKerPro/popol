import { ArrowRight, BookOpen, Gamepad2, MapPin } from 'lucide-react';
import { Footnote, Header, Sticker } from '../components/common';
import { Bubble, Mascot } from '../components/Mascot';
import { MARQUE } from '../content/brand';
import { MESURES } from '../lib/programme';

export function Home() {
  return (
    <div className="page">
      <Header onHome={() => undefined} />
      <main className="home">
        <section className="home-hero">
          <div>
            <span className="eyebrow">En soutien à la candidature de Jean-Luc Mélenchon</span>
            <h1>Le programme, ça change quoi <span className="marker">au quotidien</span>&nbsp;?</h1>
          </div>
          <div className="home-mascot">
            <Bubble className="bubble-down">{MARQUE.salutation}<strong>{MARQUE.surnom}</strong>.</Bubble>
            <Mascot mood="happy" size={190} className="bob" />
          </div>
        </section>

        <section className="mode-grid">
          <a className="mode-card mode-game" href="#jeu">
            <Sticker tone="red" tilt={4}>1 à 5 minutes</Sticker>
            <span className="mode-icon"><Gamepad2 size={30} strokeWidth={2.4} /></span>
            <strong>Je joue</strong>
            <span>Réponds à quelques questions sur ton quotidien et découvre les mesures qui te concernent.</span>
            <span className="mode-cta">C’est parti <ArrowRight size={18} strokeWidth={2.6} /></span>
          </a>
          <a className="mode-card mode-quotidien" href="#quotidien">
            <span className="mode-icon"><MapPin size={30} strokeWidth={2.4} /></span>
            <strong>Le programme au quotidien</strong>
            <span>Une gare, une cantine, une bibliothèque… Choisis un lieu pour découvrir ce que propose le programme.</span>
            <span className="mode-cta">Choisir un lieu <ArrowRight size={18} strokeWidth={2.6} /></span>
          </a>
        </section>
        <a className="explorer-link" href="#explorer">
          <BookOpen size={18} strokeWidth={2.5} />
          <span>Parcourir les {MESURES.length.toLocaleString('fr-FR')} mesures du programme</span>
          <ArrowRight size={16} strokeWidth={2.6} />
        </a>
        <footer className="home-footer">
          <a className="home-militant-link" href="#militant">Je milite · Ouvrir le guide de porte-à-porte</a>
          <Footnote />
        </footer>
      </main>
    </div>
  );
}
