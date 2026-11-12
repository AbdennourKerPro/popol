import type { RefObject } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import type { Quota, Status } from '../lib/types';
import { ProfileReminder } from './Profil';

interface Props {
  textarea: RefObject<HTMLTextAreaElement | null>;
  draft: string;
  busy: boolean;
  loaded: boolean;
  status: Status | null;
  error: string;
  accessError: string;
  quota: Quota | null;
  retryLeft: number | null;
  profile: string[];
  researchMode: boolean;
  placeholder: string;
  onDraft: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onCancelRetry: () => void;
  onCloseError: () => void;
  onClearProfile: () => void;
  onToggleResearch: () => void;
  onInfo: () => void;
}

const quotaText = (q: Quota) => (q.remaining === 0
  ? 'Vous avez utilisé vos questions du jour : les mesures restent consultables, les réponses reviennent demain.'
  : `${q.remaining} question${q.remaining > 1 ? 's' : ''} restante${q.remaining > 1 ? 's' : ''} aujourd’hui sur ${q.limit}.`);

/** Composer, the state lines above it (retry, errors, quota) and the options line below it. */
export default function Saisie(props: Props) {
  const { busy, status, quota, researchMode } = props;
  return (
    <div className="saisie">
      {props.retryLeft !== null && (
        <div className="etat" role="status">
          <span>Chati est très sollicité, nouvel essai dans {props.retryLeft} s…</span>
          <button className="bouton bouton-texte" onClick={props.onCancelRetry}>Annuler</button>
        </div>
      )}
      {props.error && (
        <div className="etat" role="alert">
          <span>{props.error}</span>
          <button className="bouton bouton-texte" onClick={props.onCloseError} aria-label="Fermer l’erreur">Fermer</button>
        </div>
      )}
      {!status?.index_ready && status?.index_message && <div className="etat">{status.index_message}</div>}
      {props.accessError && <div className="etat" role="alert">{props.accessError}</div>}
      {quota && !props.accessError && <div className="etat" role="status">{quotaText(quota)}</div>}
      <form className="champ" onSubmit={e => { e.preventDefault(); props.onSubmit(); }}>
        <label className="sr-only" htmlFor="question">Votre question sur le programme</label>
        <textarea ref={props.textarea} id="question" rows={1} maxLength={12000} value={props.draft} placeholder={props.placeholder}
          onChange={e => props.onDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy) props.onSubmit(); }
          }} />
        {busy ? (
          <button type="button" className="champ-envoyer arreter" onClick={props.onStop} aria-label="Arrêter la demande">
            <Square className="icone" fill="currentColor" />
          </button>
        ) : (
          <button type="submit" className="champ-envoyer" disabled={!props.draft.trim() || !props.loaded} aria-label="Envoyer la question">
            <ArrowUp className="icone" />
          </button>
        )}
      </form>
      <div className="saisie-pied">
        <span className="saisie-options">
          {status?.web_available && (
            <button type="button" className="coche" aria-pressed={researchMode} disabled={busy} onClick={props.onToggleResearch}
              title="Vérifier le contexte et les règles actuelles sur Internet">
              Vérifier aussi sur le web
            </button>
          )}
          <ProfileReminder profile={props.profile} onClear={props.onClearProfile} />
        </span>
        <span>Outil non officiel · <button type="button" className="lien-discret" onClick={props.onInfo}>À propos</button></span>
      </div>
    </div>
  );
}
