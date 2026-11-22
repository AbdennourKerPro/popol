import { BookOpen, ChevronDown, Library, TrainFront, Utensils } from 'lucide-react';
import { Footnote, Header, MeasureQuote } from '../components/common';
import { LIEUX_DU_QUOTIDIEN } from '../content/quotidien';
import { mesure } from '../lib/programme';
import '../styles/quotidien.css';

const ICONES = {
  gare: TrainFront,
  cantine: Utensils,
  bibliotheque: Library,
};

export function Quotidien({ onHome }: { onHome: () => void }) {
  return (
    <div className="page">
      <Header onHome={onHome} />
      <main className="quotidien-main">
        <h1>Le programme <span className="marker">au quotidien</span></h1>
        <p className="lede">Choisis un lieu et ouvre la question pour découvrir une mesure.</p>
        <div className="quotidien-lieux">
          {LIEUX_DU_QUOTIDIEN.map(({ id, titre, question, mesureId }) => {
            const Icone = ICONES[id];
            return (
              <details className="quotidien-lieu" key={id}>
                <summary>
                  <span className="quotidien-lieu-entete">
                    <span className="quotidien-icone"><Icone size={22} aria-hidden="true" /></span>
                    <span>
                      <strong>{titre}</strong>
                      <span>{question}</span>
                    </span>
                    <ChevronDown className="quotidien-chevron" size={20} aria-hidden="true" />
                  </span>
                </summary>
                <MeasureQuote mesure={mesure(mesureId)} compact />
              </details>
            );
          })}
        </div>
        <a className="btn btn-secondary" href="#explorer">
          <BookOpen size={18} aria-hidden="true" /> Parcourir toutes les mesures
        </a>
      </main>
      <Footnote />
    </div>
  );
}
