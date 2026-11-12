import { describe, expect, it, vi } from 'vitest';
import { BusyError, chat, parseEvent, sendFeedback } from './api';
import type { Answer } from './types';

describe('SSE de Chati', () => {
  it('reconstruit les données et ignore les commentaires', () => {
    expect(parseEvent(': keepalive')).toBeNull();
    expect(parseEvent('event: status\ndata: {"label":"Recherche…"}')).toEqual({ event: 'status', data: { label: 'Recherche…' } });
  });
  it('traite des fragments de flux et exige la fin de réponse', async () => {
    const wire = 'event: status\ndata: {"label":"Recherche…"}\n\nevent: answer\ndata: {"status":"answered","blocks":[],"sources":[]}\n\nevent: done\ndata: {}\n\n';
    const bytes = new TextEncoder().encode(wire);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7)); c.close(); } }))));
    const status = vi.fn();
    const result = await chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, { onStatus: status });
    expect(result.status).toBe('answered'); expect(status).toHaveBeenCalledWith('Recherche…');
    vi.unstubAllGlobals();
  });
  it('transmet les passages trouvés avant la réponse', async () => {
    const wire = 'event: context\ndata: {"sources":[{"id":"p3c01-ss07-m001","subsection":"Retraites"}]}\n\nevent: answer\ndata: {"status":"answered","blocks":[],"sources":[]}\n\nevent: done\ndata: {}\n\n';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(wire)));
    const onContext = vi.fn();
    await chat([{ id: '1', role: 'user', content: 'Retraites' }], new AbortController().signal, { onStatus: vi.fn(), onContext });
    expect(onContext).toHaveBeenCalledWith([{ id: 'p3c01-ss07-m001', subsection: 'Retraites' }]);
    vi.unstubAllGlobals();
  });
  it('ne présente pas une réponse incomplète comme terminée', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('event: answer\ndata: {"blocks":[]}\n\n')));
    await expect(chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, { onStatus: vi.fn() })).rejects.toThrow('interrompue');
    vi.unstubAllGlobals();
  });
  it('affiche une erreur de configuration sans fabriquer de réponse', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'Configurez OPENAI_API_KEY' }), { status: 503 })));
    await expect(chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, { onStatus: vi.fn() })).rejects.toThrow('OPENAI_API_KEY');
    vi.unstubAllGlobals();
  });
  it('transmet les blocs provisoires et les efface à une nouvelle tentative', async () => {
    const block = (index: number, text: string) => `event: block\ndata: ${JSON.stringify({ index, kind: 'answer', text, source_ids: ['a'], points: [] })}\n\n`;
    const wire = block(0, 'Premier jet') + 'event: reset\ndata: {}\n\n' + block(1, 'Suite') + block(0, 'Début') + 'event: answer\ndata: {"status":"answered","blocks":[],"sources":[]}\n\nevent: done\ndata: {}\n\n';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(wire)));
    const onBlocks = vi.fn();
    await chat([{ id: '1', role: 'user', content: 'Retraites' }], new AbortController().signal, { onStatus: vi.fn(), onBlocks });
    expect(onBlocks.mock.calls.map(([blocks]) => blocks.map((b: { text: string }) => b.text))).toEqual([['Premier jet'], [], ['Suite'], ['Début', 'Suite']]);
    vi.unstubAllGlobals();
  });
  it('signale un fournisseur saturé avec le délai avant un nouvel essai', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('event: error\ndata: {"message":"Très sollicité","retry_after":12}\n\n')));
    const error = await chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, { onStatus: vi.fn() }).catch(e => e);
    expect(error).toBeInstanceOf(BusyError); expect(error.retryAfter).toBe(12); expect(error.message).toBe('Très sollicité');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('event: error\ndata: {"message":"Autre erreur"}\n\n')));
    const other = await chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, { onStatus: vi.fn() }).catch(e => e);
    expect(other).not.toBeInstanceOf(BusyError); expect(other.message).toBe('Autre erreur');
    vi.unstubAllGlobals();
  });
  it('transmet la recherche web et la mesure de suivi séparément de l’historique', async () => {
    const fetch = vi.fn(async () => new Response('event: answer\ndata: {"status":"answered"}\n\nevent: done\ndata: {}\n\n'));
    vi.stubGlobal('fetch', fetch);
    await chat([{ id: '1', role: 'user', content: 'Et aujourd’hui ?' }], new AbortController().signal, { onStatus: vi.fn() }, { research: true, focus_measure_id: 's01-ss14-m001' });
    const options = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(options.body as string)).toEqual({ messages: [{ role: 'user', content: 'Et aujourd’hui ?' }], research: true, focus_measure_id: 's01-ss14-m001' });
    await chat([{ id: '1', role: 'user', content: 'Et pour moi ?' }], new AbortController().signal, { onStatus: vi.fn() }, { profile: ['locataire'], standalone: true });
    expect(JSON.parse((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toEqual({ messages: [{ role: 'user', content: 'Et pour moi ?' }], research: false, profile: ['locataire'] });
    vi.unstubAllGlobals();
  });
});

const memory = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } }; };

describe('Accès par lien d’invitation', () => {
  it('envoie le jeton dans l’en-tête Authorization et jamais dans l’URL', async () => {
    const token = 'a'.repeat(43); const store = memory(); store.setItem('chati-invite', token);
    vi.stubGlobal('localStorage', store);
    const fetch = vi.fn(async () => new Response('event: answer\ndata: {"status":"answered"}\n\nevent: done\ndata: {}\n\n'));
    vi.stubGlobal('fetch', fetch);
    await chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, { onStatus: vi.fn() });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/chat'); expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`);
    vi.unstubAllGlobals();
  });
  it('déplace le jeton du fragment vers le stockage local et nettoie l’adresse', async () => {
    const { captureInvite } = await import('./invite');
    const token = 'b'.repeat(43); const store = memory(); const replaceState = vi.fn();
    expect(captureInvite({ hash: `#t=${token}`, pathname: '/', search: '?x=1' }, store, { replaceState })).toBe(token);
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?x=1'); expect(store.getItem('chati-invite')).toBe(token);
    expect(captureInvite({ hash: '', pathname: '/', search: '' }, store, { replaceState })).toBe(token);
    expect(captureInvite({ hash: '#t=court', pathname: '/', search: '' }, memory(), { replaceState })).toBeNull();
  });
  it('affiche le message d’accès renvoyé par le serveur', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'Lien d’accès invalide.' }), { status: 401 })));
    await expect(chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, { onStatus: vi.fn() })).rejects.toThrow('Lien d’accès invalide');
    vi.unstubAllGlobals();
  });
});

describe('Avis sur une réponse', () => {
  const answer = { request_id: 'r1', status: 'answered', mode: 'generated', blocks: [{ kind: 'answer', text: 'Texte de la réponse', source_ids: [] }], measures: [],
    sources: [{ id: 'p3c01-ss07-m001', type: 'mesure' }, { id: 'web-001', type: 'web' }] } as unknown as Answer;
  it('n’envoie que des identifiants et des codes', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    await sendFeedback(answer, { rating: 'down', reason: 'incomplet' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/feedback');
    expect(JSON.parse(init.body as string)).toEqual({ request_id: 'r1', rating: 'down', reason: 'incomplet', status: 'answered', mode: 'generated', source_ids: ['p3c01-ss07-m001'] });
    vi.unstubAllGlobals();
  });
  it('reste silencieux en cas d’échec réseau', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    await expect(sendFeedback(answer, { rating: 'up' })).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});
