type Place = Pick<Location, 'origin' | 'pathname'>;

/** Public link that asks the question again. Never carries the invitation token, which only
 * lives in the fragment (`#t=…`) and in local storage. */
export function shareUrl(question: string, place: Place = window.location): string {
  return `${place.origin}${place.pathname}?q=${encodeURIComponent(question)}`;
}

/** Reads the question of a shared link (`?q=`), if it has a usable length. */
export function sharedQuestion(search: string): string | null {
  const question = new URLSearchParams(search).get('q')?.trim();
  return question && question.length >= 2 && question.length <= 500 ? question : null;
}

/** The same address without `?q=`, other parameters and fragment kept. */
export function withoutQuestion(place: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  const params = new URLSearchParams(place.search); params.delete('q');
  const search = params.toString();
  return place.pathname + (search ? `?${search}` : '') + place.hash;
}

/** Native share sheet when available, otherwise the link is copied. */
export async function shareAnswer({ question, text }: { question: string; text: string }): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = shareUrl(question);
  if (typeof navigator.share === 'function') {
    try { await navigator.share({ title: 'Chati', text, url }); return 'shared'; }
    catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'; }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
