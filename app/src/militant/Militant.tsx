import { ArrowRight, ChevronDown, Ear, Layers, Lightbulb, Lock, MessageCircleQuestionMark, RotateCcw, ShieldQuestionMark, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BackButton, Footnote, Header, MeasureQuote, Sticker } from '../components/common';
import { ContextEstimator, EstimationContext } from '../components/Estimator';
import { Mascot } from '../components/Mascot';
import { ESTIMATIONS, type Values } from '../content/estimations';
import { QUESTIONS } from '../content/questions';
import { THEMES, themeById } from '../content/themes';
import type { Question, Theme } from '../content/types';
import { type Answers, type Ranked, rank, remaining, rewind, tagsOf } from '../lib/engine';
import { ThemePicker } from '../screens/ThemePicker';

type Step = 'themes' | 'interview' | 'synthese';

export function Militant({ onHome }: { onHome: () => void }) {
  const [step, setStep] = useState<Step>('themes');
  const [themeId, setThemeId] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [history, setHistory] = useState<string[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState(false);
  const [values, setValues] = useState<Values>({});
  const tags = useMemo(() => tagsOf(answers), [answers]);
  const estimation = useMemo(() => ({ values, tags, onChange: (input: string, value: number) => setValues((v) => ({ ...v, [input]: value })) }), [values, tags]);
  const theme = themeById(themeId);

  const open = (id: string, a = answers) => {
    setThemeId(id);
    setStep(remaining(themeById(id)!, a).length ? 'interview' : 'synthese');
    if (!remaining(themeById(id)!, a).length) setDone(new Set(done).add(id));
    window.scrollTo(0, 0);
  };

  const answer = (question: Question, choiceIds: string[]) => {
    const next = { ...answers, [question.id]: choiceIds };
    setAnswers(next);
    setHistory([...history, question.id]);
    if (!remaining(theme!, next).length) {
      setDone(new Set(done).add(theme!.id));
      setStep('synthese');
      window.scrollTo(0, 0);
    }
  };

  const revisit = (questionId: string) => {
    const [a, h] = rewind(answers, history, questionId);
    setAnswers(a);
    setHistory(h);
    setStep('interview');
  };

  const reset = () => {
    setAnswers({});
    setHistory([]);
    setValues({});
    setDone(new Set());
    setStep('themes');
  };

  const ranked = theme ? rank(theme, answers) : [];

  return (
    <div className="page militant">
      <Header onHome={onHome}>
        {step !== 'themes' && <button className="btn btn-small btn-ghost" onClick={reset} aria-label="Nouvelle personne"><RotateCcw size={15} strokeWidth={2.6} /> <span className="hide-sm">Nouvelle personne</span></button>}
      </Header>
      <EstimationContext.Provider value={estimation}>
      <main className="mil-main">
        {step === 'themes' && (
          <section className="screen">
            <div className="mil-intro">
              <div>
                <Sticker tone="purple" tilt={-3}>Mode militant</Sticker>
                <h1>Le guide <span className="marker">d’entretien</span></h1>
                <p className="lede">Posez les questions à voix haute et touchez les réponses. Les arguments adaptés à la personne apparaissent au fur et à mesure.</p>
              </div>
              <ul className="tips">
                <li><Ear size={20} strokeWidth={2.4} /> Écoutez plus que vous ne parlez.</li>
                <li><MessageCircleQuestionMark size={20} strokeWidth={2.4} /> Toutes les questions sont facultatives.</li>
                <li><Lock size={20} strokeWidth={2.4} /> Rien n’est enregistré : dites-le.</li>
              </ul>
            </div>
            <ThemePicker done={done} onPick={(id) => open(id)} cta="Commencer" />
          </section>
        )}

        {step !== 'themes' && theme && (
          <nav className="theme-tabs" aria-label="Thèmes">
            {THEMES.map((t) => (
              <button key={t.id} className={`theme-tab accent-${t.accent} ${t.id === theme.id ? 'active' : ''}`} onClick={() => open(t.id)}>
                <t.icon size={16} strokeWidth={2.5} /> {t.titre}
              </button>
            ))}
          </nav>
        )}

        {step === 'interview' && theme && (
          <div className="mil-grid">
            <section>
              <Script theme={theme} answers={answers} history={history} onAnswer={answer} onRevisit={revisit} />
              <Recap theme={theme} answers={answers} onRevisit={revisit} />
            </section>
            <aside className={`args-panel ${sheet ? 'open' : ''}`}>
              <div className="args-head">
                <h2>Arguments débloqués <span className="count">{ranked.length}</span></h2>
                <button className="icon-btn sheet-close" onClick={() => setSheet(false)} aria-label="Fermer"><X size={20} /></button>
              </div>
              {ranked.length ? <ArgList ranked={ranked} /> : (
                <div className="args-empty"><Mascot mood="think" size={80} /><p>Les arguments apparaissent au fil des réponses.</p></div>
              )}
            </aside>
            <button className="sheet-toggle btn btn-primary" onClick={() => setSheet(true)}>
              Arguments <span className="count">{ranked.length}</span>
            </button>
          </div>
        )}

        {step === 'synthese' && theme && (
          <Synthese theme={theme} answers={answers} ranked={ranked} onRevisit={revisit}
            next={THEMES.find((t) => !done.has(t.id) && t.id !== theme.id)} onOpen={open} onReset={reset} />
        )}
      </main>
      </EstimationContext.Provider>
      <Footnote />
    </div>
  );
}

function Script({ theme, answers, history, onAnswer, onRevisit }: {
  theme: Theme; answers: Answers; history: string[];
  onAnswer: (q: Question, choices: string[]) => void; onRevisit: (id: string) => void;
}) {
  const left = remaining(theme, answers);
  const question = left[0];
  const asked = theme.questions.filter((id) => id in answers).length;
  const [selected, setSelected] = useState<{ q: string; ids: string[] }>({ q: '', ids: [] });
  const ids = selected.q === question.id ? selected.ids : [];
  const toggle = (id: string) => setSelected({ q: question.id, ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  const last = history[history.length - 1];

  return (
    <div className="script" key={question.id}>
      <div className="script-top">
        {last ? <BackButton onClick={() => onRevisit(last)} label="Précédente" /> : <span />}
        <span className="script-step">Question {asked + 1} sur {asked + left.length}</span>
      </div>
      <Sticker tone="purple" tilt={-2}>À demander</Sticker>
      <p className="script-line">« {question.militant} »</p>
      <p className="script-why"><Lightbulb size={16} strokeWidth={2.4} /> {question.pourquoi}</p>
      <div className="chips">
        {question.choices.map((choice) => (
          <button key={choice.id} className={`chip ${ids.includes(choice.id) ? 'on' : ''}`}
            aria-pressed={question.multiple ? ids.includes(choice.id) : undefined}
            onClick={() => (question.multiple ? toggle(choice.id) : onAnswer(question, [choice.id]))}>
            <choice.icon size={17} strokeWidth={2.4} /> {choice.label}
          </button>
        ))}
      </div>
      <div className="script-actions">
        {question.multiple && (
          <button className="btn btn-primary" disabled={!ids.length} onClick={() => onAnswer(question, ids)}>
            Valider <ArrowRight size={17} strokeWidth={2.6} />
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => onAnswer(question, [])}>Passer</button>
      </div>
    </div>
  );
}

function Recap({ theme, answers, onRevisit }: { theme: Theme; answers: Answers; onRevisit: (id: string) => void }) {
  const given = Object.entries(answers).filter(([, ids]) => ids.length);
  if (!given.length) return null;
  return (
    <div className="recap">
      <span className="eyebrow">Ce que la personne a dit</span>
      <div className="recap-list">
        {given.map(([qid, ids]) => {
          const q = QUESTIONS[qid];
          const labels = q.choices.filter((c) => ids.includes(c.id)).map((c) => c.label).join(', ');
          const editable = theme.questions.includes(qid);
          return (
            <button key={qid} className="recap-item" disabled={!editable} onClick={() => onRevisit(qid)}
              title={editable ? 'Revenir à cette question' : 'Réponse donnée dans un autre thème'}>
              {labels}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Measures sharing one calculator (income tax and CSG) get it once per list. */
function firstWithEstimator() {
  const seen = new Set<unknown>();
  return (id: string) => {
    const estimation = ESTIMATIONS[id];
    if (!estimation || seen.has(estimation)) return false;
    seen.add(estimation);
    return true;
  };
}

function ArgList({ ranked, numbered = false }: { ranked: Ranked[]; numbered?: boolean }) {
  const showEstimator = firstWithEstimator();
  return (
    <ol className={`args ${numbered ? 'args-numbered' : ''}`}>
      {ranked.map(({ target, score }) => (
        <li key={target.mesure} className="arg">
          <details>
            <summary>
              <span className={`heat heat-${Math.min(score, 4)}`} aria-label={`Pertinence ${score}`} />
              <strong>{target.vous}</strong>
              <ChevronDown size={18} strokeWidth={2.5} className="arg-chevron" />
            </summary>
            <MeasureQuote id={target.mesure} compact />
            {showEstimator(target.mesure) && <ContextEstimator id={target.mesure} />}
          </details>
        </li>
      ))}
    </ol>
  );
}

function Synthese({ theme, answers, ranked, next, onOpen, onReset, onRevisit }: {
  theme: Theme; answers: Answers; ranked: Ranked[]; next?: Theme;
  onOpen: (id: string) => void; onReset: () => void; onRevisit: (id: string) => void;
}) {
  const top = ranked.slice(0, 3);
  const showEstimator = firstWithEstimator();
  return (
    <section className="screen synthese">
      <div className="synthese-head">
        <Mascot mood="happy" size={100} className="bob" />
        <div>
          <Sticker tone="red" tilt={-3}>Synthèse · {theme.titre}</Sticker>
          <h1>À dire <span className="marker">en priorité</span></h1>
        </div>
      </div>
      <Recap theme={theme} answers={answers} onRevisit={onRevisit} />

      {top.length ? (
        <ol className="priority">
          {top.map(({ target }, i) => (
            <li key={target.mesure} className="priority-card">
              <span className="priority-rank">{i + 1}</span>
              <p>{target.vous}</p>
              <MeasureQuote id={target.mesure} compact />
              {showEstimator(target.mesure) && <ContextEstimator id={target.mesure} />}
            </li>
          ))}
        </ol>
      ) : (
        <p className="lede">Aucune mesure ciblée avec ces réponses : appuyez-vous sur les mesures pour toute la société, plus bas.</p>
      )}

      {ranked.length > 3 && (
        <div className="block">
          <h2>Si la discussion continue</h2>
          <ArgList ranked={ranked.slice(3)} />
        </div>
      )}

      <div className="block">
        <h2><ShieldQuestionMark size={22} strokeWidth={2.5} /> Objections fréquentes</h2>
        {theme.objections.map((o) => (
          <details key={o.objection} className="objection">
            <summary>« {o.objection} » <ChevronDown size={18} strokeWidth={2.5} /></summary>
            <p>{o.reponse}</p>
            {o.mesures.map((id) => <MeasureQuote key={id} id={id} compact />)}
          </details>
        ))}
      </div>

      <div className="block">
        <h2><Users size={22} strokeWidth={2.5} /> Pour toute la société</h2>
        <div className="collectif-grid">
          {theme.collectif.map((id) => (
            <div key={id} className="collectif-item">
              <div className="collectif-card"><MeasureQuote id={id} compact /></div>
              <ContextEstimator id={id} />
            </div>
          ))}
        </div>
      </div>

      <p className="honesty">Les phrases d’argument et les réponses aux objections sont des formulations de l’appli. Seules les citations sont le texte du programme : en cas de doute, lisez la citation.</p>

      <div className="final-actions">
        {next && <button className="btn btn-primary" onClick={() => onOpen(next.id)}><Layers size={18} strokeWidth={2.6} /> Thème suivant : {next.titre}</button>}
        <button className="btn btn-secondary" onClick={onReset}><RotateCcw size={18} strokeWidth={2.6} /> Nouvelle personne</button>
      </div>
    </section>
  );
}
