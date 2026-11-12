const KEY = 'chati-profile';
export const MAX_PROFILE = 3;
type Store = Pick<Storage, 'getItem' | 'setItem'>;

/** Audiences shown on the home page, in this order, with a short label (the server's long
 * label is the tooltip). Only those the server knows are displayed. */
export const PROFILE_CHOICES: { id: string; label: string }[] = [
  { id: 'etudiant', label: 'Étudiant·e' }, { id: 'salarie', label: 'Salarié·e' }, { id: 'precaire', label: 'Précaire' },
  { id: 'chomeur', label: 'Sans emploi' }, { id: 'retraite', label: 'Retraité·e' }, { id: 'parent', label: 'Parent' },
  { id: 'locataire', label: 'Locataire' }, { id: 'proprietaire', label: 'Propriétaire' }, { id: 'rural', label: 'En zone rurale' },
  { id: 'agriculteur', label: 'Agriculteur·rice' }, { id: 'independant', label: 'Indépendant·e' }, { id: 'handicap', label: 'En situation de handicap' },
];

export function cleanProfile(ids: unknown, known: Iterable<string>): string[] {
  const allowed = new Set(known);
  return Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === 'string' && allowed.has(id)))].slice(0, MAX_PROFILE) : [];
}

/** The profile stays on this device; unknown identifiers (older lists) are dropped. */
export function loadProfile(known: Iterable<string>, store: Store = localStorage): string[] {
  try { return cleanProfile(JSON.parse(store.getItem(KEY) ?? '[]'), known); } catch { return []; }
}

export function saveProfile(ids: string[], store: Store = localStorage): void {
  try { store.setItem(KEY, JSON.stringify(ids.slice(0, MAX_PROFILE))); } catch { /* private mode: kept for this visit only */ }
}

export const profileLabel = (id: string) => PROFILE_CHOICES.find(c => c.id === id)?.label ?? id;
