import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, BookOpen, Check, CircleHelp, Copy, Ellipsis, ExternalLink, Globe, House, Leaf, Menu, MessageSquare, Pencil, Plus, Search, ShieldCheck, Square, Trash2, Users, X } from 'lucide-react';
import { api, chat } from './lib/api';
import { getInvite } from './lib/invite';
import { loadConversations, saveConversations } from './lib/storage';
import type { Answer, ChatMessage, ChatOptions, Conversation, Quota, Source, Status } from './lib/types';
import SourcePanel from './components/SourcePanel';
import Followups from './components/Followups';

const suggestions = [
  { icon: House, title: 'Se loger dignement', text: 'Quelles mesures pour rendre le logement plus accessible ?', category: 'LOGEMENT' },
  { icon: Leaf, title: 'Planifier la bifurcation', text: 'Que prévoit le programme pour la transition écologique ?', category: 'ÉCOLOGIE' },
  { icon: Users, title: 'Mieux vivre de son travail', text: 'Quelles propositions pour les salaires et le pouvoir d’achat ?', category: 'TRAVAIL' },
  { icon: ShieldCheck, title: 'Prendre soin de toutes et tous', text: 'Comment améliorer l’accès aux soins et à l’hôpital ?', category: 'SANTÉ' },
];
const blockTitles: Record<string, string> = { explanation: 'Comprendre la proposition', comparison: 'Ce qui changerait', benefits: 'Les avantages attendus', limits: 'Les points à préciser' };
const uuid = () => crypto.randomUUID();
const plainAnswer = (answer: Answer) => answer.blocks.map(b => b.text).join('\n\n');

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
  const controller = useRef<AbortController | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const end = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const active = conversations.find(c => c.id === current);
  const messages = active?.messages ?? [];
  const closePanel = useCallback(() => setPanel(null), []);

  useEffect(() => { loadConversations().then(setConversations).catch(() => setStorageError(true)).finally(() => setLoaded(true)); }, []);
  useEffect(() => {
    if (loaded) saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveConversations(conversations)).catch(() => setStorageError(true));
  }, [conversations, loaded]);
  useEffect(() => { api<Status>('/api/status').then(setStatus).catch(() => setError('Connexion à Chati indisponible. Vérifiez que le serveur est démarré.')); }, []);
  useEffect(() => {
    if (!status?.beta_mode) return;
    if (!getInvite()) { setAccessError('Cette bêta est sur invitation. Ouvrez le lien personnel qui vous a été envoyé.'); return; }
    api<Quota & { label?: string }>('/api/me').then(q => { setQuota(q); setAccessError(''); }).catch(e => setAccessError(e instanceof Error ? e.message : 'Accès impossible.'));
  }, [status?.beta_mode]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, busy]);
  useEffect(() => {
    const area = textarea.current;
    if (area) { area.style.height = 'auto'; area.style.height = `${Math.min(area.scrollHeight, 160)}px`; }
  }, [draft]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!info && !mobileMenu) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = info ? document.querySelector('.info-dialog') : document.querySelector('.sidebar.open');
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

  function stop() { controller.current?.abort(); controller.current = null; setBusy(false); setStage(''); }
  function select(id: string | null) {
    stop(); setCurrent(id); setDraft(''); setError(''); setMobileMenu(false); setUsefulLinks(false);
    const last = conversations.find(c => c.id === id)?.messages.filter(m => m.role === 'user').at(-1);
    setResearchMode(last?.research ?? false);
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
  async function send(text: string, retry = false, options?: ChatOptions) {
    text = text.trim(); if (!text || busy || !loaded || accessError) return;
    const id = current ?? uuid(); const abort = new AbortController(); controller.current = abort;
    const samePendingQuestion = messages.at(-1)?.role === 'user' && messages.at(-1)?.content === text;
    const requestOptions = options ?? { research: researchMode, focus_measure_id: samePendingQuestion ? messages.at(-1)?.focus_measure_id : undefined };
    setResearchMode(requestOptions.research ?? false);
    const base = (retry || samePendingQuestion) && messages.at(-1)?.role === 'user' ? messages.slice(0, -1) : messages;
    const next: ChatMessage[] = [...base, { id: uuid(), role: 'user', content: text, ...requestOptions }];
    setCurrent(id); setDraft(''); setError(''); setBusy(true); setStage('Recherche dans le programme…'); setUsefulLinks(false);
    setConversations(old => [{ id, title: active?.title ?? text.slice(0, 64), messages: next, updated: Date.now() }, ...old.filter(c => c.id !== id)].slice(0, 50));
    try {
      const answer = await chat(next, abort.signal, setStage, requestOptions);
      if (abort.signal.aborted) return;
      if (answer.quota) setQuota(answer.quota);
      setConversations(old => old.map(c => c.id === id ? { ...c, updated: Date.now(), messages: [...next, { id: uuid(), role: 'assistant', content: plainAnswer(answer), answer }] } : c));
    } catch (e) {
      if (!abort.signal.aborted) { setError(e instanceof Error ? e.message : 'Une erreur est survenue.'); setDraft(text); if (status?.beta_mode && getInvite()) api<Quota>('/api/me').then(setQuota).catch(() => {}); }
    } finally { if (controller.current === abort) { setBusy(false); setStage(''); controller.current = null; } }
  }
  async function copy(message: ChatMessage) {
    try { await navigator.clipboard.writeText(message.content + (message.answer?.sources.length ? '\n\nSources :\n' + message.answer.sources.map(s => s.type === 'web' ? `${s.title} — ${s.source_url} (consulté le ${s.retrieved_at})` : `${s.id} — ${s.subsection}, PDF p. ${s.pages.join(', ')}`).join('\n') : '')); setCopied(message.id); setTimeout(() => setCopied(null), 2000); }
    catch { setError('La copie n’est pas disponible dans ce navigateur. Vous pouvez sélectionner le texte.'); }
  }

  return <div className="app-shell">
    {mobileMenu && <button className="sidebar-backdrop" onClick={() => setMobileMenu(false)} aria-label="Fermer le menu" />}
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`} aria-label="Conversations">
      <a href="/" className="brand" onClick={e => { e.preventDefault(); select(null); }}><span className="brand-name">Chati<span className="brand-dot">.</span></span></a>
      <button className="new-chat" onClick={() => select(null)}><Plus size={18} />Nouvelle conversation<span>↗</span></button>
      <div className="sidebar-search"><Search size={15} /><input aria-label="Rechercher une conversation" placeholder="Rechercher un échange" value={filter} onChange={e => setFilter(e.target.value)} /></div>
      <div className="history-label">VOS CONVERSATIONS</div>
      <nav className="history">{conversations.filter(c => c.title.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(c => <div key={c.id} className={`history-item ${current === c.id ? 'selected' : ''}`}>
        <button className="history-select" onClick={() => select(c.id)}><MessageSquare size={14} /><span>{c.title}</span></button>
        <details className="history-actions"><summary aria-label={`Actions pour ${c.title}`}><Ellipsis size={17} /></summary><div><button onClick={() => rename(c.id)}><Pencil size={13} />Renommer</button><button onClick={() => remove(c.id)}><Trash2 size={13} />Supprimer</button></div></details>
      </div>)}{conversations.length === 0 && <div className="history-empty">Tout commence par une question.</div>}</nav>
      <div className="sidebar-bottom"><a className="explore-button" href="https://melenchon2027.fr/programme/decouvrir/" target="_blank" rel="noopener noreferrer"><BookOpen size={17} /><span>Explorer le programme</span><ExternalLink size={15} /></a>
        <button className={`useful-links-button ${usefulLinks ? 'active' : ''}`} onClick={() => { setUsefulLinks(true); setMobileMenu(false); }}><ExternalLink size={16} />Liens utiles<ArrowRight size={15} /></button>
        <button className="about-button" onClick={() => setInfo(true)}><CircleHelp size={16} />À propos de Chati</button>
        <div className="sidebar-footnote"><span className={`status-dot ${status?.index_ready ? 'ready' : ''}`} /><span>{status?.consultation_mode ? 'Consultation du programme' : status?.generation_available ? 'Assistant connecté' : 'Configuration requise'}</span></div>
        <span className="local-label">Historique enregistré sur cet appareil.</span>
      </div>
    </aside>
    <main className="main">
      <button className="icon-button mobile-menu mobile-menu-toggle" onClick={() => setMobileMenu(true)} aria-label="Ouvrir les conversations"><Menu size={21} /></button>
      {storageError && <div className="storage-warning" role="status">L’historique local est indisponible. Cette conversation reste accessible jusqu’à la fermeture de la page.</div>}
      {usefulLinks ? <section className="useful-links" aria-labelledby="useful-links-title">
        <button className="links-back" onClick={() => setUsefulLinks(false)}><ArrowRight size={16} />Revenir à la conversation</button>
        <span className="eyebrow">POUR ALLER PLUS LOIN</span><h1 id="useful-links-title">Liens utiles<span>.</span></h1><p>Retrouver les textes, découvrir le programme et les réseaux.</p>
        <div className="useful-links-list">
          <a href="https://docs.google.com/document/d/e/2PACX-1vTBSBoatwd0abhiVuok2s0IOQmbuf_QImbB0SrwSZ63w9PcSqfdkcWQxszNhSWlZxfkML7XHOiWAm9o/pub" target="_blank" rel="noopener noreferrer"><BookOpen size={23} /><div><h2>Le document source</h2><p>Le Google Docs qui rassemble les mesures utilisées par Chati.</p></div><ExternalLink size={18} /></a>
          <a href="https://lfi-reseaux.melenchon2027.workers.dev/" target="_blank" rel="noopener noreferrer"><Users size={23} /><div><h2>Les comptes à soutenir</h2><p>Découvrir des comptes sur les réseaux sociaux et accéder à leurs profils.</p></div><ExternalLink size={18} /></a>
          <a href="https://lfi-reseaux.melenchon2027.workers.dev/" target="_blank" rel="noopener noreferrer"><BookOpen size={23} /><div><h2>Le programme et son QCM</h2><p>Parcourir les mesures par thème et tester ses connaissances avec le QCM.</p></div><ExternalLink size={18} /></a>
        </div>
      </section> : <>
        <div className={`conversation-area ${messages.length ? 'has-messages' : ''}`}>
          {!messages.length ? <section className="welcome"><div className="welcome-mark"><LfiLogo horizontal /></div><span className="eyebrow">EXPLORER LES MESURES. COMPRENDRE LES IDÉES.</span><h1>Les mesures, simplement.<br /><span>Les idées, clairement.</span></h1><p className="welcome-description">Le programme, expliqué.<br />Parcourez les mesures et posez vos questions<br className="desktop-break" /> pour en comprendre les enjeux.</p><div className="suggestions">{suggestions.map(s => <button key={s.title} className="suggestion-card" onClick={() => send(s.text)} disabled={busy || !loaded}><span className="suggestion-top"><s.icon size={19} /><span>{s.category}</span><ArrowRight size={16} /></span><strong>{s.title}</strong><span className="suggestion-question">{s.text}</span></button>)}</div><div className="welcome-proof"><span /><BookOpen size={14} />{status?.measure_count ?? 795} mesures à explorer<span /></div></section> : <section className="messages" aria-label="Échange avec Chati">{messages.map((message, mi) => message.role === 'user' ? <div key={message.id} className="user-message"><div>{message.content}{message.research && <small className="user-research-label"><Globe size={11} />Programme + web</small>}</div></div> : <article key={message.id} className="assistant-message"><div className="assistant-heading"><span className="mini-brand"><LfiLogo /></span><strong>Chati</strong><span>{message.answer?.mode === 'consultation' ? 'EXTRAITS DU PROGRAMME' : message.answer?.research ? 'PROGRAMME + RECHERCHE WEB' : 'POUR MIEUX COMPRENDRE'}</span></div><div className="answer-body">{message.answer?.blocks.map((block, i) => <div className={`answer-block block-${block.kind}`} key={i}>{blockTitles[block.kind] && <h3>{blockTitles[block.kind]}</h3>}<p>{block.text}{block.source_ids.map(id => <button key={id} className="citation" aria-label={`Consulter la source ${id}`} onClick={() => setPanel({ sources: message.answer!.sources, active: id })}>{message.answer!.sources.findIndex(s => s.id === id) + 1}</button>)}</p></div>)}
              {message.answer?.mode === 'consultation' && message.answer.sources.map(source => <blockquote className="consultation-quote" key={source.id}><span>{source.subsection}</span>{source.text}<button onClick={() => setPanel({ sources: message.answer!.sources, active: source.id })}>Voir le passage <ArrowRight size={13} /></button></blockquote>)}
              {!!message.answer?.measures.length && <details className="measure-details"><summary><BookOpen size={16} />Les mesures expliquées <span>{message.answer.measures.length}</span></summary>{message.answer.measures.map(m => <div className="measure-explanation" key={m.id}><button onClick={() => setPanel({ sources: message.answer!.sources, active: m.id })}>{message.answer!.sources.find(s => s.id === m.id)?.subsection ?? 'Mesure'}<ExternalLink size={13} /></button><p>{m.explanation}</p>{m.expected_benefit && <p className="benefit"><strong>{m.benefit_basis === 'analysis' ? 'Interprétation — avantage attendu : ' : 'Avantage attendu : '}</strong>{m.expected_benefit}</p>}<div className="measure-followups"><button disabled={busy || !status?.web_available} onClick={() => { const source = message.answer!.sources.find(s => s.id === m.id); if (source) send(`Explique simplement cette mesure avec un exemple concret et des sources externes : « ${source.text} »`, false, { research: true, focus_measure_id: m.id }); }}><Globe size={12} />Expliquer concrètement</button><button disabled={busy || !status?.web_available} onClick={() => { const source = message.answer!.sources.find(s => s.id === m.id); if (source) send(`Quelle est la situation actuelle en France et qu’est-ce qui changerait avec cette mesure ? Vérifie sur Internet : « ${source.text} »`, false, { research: true, focus_measure_id: m.id }); }}>Comparer à aujourd’hui<ArrowRight size={12} /></button></div></div>)}</details>}
              <Followups items={message.answer?.followups ?? []} busy={busy} available={status?.web_available ?? false} onSelect={item => send(item.question, false, { research: item.research, focus_measure_id: item.measure_id })} /><div className="message-actions"><button onClick={() => copy(message)} aria-label="Copier la réponse">{copied === message.id ? <Check size={15} /> : <Copy size={15} />}{copied === message.id ? 'Copié' : 'Copier'}</button>{!!message.answer?.sources.length && <button onClick={() => setPanel({ sources: message.answer!.sources })}><BookOpen size={15} />{message.answer.sources.length} sources</button>}{mi === messages.length - 1 && <button disabled={busy} onClick={() => { setConversations(old => old.map(c => c.id === current ? { ...c, messages: c.messages.slice(0, -2) } : c)); setDraft(messages[mi - 1]?.content ?? ''); textarea.current?.focus(); }}>Reformuler</button>}</div>
            </div></article>)}{busy && <div className="thinking" role="status"><span className="mini-brand"><LfiLogo /></span><span className="thinking-dots"><i /><i /><i /></span>{stage}</div>}<div ref={end} /></section>}
        </div>
        <div className="composer-wrap">{error && <div className="request-error" role="alert"><span>{error}</span><button onClick={() => { setError(''); }} aria-label="Fermer l’erreur"><X size={16} /></button></div>}{!status?.index_ready && status?.index_message && <div className="request-error">{status.index_message}</div>}{accessError && <div className="request-error" role="alert">{accessError}</div>}{quota && !accessError && <div className={`quota-note ${quota.remaining === 0 ? 'empty' : ''}`} role="status">{quota.remaining === 0 ? 'Vous avez utilisé vos questions du jour : les mesures restent consultables, les réponses reviennent demain.' : `${quota.remaining} question${quota.remaining > 1 ? 's' : ''} restante${quota.remaining > 1 ? 's' : ''} aujourd’hui sur ${quota.limit}`}</div>}
          <form className="composer" onSubmit={e => { e.preventDefault(); send(draft); }}><label className="sr-only" htmlFor="question">Votre question sur le programme</label><textarea ref={textarea} id="question" rows={1} maxLength={12000} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Une question sur le programme ?" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy) send(draft); } }} /><div className="composer-bottom"><div className="composer-modes"><button type="button" className={`research-toggle ${researchMode ? 'enabled' : ''}`} aria-pressed={researchMode} disabled={busy || (!researchMode && !status?.web_available)} title="Vérifier le contexte et les règles actuelles sur Internet" onClick={() => { setResearchMode(value => !value); }}>{researchMode ? <Globe size={14} /> : <BookOpen size={14} />}{researchMode ? 'Programme + web' : 'Programme'}</button><span>{researchMode ? 'Recherche externe et sources citées' : 'Des explications claires, des mesures citées'}</span></div>{busy ? <button type="button" className="send-button stop-button" onClick={stop} aria-label="Arrêter la demande"><Square size={15} fill="currentColor" /></button> : <button type="submit" className="send-button" disabled={!draft.trim() || !loaded} aria-label="Envoyer la question"><ArrowUp size={21} /></button>}</div></form>
          <div className="composer-footer"><span>Parcourez les mesures, comprenez leurs enjeux.</span><button onClick={() => setInfo(true)}>À propos</button></div>
        </div>
      </>}
    </main>
    {panel && <SourcePanel sources={panel.sources} active={panel.active} close={closePanel} />}
    {info && <div className="info-overlay" onClick={e => { if (e.target === e.currentTarget) setInfo(false); }}><div className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title"><button className="icon-button info-close" autoFocus onClick={() => setInfo(false)} aria-label="Fermer"><X size={20} /></button><span className="eyebrow">LE CHAT INSOUMIS</span><h2 id="info-title">Le programme,<br />simplement.</h2><p>Chati vous aide à parcourir les mesures du programme, à comprendre leurs enjeux et les avantages attendus. Les explications s’appuient sur le résumé fourni et ses annexes.</p><div className="info-stat"><strong>{status?.measure_count ?? 795}</strong><span>mesures</span><strong>{status?.annex_count ?? 171}</strong><span>blocs d’annexe</span></div><p className="info-mode">{status?.consultation_mode ? 'Mode consultation : les textes sont retrouvés et affichés sans génération par une IA.' : status?.generation_available ? 'Les réponses sont générées à partir des passages retrouvés, avec contrôle de leurs références.' : 'La génération doit encore être configurée côté serveur. Les textes restent accessibles depuis les liens utiles.'}{status?.retrieval_mode === 'lexical' && ' La recherche actuelle utilise les mots-clés du texte.'}</p><p className="info-small">Les conversations sont stockées dans ce navigateur. Les messages envoyés sont traités par le serveur ; en mode génération, ils sont aussi transmis au fournisseur du modèle de langage ({status?.provider === 'groq' ? 'Groq' : 'OpenAI'}). Le mode Programme + web active une recherche externe pour vérifier le contexte actuel. Cet outil n’est pas présenté comme un service officiel du mouvement.</p><button className="info-done" onClick={() => setInfo(false)}>Revenir à la conversation<ArrowRight size={16} /></button></div></div>}
  </div>;
}

function LfiLogo({ horizontal = false }: { horizontal?: boolean }) {
  return <img src={`/brand/lfi-${horizontal ? "violet" : "vertical"}.png`} alt="La France insoumise" className="lfi-logo" />;
}
