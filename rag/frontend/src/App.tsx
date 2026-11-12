import { useCallback, useEffect, useRef, useState } from 'react';
import { api, BusyError, chat, sendFeedback } from './lib/api';
import { getInvite } from './lib/invite';
import { cleanProfile, loadProfile, MAX_PROFILE, PROFILE_CHOICES, saveProfile } from './lib/profile';
import { stripInline } from './lib/richText';
import { sharedQuestion, shareAnswer, shareUrl, withoutQuestion } from './lib/share';
import { loadConversations, saveConversations } from './lib/storage';
import type { Answer, AnswerBlock, ChatMessage, ChatOptions, Conversation, Feedback, Quota, Source, Status } from './lib/types';
import { FOR_ME, pickSuggestions } from './content/suggestions';
import Accueil from './components/Accueil';
import APropos from './components/APropos';
import Attente from './components/Attente';
import Lateral, { BarreMobile } from './components/Lateral';
import LiensUtiles from './components/LiensUtiles';
import { AssistantMessage, UserMessage } from './components/Message';
import Saisie from './components/Saisie';
import SourcePanel from './components/SourcePanel';

const uuid = () => crypto.randomUUID();
const plainAnswer = (answer: Answer) => answer.blocks
  .map(b => [stripInline(b.text), ...(b.points ?? []).map(p => `• ${stripInline(p.text)}`)].join('\n')).join('\n\n');
const sourceLine = (s: Source) => (s.type === 'web'
  ? `${s.title} — ${s.source_url} (consulté le ${s.retrieved_at})` : `${s.id} — ${s.subsection} — ${s.source_url}`);

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [panel, setPanel] = useState<{ sources: Source[]; active?: string } | null>(null);
  const [usefulLinks, setUsefulLinks] = useState(false);
  const [info, setInfo] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [researchMode, setResearchMode] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [accessError, setAccessError] = useState('');
  const [busyRetry, setBusyRetry] = useState<{ left: number; text: string; options: ChatOptions } | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [draftBlocks, setDraftBlocks] = useState<AnswerBlock[]>([]);
  const [shownSuggestions] = useState(pickSuggestions);
  const [profile, setProfile] = useState<string[]>(() => loadProfile(PROFILE_CHOICES.map(c => c.id)));
  const controller = useRef<AbortController | null>(null);
  const deepLink = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const end = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const active = conversations.find(c => c.id === current);
  const messages = active?.messages ?? [];
  const closePanel = useCallback(() => setPanel(null), []);

  useEffect(() => {
    loadConversations().then(setConversations).catch(() => setStorageError(true)).finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveConversations(conversations)).catch(() => setStorageError(true));
  }, [conversations, loaded]);
  useEffect(() => {
    api<Status>('/api/status').then(setStatus).catch(() => setError('Connexion à Chati indisponible. Vérifiez que le serveur est démarré.'));
  }, []);
  useEffect(() => {
    if (!status?.beta_mode) return;
    if (!getInvite()) { setAccessError('Cette bêta est sur invitation. Ouvrez le lien personnel qui vous a été envoyé.'); return; }
    api<Quota & { label?: string }>('/api/me')
      .then(q => { setQuota(q); setAccessError(''); })
      .catch(e => setAccessError(e instanceof Error ? e.message : 'Accès impossible.'));
  }, [status?.beta_mode]);
  useEffect(() => {
    // Keep only the audiences this server knows (annotations may be absent).
    if (status) setProfile(old => cleanProfile(old, (status.publics ?? []).map(p => p.id)));
  }, [status]);
  useEffect(() => {
    // Shared link `?q=…`: ask it once the history and the access check are known.
    if (deepLink.current || !loaded || !status || (status.beta_mode && !quota && !accessError)) return;
    deepLink.current = true;  // StrictMode runs effects twice
    const question = sharedQuestion(window.location.search);
    if (!question) return;
    window.history.replaceState(null, '', withoutQuestion(window.location));
    if (accessError) setDraft(question); else send(question, false, { research: false, standalone: true });
  }, [loaded, status, quota, accessError]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, busy]);
  useEffect(() => {
    const area = textarea.current;
    if (area) { area.style.height = 'auto'; area.style.height = `${Math.min(area.scrollHeight, 160)}px`; }
  }, [draft]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    // Saturated provider: count down, then ask the same question again, once.
    if (!busyRetry) return;
    if (busyRetry.left <= 0) { setBusyRetry(null); send(busyRetry.text, true, busyRetry.options, true); return; }
    const timer = setTimeout(() => setBusyRetry(r => r && { ...r, left: r.left - 1 }), 1000);
    return () => clearTimeout(timer);
  }, [busyRetry]);
  useEffect(() => {
    if (!info && !mobileMenu) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = info ? document.querySelector('.info-dialog') : document.querySelector('.lateral.ouvert');
    const getFocusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button, a[href], input, summary') ?? [])];
    getFocusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setInfo(false); setMobileMenu(false); }
      if (event.key !== 'Tab') return;
      const elements = getFocusable(); const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [info, mobileMenu]);

  function clearProgress() { setBusy(false); setStage(''); setFound([]); setDraftBlocks([]); }
  function stop() { controller.current?.abort(); controller.current = null; clearProgress(); }
  function updateProfile(ids: string[]) { setProfile(ids); saveProfile(ids); }
  function toggleProfile(id: string) {
    updateProfile(profile.includes(id) ? profile.filter(p => p !== id) : [...profile, id].slice(0, MAX_PROFILE));
  }
  function cancelRetry() { if (busyRetry) setDraft(busyRetry.text); setBusyRetry(null); }
  function select(id: string | null) {
    stop(); setBusyRetry(null); setCurrent(id); setDraft(''); setError(''); setMobileMenu(false); setUsefulLinks(false);
    const last = conversations.find(c => c.id === id)?.messages.filter(m => m.role === 'user').at(-1);
    setResearchMode((last?.research ?? false) && !!status?.web_available);
    textarea.current?.focus();
  }
  function rename(id: string) {
    const title = window.prompt('Nom de la conversation', conversations.find(c => c.id === id)?.title);
    if (title?.trim()) setConversations(old => old.map(c => c.id === id ? { ...c, title: title.trim().slice(0, 100) } : c));
  }
  function remove(id: string) {
    if (!window.confirm('Supprimer cette conversation de cet appareil ?')) return;
    if (current === id) select(null);
    setConversations(old => old.filter(c => c.id !== id));
  }
  async function send(text: string, retry = false, options?: ChatOptions, autoRetry = false) {
    text = text.trim(); if (!text || busy || !loaded || accessError) return;
    setBusyRetry(null);
    const id = current ?? uuid(); const abort = new AbortController(); controller.current = abort;
    const last = messages.at(-1);
    const samePendingQuestion = last?.role === 'user' && last.content === text;
    // The profile used is kept on the question, so that asking it again is faithful.
    const defaults = { research: researchMode && !!status?.web_available, focus_measure_id: samePendingQuestion ? last?.focus_measure_id : undefined };
    const requestOptions = { ...(options ?? defaults), profile: options?.profile ?? (samePendingQuestion ? last?.profile : undefined) ?? profile };
    setResearchMode(requestOptions.research ?? false);
    const base = (retry || samePendingQuestion) && last?.role === 'user' ? messages.slice(0, -1) : messages;
    const next: ChatMessage[] = [...base, { id: uuid(), role: 'user', content: text, ...requestOptions }];
    setCurrent(id); setDraft(''); setError(''); setBusy(true); setStage('Recherche dans le programme…'); setFound([]); setDraftBlocks([]);
    setUsefulLinks(false);
    setConversations(old => [{ id, title: active?.title ?? text.slice(0, 64), messages: next, updated: Date.now() }, ...old.filter(c => c.id !== id)]
      .slice(0, 50));
    try {
      const answer = await chat(next, abort.signal, {
        onStatus: setStage,
        onContext: sources => { if (!abort.signal.aborted) setFound([...new Set(sources.map(s => s.subsection))].slice(0, 4)); },
        onBlocks: blocks => { if (!abort.signal.aborted) setDraftBlocks(blocks); },
      }, requestOptions);
      if (abort.signal.aborted) return;
      if (answer.quota) setQuota(answer.quota);
      const reply: ChatMessage = { id: uuid(), role: 'assistant', content: plainAnswer(answer), answer };
      setConversations(old => old.map(c => c.id === id ? { ...c, updated: Date.now(), messages: [...next, reply] } : c));
    } catch (e) {
      if (abort.signal.aborted) return;
      if (e instanceof BusyError && !autoRetry && e.retryAfter <= 120) { setBusyRetry({ left: e.retryAfter, text, options: requestOptions }); return; }
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.'); setDraft(text);
      if (status?.beta_mode && getInvite()) api<Quota>('/api/me').then(setQuota).catch(() => {});
    } finally {
      if (controller.current === abort) { clearProgress(); controller.current = null; }
    }
  }
  async function copy(message: ChatMessage) {
    const sources = message.answer?.sources ?? [];
    try {
      await navigator.clipboard.writeText(message.content + (sources.length ? '\n\nSources :\n' + sources.map(sourceLine).join('\n') : ''));
      setCopied(message.id); setTimeout(() => setCopied(null), 2000);
    } catch { setError('La copie n’est pas disponible dans ce navigateur. Vous pouvez sélectionner le texte.'); }
  }
  /** A generated answer can be shared when its question stands alone (first question, or a self-contained one). */
  const shareableQuestion = (mi: number) => {
    const answer = messages[mi].answer, question = messages[mi - 1];
    const alone = question?.role === 'user' && question.content !== FOR_ME && (mi === 1 || question.standalone);
    return answer?.mode === 'generated' && !answer.research && alone ? question.content : null;
  };
  async function share(message: ChatMessage, question: string) {
    try {
      const result = await shareAnswer({ question, text: stripInline(message.answer?.blocks[0]?.text ?? '') });
      if (result === 'copied') { setShared(message.id); setTimeout(() => setShared(null), 2000); }
    } catch { setError('Le partage n’est pas disponible dans ce navigateur.'); }
  }
  function rate(message: ChatMessage, feedback: Feedback) {
    if (!message.answer || message.feedback) return;
    setReasonFor(null);
    setConversations(old => old.map(c => c.id === current ? { ...c, messages: c.messages.map(m => m.id === message.id ? { ...m, feedback } : m) } : c));
    sendFeedback(message.answer, feedback);
  }
  async function shareImage(message: ChatMessage, question: string) {
    const answer = message.answer!;
    try {
      const { renderShareCard } = await import('./lib/shareCard');
      const points = answer.blocks.find(b => b.points?.length)?.points?.map(p => p.text) ?? [];
      const blob = await renderShareCard({ question, answer: answer.blocks[0]?.text ?? '', points, url: shareUrl(question) });
      const file = new File([blob], 'chati-reponse.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Chati' }); } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) throw e; }
        return;
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch { setError('L’image n’a pas pu être créée dans ce navigateur.'); }
  }
  function rephrase(mi: number) {
    setConversations(old => old.map(c => c.id === current ? { ...c, messages: c.messages.slice(0, -2) } : c));
    setDraft(messages[mi - 1]?.content ?? '');
    textarea.current?.focus();
  }

  return (
    <div className="app-shell">
      {mobileMenu && <button className="voile-lateral" onClick={() => setMobileMenu(false)} aria-label="Fermer le menu" tabIndex={-1} />}
      <Lateral conversations={conversations} current={current} open={mobileMenu} filter={filter} status={status}
        onFilter={setFilter} onSelect={select} onRename={rename} onRemove={remove} onClose={() => setMobileMenu(false)}
        onUsefulLinks={() => { setUsefulLinks(true); setMobileMenu(false); }} onInfo={() => { setInfo(true); setMobileMenu(false); }} />
      <BarreMobile onMenu={() => setMobileMenu(true)} />
      <main className="main">
        {storageError && (
          <div className="avertissement-stockage" role="status">
            L’historique local est indisponible. Cette conversation reste accessible jusqu’à la fermeture de la page.
          </div>
        )}
        {usefulLinks ? <LiensUtiles onBack={() => setUsefulLinks(false)} /> : (
          <>
            <div className={`conversation-area ${messages.length ? 'has-messages' : ''}`}>
              {!messages.length ? (
                <Accueil status={status} profile={profile} suggestions={shownSuggestions} disabled={busy || !loaded}
                  onToggleProfile={toggleProfile} onAsk={(text, options) => send(text, false, options)} />
              ) : (
                <section className="messages" aria-label="Échange avec Chati">
                  {messages.map((message, mi) => (message.role === 'user' ? <UserMessage key={message.id} message={message} /> : (
                    <AssistantMessage key={message.id} message={message} isLast={mi === messages.length - 1} busy={busy} status={status}
                      copied={copied === message.id} shared={shared === message.id} reasonsOpen={reasonFor === message.id}
                      shareable={shareableQuestion(mi)}
                      onPanel={(sources, activeId) => setPanel({ sources, active: activeId })}
                      onSend={(text, options) => send(text, false, options)}
                      onCopy={() => copy(message)} onShare={question => share(message, question)}
                      onShareImage={question => shareImage(message, question)} onRate={feedback => rate(message, feedback)}
                      onToggleReasons={() => setReasonFor(reasonFor === message.id ? null : message.id)} onRephrase={() => rephrase(mi)} />
                  )))}
                  {busy && <Attente stage={stage} found={found} draftBlocks={draftBlocks} />}
                  <div ref={end} />
                </section>
              )}
            </div>
            <Saisie textarea={textarea} draft={draft} busy={busy} loaded={loaded} status={status} error={error} accessError={accessError}
              quota={quota} retryLeft={busyRetry?.left ?? null} profile={profile} researchMode={researchMode}
              placeholder={messages.length ? 'Une autre question ?' : 'Une question sur le programme ?'}
              onDraft={setDraft} onSubmit={() => send(draft)} onStop={stop} onCancelRetry={cancelRetry} onCloseError={() => setError('')}
              onClearProfile={() => updateProfile([])} onToggleResearch={() => setResearchMode(value => !value)} onInfo={() => setInfo(true)} />
          </>
        )}
      </main>
      {panel && <SourcePanel sources={panel.sources} active={panel.active} close={closePanel} />}
      {info && <APropos status={status} onClose={() => setInfo(false)} />}
    </div>
  );
}
