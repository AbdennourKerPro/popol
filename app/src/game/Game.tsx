import { Check, Image as ImageIcon, ListPlus, RotateCcw, ScanSearch } from 'lucide-react';
import { useContext, useMemo, useState } from 'react';
import { CarteJeu } from '../components/Classement';
import { EstimationContext, chiffresConfirmes } from '../components/Estimator';
import { BackButton, Confetti, Footnote, Header, Progress, Sticker } from '../components/common';
import { LongueurPicker } from '../components/LongueurPicker';
import { Bubble, Mascot } from '../components/Mascot';
import { EN_TETE, tempsRestant } from '../content/questions';
import type { Longueur, Question } from '../content/types';
import { availableChoices } from '../lib/engine';
import { type Parcours, useParcours } from '../lib/useParcours';
import type { Values } from '../content/chiffrages';
import { PosterModal } from './PosterModal';

export function Game({ onHome, onExplore }: { onHome: () => void; onExplore: () => void }) {
  const parcours = useParcours();
  const { longueur, question, result } = parcours;
  const [values, setValues] = useState<Values>({});
  const estimation = useMemo(() => ({ values, tags: parcours.tags, tu: true, onChange: (input: string, value: number) => setValues((v) => ({ ...v, [input]: value })) }), [values, parcours.tags]);
  return (
    <EstimationContext.Provider value={estimation}>
    <div className="page game">
      <Header onHome={onHome} />
      <main className="game-main">
        {!longueur && (
          <section className="screen">
            <div className="screen-intro">
              <Mascot mood="idle" size={110} className="bob" />
              <Bubble className="bubble-left">On y va&nbsp;? <span>Plus tu réponds, plus ton classement est précis. Tu peux t’arrêter quand tu veux.</span></Bubble>
            </div>
            <LongueurPicker onPick={parcours.start} />
          </section>
        )}
        {longueur && question && <QuestionStep key={question.id} question={question} parcours={parcours} />}
        {longueur && result && <Resultat parcours={parcours} longueur={longueur} onExplore={onExplore} />}
      </main>
      <Footnote />
    </div>
    </EstimationContext.Provider>
  );
}

function QuestionStep({ question, parcours }: { question: Question; parcours: Parcours }) {
  const [selected, setSelected] = useState<string[]>([]);
  const choices = availableChoices(question, parcours.tags);
  const max = question.max ?? Infinity;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < max ? [...s, id] : s));
  return (
    <section className="screen question-screen">
      <div className="question-top">
        <BackButton onClick={parcours.back} />
        <Progress value={parcours.answered / Math.max(1, parcours.total)} />
        <span className="theme-chip accent-purple">{parcours.answered + 1} / {parcours.total}</span>
      </div>
      <p className="time-left">{tempsRestant(parcours.total - parcours.answered)}</p>
      <div className="question-head">
        <Mascot mood="think" size={104} className="bob" />
        <Bubble className="bubble-left question-bubble">
          {question.jeu}
          {question.multiple && <span>{question.max ? `${question.max} réponses au plus` : 'Plusieurs réponses possibles'}</span>}
        </Bubble>
      </div>
      <div className="choices">
        {choices.map((choice, i) => {
          const Icon = choice.icon;
          const on = selected.includes(choice.id);
          return (
            <button key={choice.id} className={`choice ${on ? 'on' : ''}`} style={{ animationDelay: `${i * 35}ms` }}
              aria-pressed={question.multiple ? on : undefined} disabled={question.multiple && !on && selected.length >= max}
              onClick={() => (question.multiple ? toggle(choice.id) : parcours.answer(question, [choice.id]))}>
              <span className="choice-icon">{on ? <Check size={22} strokeWidth={3} /> : <Icon size={22} strokeWidth={2.3} />}</span>
              {choice.label}
            </button>
          );
        })}
      </div>
      <div className="question-actions">
        {question.multiple && (
          <button className="btn btn-primary btn-wide" disabled={!selected.length} onClick={() => parcours.answer(question, selected)}>
            Valider {selected.length > 0 && `(${selected.length})`}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => parcours.answer(question, [])}>Passer</button>
      </div>
    </section>
  );
}

function Resultat({ parcours, longueur, onExplore }: { parcours: Parcours; longueur: Longueur; onExplore: () => void }) {
  const { top, others, defaut } = parcours.result!;
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [poster, setPoster] = useState(false);
  const [lengthen, setLengthen] = useState(false);
  const toggle = (id: string) => setKept((k) => { const next = new Set(k); if (!next.delete(id)) next.add(id); return next; });
  // The image carries the exact texts of the measures kept, or of the five first when none was kept.
  const chosen = useMemo(() => {
    const all = [...top, ...others];
    return kept.size ? all.filter((r) => kept.has(r.mesure.id)) : top.slice(0, 5);
  }, [kept, top, others]);
  const texts = useMemo(() => chosen.map((r) => r.mesure.texte), [chosen]);
  const estimation = useContext(EstimationContext)!;
  // Only the figures the person has set go on the image.
  const chiffres = useMemo(() => chiffresConfirmes(chosen.map((r) => r.mesure.id), estimation.values, estimation.tags), [chosen, estimation.values, estimation.tags]);

  if (!top.length) {
    return (
      <section className="screen intro-screen final-empty">
        <Mascot mood="think" size={150} className="bob" />
        <h2>Pas assez de réponses pour te cibler</h2>
        <p className="lede">Réponds à quelques questions de plus, ou parcours tout le programme.</p>
        <div className="final-actions">
          <button className="btn btn-primary" onClick={() => setLengthen(true)}><ListPlus size={18} strokeWidth={2.6} /> Répondre à plus de questions</button>
          <button className="btn btn-secondary" onClick={onExplore}><ScanSearch size={18} strokeWidth={2.6} /> Tout le programme</button>
        </div>
        {lengthen && <LongueurPicker from={longueur} answers={parcours.answers} onPick={parcours.start} />}
      </section>
    );
  }
  return (
    <section className="screen result-screen">
      <Confetti />
      <div className="screen-intro">
        <Mascot mood="happy" size={120} className="bob" />
        <Bubble className="bubble-left">{defaut ? 'Je ne t’ai pas assez cerné…' : 'Voilà ton classement !'} <span>{defaut ? 'Voici les mesures clés qui concernent le plus de monde. Réponds à plus de questions pour affiner.' : 'Garde celles qui te parlent : elles iront sur ton image.'}</span></Bubble>
      </div>
      <Sticker tone="red" tilt={-3}>Tes {top.length} priorités</Sticker>
      <ol className="rank-list">
        {top.map((r, i) => <CarteJeu key={r.mesure.id} r={r} rang={i + 1} kept={kept.has(r.mesure.id)} onKeep={() => toggle(r.mesure.id)} />)}
      </ol>
      {others.length > 0 && (
        <>
          <h2 className="rank-section">Et aussi pour toi</h2>
          <ul className="rank-list rank-others">
            {others.map((r) => <CarteJeu key={r.mesure.id} r={r} kept={kept.has(r.mesure.id)} onKeep={() => toggle(r.mesure.id)} />)}
          </ul>
        </>
      )}
      <div className="final-actions">
        <button className="btn btn-primary" onClick={() => setPoster(true)}><ImageIcon size={18} strokeWidth={2.6} /> Créer mon image{kept.size ? ` (${kept.size})` : ''}</button>
        {longueur !== 'long' && <button className="btn btn-secondary" onClick={() => setLengthen((v) => !v)}><ListPlus size={18} strokeWidth={2.6} /> Affiner mon classement</button>}
        <button className="btn btn-secondary" onClick={onExplore}><ScanSearch size={18} strokeWidth={2.6} /> Tout le programme</button>
        <button className="btn btn-ghost" onClick={parcours.reset}><RotateCcw size={18} strokeWidth={2.6} /> Recommencer</button>
      </div>
      {lengthen && (
        <div className="lengthen">
          <p className="lede">Quelques questions de plus : tes réponses sont gardées.</p>
          <LongueurPicker from={longueur} answers={parcours.answers} onPick={parcours.start} />
        </div>
      )}
      <p className="rank-note">Classement calculé sur cet appareil à partir de tes réponses. Les {EN_TETE} premières sont celles qui te concernent le plus.</p>
      {poster && <PosterModal themeId="programme" theme="Mon programme" mesures={texts} chiffres={chiffres} onClose={() => setPoster(false)} />}
    </section>
  );
}
