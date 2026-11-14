import { ArrowRight, Ear, Lightbulb, ListPlus, Lock, MessageCircleQuestionMark, RotateCcw, ScanSearch, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Values } from '../content/chiffrages';
import { ArgumentMilitant } from '../components/Classement';
import { EstimationContext } from '../components/Estimator';
import { BackButton, Footnote, Header, Sticker } from '../components/common';
import { LongueurPicker } from '../components/LongueurPicker';
import { Mascot } from '../components/Mascot';
import { EN_TETE, QUESTIONS, tempsRestant } from '../content/questions';
import type { Longueur, Question } from '../content/types';
import { type Answers, availableChoices, classement } from '../lib/engine';
import { type Parcours, useParcours } from '../lib/useParcours';

export function Militant({ onHome, onExplore }: { onHome: () => void; onExplore: () => void }) {
  const parcours = useParcours('militant');
  const { longueur, question, result } = parcours;
  const [sheet, setSheet] = useState(false);
  const [values, setValues] = useState<Values>({});
  const reset = () => { setValues({}); parcours.reset(); };
  const estimation = useMemo(() => ({ values, tags: parcours.tags, tu: false, onChange: (input: string, value: number) => setValues((v) => ({ ...v, [input]: value })) }), [values, parcours.tags]);
  // While the interview runs, the panel shows the measures that already stand out.
  const live = longueur && question ? classement(parcours.answers, longueur).top : [];

  return (
    <EstimationContext.Provider value={estimation}>
    <div className="page militant">
      <Header onHome={onHome}>
        {longueur && <button className="btn btn-small btn-ghost" onClick={reset} aria-label="Nouvelle personne"><RotateCcw size={15} strokeWidth={2.6} /> <span className="hide-sm">Nouvelle personne</span></button>}
      </Header>
      <main className="mil-main">
        {!longueur && (
          <section className="screen">
            <div className="mil-intro">
              <div>
                <Sticker tone="purple" tilt={-3}>Mode militant</Sticker>
                <h1>Le guide <span className="marker">d’entretien</span></h1>
                <p className="lede">Posez les questions à voix haute et touchez les réponses. Les arguments adaptés à la personne se classent au fur et à mesure.</p>
              </div>
              <ul className="tips">
                <li><Ear size={20} strokeWidth={2.4} /> Écoutez plus que vous ne parlez.</li>
                <li><MessageCircleQuestionMark size={20} strokeWidth={2.4} /> Toutes les questions sont facultatives.</li>
                <li><Lock size={20} strokeWidth={2.4} /> Rien n’est enregistré : dites-le.</li>
              </ul>
            </div>
            <h2 className="rank-section">Combien de temps avez-vous&nbsp;?</h2>
            <LongueurPicker mode="militant" onPick={parcours.start} />
          </section>
        )}

        {longueur && question && (
          <div className="mil-grid">
            <section>
              <Script question={question} parcours={parcours} />
              <Recap answers={parcours.answers} onRevisit={parcours.revisit} />
            </section>
            <aside className={`args-panel ${sheet ? 'open' : ''}`}>
              <div className="args-head">
                <h2>Arguments qui ressortent <span className="count">{live.length}</span></h2>
                <button className="icon-btn sheet-close" onClick={() => setSheet(false)} aria-label="Fermer"><X size={20} /></button>
              </div>
              {live.length ? <ol className="args args-numbered">{live.map((r, i) => <ArgumentMilitant key={r.mesure.id} r={r} rang={i + 1} />)}</ol> : (
                <div className="args-empty"><Mascot mood="think" size={80} /><p>Les arguments apparaissent au fil des réponses.</p></div>
              )}
            </aside>
            <button className="sheet-toggle btn btn-primary" onClick={() => setSheet(true)}>Arguments <span className="count">{live.length}</span></button>
          </div>
        )}

        {longueur && result && <Synthese parcours={parcours} longueur={longueur} onExplore={onExplore} onReset={reset} />}
      </main>
      <Footnote />
    </div>
    </EstimationContext.Provider>
  );
}

function Script({ question, parcours }: { question: Question; parcours: Parcours }) {
  const [selected, setSelected] = useState<string[]>([]);
  const choices = availableChoices(question, parcours.tags);
  const max = question.max ?? Infinity;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < max ? [...s, id] : s));
  return (
    <div className="script" key={question.id}>
      <div className="script-top">
        <BackButton onClick={parcours.back} label="Précédente" />
        <span className="script-step">Question {parcours.answered + 1} sur {parcours.total} · {tempsRestant(parcours.total - parcours.answered)}</span>
      </div>
      <Sticker tone="purple" tilt={-2}>À demander</Sticker>
      <p className="script-line">« {question.militant} »</p>
      <p className="script-why"><Lightbulb size={16} strokeWidth={2.4} /> {question.pourquoi}</p>
      <div className="chips" key={question.id}>
        {choices.map((choice) => (
          <button key={choice.id} className={`chip ${selected.includes(choice.id) ? 'on' : ''}`}
            aria-pressed={question.multiple ? selected.includes(choice.id) : undefined}
            disabled={question.multiple && !selected.includes(choice.id) && selected.length >= max}
            onClick={() => (question.multiple ? toggle(choice.id) : parcours.answer(question, [choice.id]))}>
            <choice.icon size={17} strokeWidth={2.4} /> {choice.label}
          </button>
        ))}
      </div>
      <div className="script-actions">
        {question.multiple && (
          <button className="btn btn-primary" disabled={!selected.length} onClick={() => parcours.answer(question, selected)}>
            Valider <ArrowRight size={17} strokeWidth={2.6} />
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => parcours.answer(question, [])}>Passer</button>
      </div>
    </div>
  );
}

function Recap({ answers, onRevisit }: { answers: Answers; onRevisit: (id: string) => void }) {
  const given = Object.entries(answers).filter(([, ids]) => ids.length);
  if (!given.length) return null;
  return (
    <div className="recap">
      <span className="eyebrow">Ce que la personne a dit</span>
      <div className="recap-list">
        {given.map(([qid, ids]) => (
          <button key={qid} className="recap-item" onClick={() => onRevisit(qid)} title="Revenir à cette question">
            {QUESTIONS[qid].choices.filter((c) => ids.includes(c.id)).map((c) => c.label).join(', ')}
          </button>
        ))}
      </div>
    </div>
  );
}

function Synthese({ parcours, longueur, onExplore, onReset }: { parcours: Parcours; longueur: Longueur; onExplore: () => void; onReset: () => void }) {
  const { top, others, defaut } = parcours.result!;
  const [lengthen, setLengthen] = useState(false);
  return (
    <section className="screen synthese">
      <div className="synthese-head">
        <Mascot mood="happy" size={100} className="bob" />
        <div>
          <Sticker tone="red" tilt={-3}>Synthèse</Sticker>
          <h1>À dire <span className="marker">en priorité</span></h1>
        </div>
      </div>
      <Recap answers={parcours.answers} onRevisit={parcours.revisit} />
      {defaut && <p className="lede">Les réponses ne permettent pas encore de cibler : voici les mesures clés qui concernent le plus de monde.</p>}
      {top.length ? (
        <>
          <h2 className="rank-section">Les {Math.min(EN_TETE, top.length)} mesures qui concernent le plus la personne</h2>
          <ol className="args args-numbered">{top.map((r, i) => <ArgumentMilitant key={r.mesure.id} r={r} rang={i + 1} />)}</ol>
        </>
      ) : <p className="lede">Aucune mesure ciblée avec ces réponses : posez des questions de plus, ou parcourez le programme avec la personne.</p>}
      {others.length > 0 && (
        <div className="block">
          <h2>Si la discussion continue</h2>
          <ul className="args">{others.map((r) => <ArgumentMilitant key={r.mesure.id} r={r} />)}</ul>
        </div>
      )}
      <p className="honesty">Les phrases d’argument sont des reformulations de l’appli, sans ajout. Le texte exact du programme et sa page sur melenchon2027.fr sont sous chaque argument : en cas de doute, lisez la citation.</p>
      <div className="final-actions">
        {longueur === 'court' && <button className="btn btn-primary" onClick={() => setLengthen((v) => !v)}><ListPlus size={18} strokeWidth={2.6} /> Poser plus de questions</button>}
        <button className="btn btn-secondary" onClick={onExplore}><ScanSearch size={18} strokeWidth={2.6} /> Tout le programme</button>
        <button className="btn btn-secondary" onClick={onReset}><RotateCcw size={18} strokeWidth={2.6} /> Nouvelle personne</button>
      </div>
      {lengthen && <LongueurPicker mode="militant" from={longueur} answers={parcours.answers} onPick={parcours.start} />}
    </section>
  );
}
