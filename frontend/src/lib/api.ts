import { authHeaders } from './invite';
import type { Answer, ChatMessage, ChatOptions } from './types';

export async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, headers: authHeaders() });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : 'Le service est momentanément indisponible.');
  }
  return response.json();
}

export function parseEvent(raw: string): { event: string; data: Record<string, unknown> } | null {
  const lines = raw.split('\n');
  const event = lines.find(l => l.startsWith('event:'))?.slice(6).trim();
  const data = lines.filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
  return event && data ? { event, data: JSON.parse(data) } : null;
}

export async function chat(messages: ChatMessage[], signal: AbortSignal, onStatus: (label: string) => void, options: ChatOptions = {}): Promise<Answer> {
  const history = messages.slice(-24).map(({ role, content }) => ({ role, content: content.slice(0, 12000) }));
  while (history.length > 1 && history.reduce((total, m) => total + m.content.length, 0) > 38000) history.shift();
  const response = await fetch('/api/chat', { method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ messages: history, research: options.research ?? false, focus_measure_id: options.focus_measure_id }) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : 'La demande n’a pas pu être traitée.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Impossible de lire la réponse.');
  const decoder = new TextDecoder();
  let buffer = ''; let answer: Answer | undefined; let finished = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      let end: number;
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const parsed = parseEvent(buffer.slice(0, end)); buffer = buffer.slice(end + 2);
        if (!parsed) continue;
        if (parsed.event === 'error') throw new Error(String(parsed.data.message));
        if (parsed.event === 'status') onStatus(String(parsed.data.label));
        if (parsed.event === 'answer') answer = parsed.data as unknown as Answer;
        if (parsed.event === 'done') finished = true;
      }
      if (done) break;
    }
  } finally { reader.releaseLock(); }
  if (!finished || !answer) throw new Error('La réponse a été interrompue. Vous pouvez réessayer.');
  return answer;
}
