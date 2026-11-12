import { authHeaders } from './invite';
import type { Answer, AnswerBlock, ChatMessage, ChatOptions, Feedback, Source } from './types';

export async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, headers: authHeaders() });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : 'Le service est momentanément indisponible.');
  }
  return response.json();
}

/** The provider is saturated: the same question can be asked again after `retryAfter` seconds. */
export class BusyError extends Error {
  retryAfter: number;
  constructor(message: string, retryAfter: number) { super(message); this.name = 'BusyError'; this.retryAfter = retryAfter; }
}

export function parseEvent(raw: string): { event: string; data: Record<string, unknown> } | null {
  const lines = raw.split('\n');
  const event = lines.find(l => l.startsWith('event:'))?.slice(6).trim();
  const data = lines.filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
  return event && data ? { event, data: JSON.parse(data) } : null;
}

/** Anonymous rating of an answer: identifiers and codes only, never the question or the answer.
 * A failure is silent (a rating is not worth an error message). */
export async function sendFeedback(answer: Answer, feedback: Feedback): Promise<void> {
  const source_ids = answer.sources.filter(s => s.type !== 'web').map(s => s.id).slice(0, 20);
  try {
    await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ request_id: answer.request_id, rating: feedback.rating, reason: feedback.reason ?? null, status: answer.status, mode: answer.mode, source_ids }) });
  } catch { /* network failure: ignored */ }
}

export interface ChatCallbacks {
  onStatus: (label: string) => void;
  /** Passages found by the search, before the answer is written. */
  onContext?: (sources: Source[]) => void;
  /** Blocks already written, before the checked answer replaces them (empty after a `reset`). */
  onBlocks?: (blocks: AnswerBlock[]) => void;
}

export async function chat(messages: ChatMessage[], signal: AbortSignal, { onStatus, onContext, onBlocks }: ChatCallbacks, options: ChatOptions = {}): Promise<Answer> {
  const history = messages.slice(-24).map(({ role, content }) => ({ role, content: content.slice(0, 12000) }));
  while (history.length > 1 && history.reduce((total, m) => total + m.content.length, 0) > 38000) history.shift();
  const response = await fetch('/api/chat', { method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ messages: history, research: options.research ?? false, focus_measure_id: options.focus_measure_id, ...(options.profile?.length ? { profile: options.profile } : {}) }) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : 'La demande n’a pas pu être traitée.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Impossible de lire la réponse.');
  const decoder = new TextDecoder();
  let buffer = ''; let answer: Answer | undefined; let finished = false; let provisional: AnswerBlock[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      let end: number;
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const parsed = parseEvent(buffer.slice(0, end)); buffer = buffer.slice(end + 2);
        if (!parsed) continue;
        if (parsed.event === 'error') {
          const retryAfter = Number(parsed.data.retry_after);
          throw retryAfter > 0 ? new BusyError(String(parsed.data.message), retryAfter) : new Error(String(parsed.data.message));
        }
        if (parsed.event === 'status') onStatus(String(parsed.data.label));
        if (parsed.event === 'context' && Array.isArray(parsed.data.sources)) onContext?.(parsed.data.sources as Source[]);
        if (parsed.event === 'block' && typeof parsed.data.index === 'number') {
          const { index, kind, text, source_ids, points } = parsed.data as unknown as AnswerBlock & { index: number };
          provisional = [...provisional]; provisional[index] = { kind, text, source_ids, points };
          onBlocks?.(provisional.filter(Boolean));
        }
        if (parsed.event === 'reset') { provisional = []; onBlocks?.([]); }
        if (parsed.event === 'answer') answer = parsed.data as unknown as Answer;
        if (parsed.event === 'done') finished = true;
      }
      if (done) break;
    }
  } finally { reader.releaseLock(); }
  if (!finished || !answer) throw new Error('La réponse a été interrompue. Vous pouvez réessayer.');
  return answer;
}
