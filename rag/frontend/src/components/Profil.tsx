import { useState } from 'react';
import { MAX_PROFILE, PROFILE_CHOICES, profileLabel } from '../lib/profile';
import type { Status } from '../lib/types';

const VISIBLE = 7;

/** « Je suis… »: up to three audiences, kept on this device. Seven choices first, « Tout voir » shows the others. */
export function ProfilePicker({ status, profile, onToggle }: { status: Status | null; profile: string[]; onToggle: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const known = status?.publics ?? [];
  if (!known.length) return null;
  const choices = PROFILE_CHOICES.filter(c => known.some(p => p.id === c.id));
  const shown = all ? choices : choices.filter((c, i) => i < VISIBLE || profile.includes(c.id));
  return (
    <div className="je-suis" role="group" aria-label="Votre situation, pour des réponses qui vous concernent">
      <span className="je-suis-titre">Je suis…</span>
      {shown.map(c => {
        const on = profile.includes(c.id);
        return (
          <button key={c.id} type="button" className="coche" aria-pressed={on} disabled={!on && profile.length >= MAX_PROFILE}
            title={known.find(p => p.id === c.id)?.label} onClick={() => onToggle(c.id)}>
            {c.label}
          </button>
        );
      })}
      {choices.length > shown.length && <button type="button" className="bouton bouton-texte" onClick={() => setAll(true)}>Tout voir</button>}
    </div>
  );
}

/** Reminder of the profile under the composer, with a link to clear it. */
export function ProfileReminder({ profile, onClear }: { profile: string[]; onClear: () => void }) {
  if (!profile.length) return null;
  return (
    <span className="rappel-profil" role="status">
      Profil : {profile.map(profileLabel).join(', ')} ·{' '}
      <button type="button" className="lien-discret" onClick={onClear} aria-label="Effacer le profil">effacer</button>
    </span>
  );
}
