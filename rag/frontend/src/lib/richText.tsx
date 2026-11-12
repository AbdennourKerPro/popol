import type { ReactNode } from 'react';

const BOLD = /\*\*([^*\n]+?)\*\*/g;

/** Renders the only formatting the model may use: `**key figure**`. Everything else stays
 * plain text (React escapes it), so no HTML from an answer is ever interpreted. An unclosed
 * `**` is left as written. */
export function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(BOLD)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<strong key={match.index} className="key-figure">{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Same text without the `**` markers (copy, share). */
export function stripInline(text: string): string {
  return text.replace(BOLD, '$1');
}
