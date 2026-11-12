import { ArrowRight, BookOpen, Check, Copy, ExternalLink, Globe, ImageDown, Share2, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ChatMessage, ChatOptions, Feedback, FeedbackReason, Source, Status } from '../lib/types';
import AnswerBlocks from './AnswerBlocks';
import { ChatiCat } from './ChatiCat';
import Followups from './Followups';

export const REASONS: { id: FeedbackReason; label: string }[] = [
  { id: 'incomplet', label: 'Incomplète' }, { id: 'hors_sujet', label: 'Hors sujet' },
  { id: 'pas_clair', label: 'Pas claire' }, { id: 'erreur', label: 'Erreur' },
];

export function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="user-message">
      <div>{message.content}{message.research && <small className="user-research-label"><Globe size={11} />Programme + web</small>}</div>
    </div>
  );
}

interface Props {
  message: ChatMessage;
  isLast: boolean;
  busy: boolean;
  status: Status | null;
  copied: boolean;
  shared: boolean;
  reasonsOpen: boolean;
  /** The question to share, when the answer can be shared on its own. */
  shareable: string | null;
  onPanel: (sources: Source[], active?: string) => void;
  onSend: (text: string, options?: ChatOptions) => void;
  onCopy: () => void;
  onShare: (question: string) => void;
  onShareImage: (question: string) => void;
  onRate: (feedback: Feedback) => void;
  onToggleReasons: () => void;
  onRephrase: () => void;
}

const cut = (text: string, length = 160) => (text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text);

export function AssistantMessage(props: Props) {
  const { message, busy, status } = props;
  const answer = message.answer;
  const sources = answer?.sources ?? [];
  const source = (id: string) => sources.find(s => s.id === id);
  const label = answer?.mode === 'consultation' ? 'EXTRAITS DU PROGRAMME' : answer?.research ? 'PROGRAMME + RECHERCHE WEB' : 'POUR MIEUX COMPRENDRE';
  const ask = (id: string, question: (text: string) => string, options: ChatOptions) => {
    const found = source(id);
    if (found) props.onSend(question(found.text), { ...options, focus_measure_id: id });
  };
  return (
    <article className="assistant-message">
      <div className="assistant-heading"><span className="mini-brand"><ChatiCat size={30} /></span><strong>Chati</strong><span>{label}</span></div>
      <div className="answer-body">
        {answer && <AnswerBlocks blocks={answer.blocks} sources={sources} onCite={id => props.onPanel(sources, id)} />}
        {answer?.mode === 'consultation' && sources.map(s => (
          <blockquote className="consultation-quote" key={s.id}>
            <span>{s.subsection}</span>{s.text}
            <button onClick={() => props.onPanel(sources, s.id)}>Voir le passage <ArrowRight size={13} /></button>
          </blockquote>
        ))}
        {!!answer?.related?.length && (
          <section className="related-measures" aria-label="À explorer dans le programme">
            <strong>À explorer dans le programme</strong>
            <div>
              {answer.related.map(r => (
                <button key={r.id} disabled={busy}
                  onClick={() => props.onSend(`Que prévoit le programme sur ce point : « ${r.text} » ?`, { research: false, focus_measure_id: r.id, standalone: true })}>
                  <span>{r.subsection}</span>{cut(r.text)}<ArrowRight size={14} />
                </button>
              ))}
            </div>
          </section>
        )}
        {!!answer?.measures.length && (
          <details className="measure-details" open={answer.measures.length <= 3}>
            <summary><BookOpen size={16} />Les mesures expliquées <span>{answer.measures.length}</span></summary>
            {answer.measures.map(m => (
              <div className="measure-explanation" key={m.id}>
                {source(m.id)?.categorie === 'cle' && <span className="key-measure-badge">Mesure clé</span>}
                <button onClick={() => props.onPanel(sources, m.id)}>{source(m.id)?.subsection ?? 'Mesure'}<ExternalLink size={13} /></button>
                <p>{m.explanation}</p>
                {m.expected_benefit && (
                  <p className="benefit">
                    <strong>{m.benefit_basis === 'analysis' ? 'Interprétation — avantage attendu : ' : 'Avantage attendu : '}</strong>
                    {m.expected_benefit}
                  </p>
                )}
                <div className="measure-followups">
                  {status?.web_available ? (
                    <>
                      <button disabled={busy} onClick={() => ask(m.id, text =>
                        `Explique simplement cette mesure avec un exemple concret et des sources externes : « ${text} »`, { research: true })}>
                        <Globe size={12} />Expliquer concrètement
                      </button>
                      <button disabled={busy} onClick={() => ask(m.id, text =>
                        `Quelle est la situation actuelle en France et qu’est-ce qui changerait avec cette mesure ? Vérifie sur Internet : « ${text} »`,
                      { research: true })}>
                        Comparer à aujourd’hui<ArrowRight size={12} />
                      </button>
                    </>
                  ) : (
                    <button disabled={busy} onClick={() => ask(m.id, text =>
                      `Que prévoit précisément le programme avec cette mesure : « ${text} » ?`, { research: false, standalone: true })}>
                      En savoir plus sur cette mesure<ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </details>
        )}
        <Followups items={answer?.followups ?? []} busy={busy} available={status?.generation_available ?? false}
          onSelect={item => props.onSend(item.question, { research: false })} />
        <div className="message-actions">
          <button onClick={props.onCopy} aria-label="Copier la réponse">
            {props.copied ? <Check size={15} /> : <Copy size={15} />}{props.copied ? 'Copié' : 'Copier'}
          </button>
          {props.shareable && (
            <button onClick={() => props.onShare(props.shareable!)} aria-label="Partager cette réponse">
              {props.shared ? <Check size={15} /> : <Share2 size={15} />}{props.shared ? 'Lien copié' : 'Partager'}
            </button>
          )}
          {props.shareable && (
            <button onClick={() => props.onShareImage(props.shareable!)} aria-label="Partager la réponse en image"><ImageDown size={15} />Image</button>
          )}
          {answer?.request_id && (
            <span className="feedback-buttons">
              {message.feedback && <span className="feedback-thanks">Merci pour votre avis</span>}
              <button disabled={!!message.feedback} aria-pressed={message.feedback?.rating === 'up'} aria-label="Réponse utile"
                onClick={() => props.onRate({ rating: 'up' })}><ThumbsUp size={15} /></button>
              <button disabled={!!message.feedback} aria-pressed={message.feedback?.rating === 'down'} aria-expanded={props.reasonsOpen}
                aria-label="Réponse à améliorer" onClick={props.onToggleReasons}><ThumbsDown size={15} /></button>
            </span>
          )}
          {!!sources.length && <button onClick={() => props.onPanel(sources)}><BookOpen size={15} />{sources.length} sources</button>}
          {props.isLast && <button disabled={busy} onClick={props.onRephrase}>Reformuler</button>}
        </div>
        {props.reasonsOpen && !message.feedback && (
          <div className="feedback-reasons" role="group" aria-label="Qu’est-ce qui ne va pas ?">
            <span>Qu’est-ce qui ne va pas ?</span>
            {REASONS.map(r => <button key={r.id} onClick={() => props.onRate({ rating: 'down', reason: r.id })}>{r.label}</button>)}
          </div>
        )}
      </div>
    </article>
  );
}
