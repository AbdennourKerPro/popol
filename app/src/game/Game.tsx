import { Check, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BackButton, Confetti, Footnote, Header, MeasureQuote, Progress, Sticker } from '../components/common';
import { Bubble, Mascot } from '../components/Mascot';
import { themeById } from '../content/themes';
import type { Question, Quiz as QuizContent, Theme } from '../content/types';
import type { Values } from '../content/estimations';
import { type Answers, rank, remaining, rewind, tagsOf } from '../lib/engine';
import { ThemePicker } from '../screens/ThemePicker';
import { Final } from './Final';
import { Swipe } from './Swipe';

type Step = 'themes' | 'question' | 'quiz' | 'intro' | 'swipe' | 'final';

export function Game({ onHome }: { onHome: () => void }) {
  const [step, setStep] = useState<Step>('themes');
  const [themeId, setThemeId] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [history, setHistory] = useState<string[]>([]);
  const [quizDone, setQuizDone] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Set<string>>(new Set());
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState<Record<string, string[]>>({});
  const [bonus, setBonus] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({});
  const theme = themeById(themeId);
  const tags = useMemo(() => tagsOf(answers), [answers]);

  const discover = (...ids: string[]) => setDiscovered((prev) => new Set([...prev, ...ids]));

  /** `given`: answers given during this visit of the theme (answers carried over from another theme do not count). */
  const nextStep = (t: Theme, a: Answers, given: number, quizzed = quizDone.has(t.id)): Step => {
    const left = remaining(t, a);
    if (!quizzed && (given >= t.quizApres || !left.length)) return 'quiz';
    return left.length ? 'question' : 'intro';
  };

  const start = (id: string) => {
    const t = themeById(id)!;
    setThemeId(id);
    setHistory([]);
    setStep(nextStep(t, answers, 0));
    window.scrollTo(0, 0);
  };

  const answer = (question: Question, choiceIds: string[]) => {
    const next = { ...answers, [question.id]: choiceIds };
    setAnswers(next);
    setHistory([...history, question.id]);
    const teaser = question.choices.find((c) => choiceIds.includes(c.id) && c.teaser && !discovered.has(c.teaser))?.teaser;
    if (teaser) { setBonus(teaser); discover(teaser); }
    setStep(nextStep(theme!, next, history.length + 1));
  };

  const back = () => {
    if (!history.length) return setStep('themes');
    const [a, h] = rewind(answers, history, history[history.length - 1]);
    setAnswers(a);
    setHistory(h);
    setStep('question');
  };

  const finishQuiz = () => {
    const quizzed = new Set(quizDone).add(theme!.id);
    setQuizDone(quizzed);
    discover(theme!.quiz.mesure);
    setStep(nextStep(theme!, answers, history.length, true));
  };

  const finishSwipe = (kept: string[], seen: string[]) => {
    setLiked({ ...liked, [theme!.id]: kept });
    discover(...seen);
    setDone(new Set(done).add(theme!.id));
    setStep('final');
  };

  return (
    <div className="page game">
      <Header onHome={onHome}>
        <span className="counter" key={discovered.size} title="Mesures découvertes">
          <Sparkles size={16} strokeWidth={2.5} /> {discovered.size} <span>découverte{discovered.size > 1 ? 's' : ''}</span>
        </span>
      </Header>
      <main className="game-main">
        {step === 'themes' && (
          <section className="screen">
            <div className="screen-intro">
              <Mascot mood="idle" size={110} className="bob" />
              <Bubble className="bubble-left">On parle de quoi&nbsp;? <span>Choisis un thème, tu pourras en faire d’autres après.</span></Bubble>
            </div>
            <ThemePicker done={done} onPick={start} cta="Jouer" />
          </section>
        )}
        {step === 'question' && theme && (() => {
          const left = remaining(theme, answers);
          const answered = theme.questions.filter((id) => id in answers).length;
          return <QuestionStep key={left[0].id} question={left[0]} progress={answered / (answered + left.length)} onAnswer={answer} onBack={back} theme={theme} />;
        })()}
        {step === 'quiz' && theme && <Quiz key={theme.id} quiz={theme.quiz} onDone={finishQuiz} />}
        {step === 'intro' && theme && <Intro theme={theme} answers={answers} onNext={() => setStep('swipe')} onSkip={() => finishSwipe([], [])} />}
        {step === 'swipe' && theme && <Swipe theme={theme} ranked={rank(theme, answers).slice(0, 8)} onDone={finishSwipe} />}
        {step === 'final' && theme && (
          <Final theme={theme} liked={liked[theme.id] ?? []} done={done} tags={tags} values={values}
            onValue={(input, value) => setValues((v) => ({ ...v, [input]: value }))}
            onOther={() => setStep('themes')} onHome={onHome} />
        )}
      </main>
      {bonus && <Bonus id={bonus} onClose={() => setBonus(null)} />}
      <Footnote />
    </div>
  );
}

function QuestionStep({ question, progress, theme, onAnswer, onBack }: {
  question: Question; progress: number; theme: Theme;
  onAnswer: (q: Question, choices: string[]) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <section className="screen question-screen">
      <div className="question-top">
        <BackButton onClick={onBack} />
        <Progress value={progress} />
        <span className={`theme-chip accent-${theme.accent}`}>{theme.titre}</span>
      </div>
      <div className="question-head">
        <Mascot mood="think" size={104} className="bob" />
        <Bubble className="bubble-left question-bubble">
          {question.jeu}
          {question.multiple && <span>Plusieurs réponses possibles</span>}
        </Bubble>
      </div>
      <div className="choices">
        {question.choices.map((choice, i) => {
          const Icon = choice.icon;
          const on = selected.includes(choice.id);
          return (
            <button key={choice.id} className={`choice ${on ? 'on' : ''}`} style={{ animationDelay: `${i * 45}ms` }}
              aria-pressed={question.multiple ? on : undefined}
              onClick={() => (question.multiple ? toggle(choice.id) : onAnswer(question, [choice.id]))}>
              <span className="choice-icon">{on ? <Check size={22} strokeWidth={3} /> : <Icon size={22} strokeWidth={2.3} />}</span>
              {choice.label}
            </button>
          );
        })}
      </div>
      {question.multiple && (
        <button className="btn btn-primary btn-wide" disabled={!selected.length} onClick={() => onAnswer(question, selected)}>
          Valider {selected.length > 0 && `(${selected.length})`}
        </button>
      )}
    </section>
  );
}

function Quiz({ quiz, onDone }: { quiz: QuizContent; onDone: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === quiz.bonne;
  return (
    <section className="screen quiz-screen">
      {right && <Confetti />}
      <div className="quiz-card">
        <Sticker tone="red" tilt={-5}>Petit quiz&nbsp;!</Sticker>
        <div className="quiz-head">
          <Mascot mood={picked === null ? 'think' : right ? 'happy' : 'wow'} size={96} />
          <h2>{quiz.question}</h2>
        </div>
        <div className="quiz-options">
          {quiz.options.map((option, i) => (
            <button key={option} disabled={picked !== null}
              className={`quiz-option ${picked !== null && i === quiz.bonne ? 'right' : ''} ${picked === i && !right ? 'wrong' : ''}`}
              onClick={() => setPicked(i)}>{option}</button>
          ))}
        </div>
        {picked !== null && (
          <div className="quiz-answer">
            <strong className={right ? 'yes' : 'no'}>{right ? 'Bien vu !' : `Raté ! C’est ${quiz.options[quiz.bonne]}.`}</strong>
            <MeasureQuote id={quiz.mesure} />
            <button className="btn btn-primary btn-wide" onClick={onDone}>On continue</button>
          </div>
        )}
      </div>
    </section>
  );
}

function Intro({ theme, answers, onNext, onSkip }: { theme: Theme; answers: Answers; onNext: () => void; onSkip: () => void }) {
  const count = Math.min(8, rank(theme, answers).length);
  return (
    <section className="screen intro-screen">
      {count > 0 && <Confetti />}
      <Mascot mood={count ? 'happy' : 'think'} size={170} className="bob" />
      {count ? (
        <>
          <h2>J’ai trouvé <span className="marker">{count} mesure{count > 1 ? 's' : ''}</span> pour toi&nbsp;!</h2>
          <p className="lede">Garde celles qui te parlent, passe les autres. À la fin, tu auras ton programme à toi.</p>
          <button className="btn btn-primary btn-big" onClick={onNext}>Voir mes mesures</button>
        </>
      ) : (
        <>
          <h2>Pas de mesure ciblée avec ces réponses</h2>
          <p className="lede">Mais il y a ce qui change pour tout le monde.</p>
          <button className="btn btn-primary btn-big" onClick={onSkip}>Voir quand même</button>
        </>
      )}
    </section>
  );
}

function Bonus({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <Confetti />
      <div className="bonus-card" role="dialog" aria-modal="true" aria-labelledby="bonus-title" onClick={(e) => e.stopPropagation()}>
        <Sticker tone="red" tilt={-6}>Bonus débloqué&nbsp;!</Sticker>
        <div className="bonus-head">
          <Mascot mood="wow" size={86} />
          <h2 id="bonus-title">Tiens, ça devrait te parler…</h2>
        </div>
        <MeasureQuote id={id} />
        <button className="btn btn-primary btn-wide" autoFocus onClick={onClose}>Trop bien, la suite&nbsp;!</button>
      </div>
    </div>
  );
}

