import { describe, expect, it, vi } from 'vitest';
import { chat, parseEvent } from './api';

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
    const result = await chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, status);
    expect(result.status).toBe('answered'); expect(status).toHaveBeenCalledWith('Recherche…');
    vi.unstubAllGlobals();
  });
  it('ne présente pas une réponse incomplète comme terminée', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('event: answer\ndata: {"blocks":[]}\n\n')));
    await expect(chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, vi.fn())).rejects.toThrow('interrompue');
    vi.unstubAllGlobals();
  });
  it('affiche une erreur de configuration sans fabriquer de réponse', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'Configurez OPENAI_API_KEY' }), { status: 503 })));
    await expect(chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, vi.fn())).rejects.toThrow('OPENAI_API_KEY');
    vi.unstubAllGlobals();
  });
  it('transmet la recherche web et la mesure de suivi séparément de l’historique', async () => {
    const fetch = vi.fn(async () => new Response('event: answer\ndata: {"status":"answered"}\n\nevent: done\ndata: {}\n\n'));
    vi.stubGlobal('fetch', fetch);
    await chat([{ id: '1', role: 'user', content: 'Et aujourd’hui ?' }], new AbortController().signal, vi.fn(), { research: true, focus_measure_id: 's01-ss14-m001' });
    const options = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(options.body as string)).toEqual({ messages: [{ role: 'user', content: 'Et aujourd’hui ?' }], research: true, focus_measure_id: 's01-ss14-m001' });
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
    await chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, vi.fn());
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
    await expect(chat([{ id: '1', role: 'user', content: 'Bonjour' }], new AbortController().signal, vi.fn())).rejects.toThrow('Lien d’accès invalide');
    vi.unstubAllGlobals();
  });
});
