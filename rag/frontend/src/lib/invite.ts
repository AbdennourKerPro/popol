const KEY = 'chati-invite';
const SHAPE = /^[A-Za-z0-9_-]{20,128}$/;

/** The access link carries its token in the URL fragment (`/#t=…`): a fragment is never sent
 * to the server, never appears in logs or in the Referer header. It is moved to local storage
 * and removed from the address bar. */
type Place = Pick<Location, 'hash' | 'pathname' | 'search'>;
type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function captureInvite(place: Place = window.location, store: Store = localStorage, history: Pick<History, 'replaceState'> = window.history): string | null {
  try {
    const match = /^#t=([^&]+)$/.exec(place.hash);
    if (match && SHAPE.test(match[1])) {
      store.setItem(KEY, match[1]);
      history.replaceState(null, '', place.pathname + place.search);
    }
    const stored = store.getItem(KEY);
    return stored && SHAPE.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function getInvite(): string | null {
  try {
    const stored = localStorage.getItem(KEY);
    return stored && SHAPE.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function authHeaders(): Record<string, string> {
  const token = getInvite();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
