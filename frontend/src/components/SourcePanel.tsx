import { useEffect, useRef } from 'react';
import { ArrowUpRight, BookOpen, FileText, Globe, X } from 'lucide-react';
import type { Source } from '../lib/types';

export default function SourcePanel({ sources, active, close }: { sources: Source[]; active?: string; close: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const elements = [...(panel.current?.querySelectorAll<HTMLElement>('button, a[href], input') ?? [])];
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [close]);
  useEffect(() => { if (active) document.getElementById(`source-${active}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [active]);
  return <div className="sources-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <aside ref={panel} className="source-panel" role="dialog" aria-modal="true" aria-labelledby="sources-title">
      <header><div><span className="eyebrow">RETOUR AU TEXTE</span><h2 id="sources-title">Les sources</h2></div><button ref={closeButton} className="icon-button" onClick={close} aria-label="Fermer les sources"><X size={20} /></button></header>
      <p className="source-intro">Les mesures et les références consultées pour comprendre et vérifier.</p>
      <div className="source-list">{sources.map((source, index) => <article id={`source-${source.id}`} key={source.id} className={`source-card ${active === source.id ? 'highlighted' : ''}`}>
        <div className="source-card-top"><span className="source-number">{index + 1}</span><span>{source.type === 'web' ? 'SOURCE EXTERNE · INTERNET' : source.type === 'mesure' ? 'MESURE DU RÉSUMÉ' : 'ANNEXE DU RÉSUMÉ'}</span></div>
        <h3>{source.subsection}</h3><div className="source-section">{source.section}</div>
        {source.type === 'web' ? <p className="web-source-meta"><Globe size={15} />{source.publisher}<br />Consulté le {source.retrieved_at?.split('-').reverse().join('/')}. Cette date est celle de la recherche, pas celle de publication du texte.</p> : <blockquote>{source.text}</blockquote>}
        <div className="source-links">{source.type !== 'web' && <a href={source.pdf_url} target="_blank" rel="noreferrer"><FileText size={14} />{source.pages.length ? `PDF · p. ${source.pages.join('–')}` : 'Voir le PDF'}<ArrowUpRight size={13} /></a>}<a href={source.source_url} target="_blank" rel="noreferrer">{source.type === 'web' ? <Globe size={14} /> : <BookOpen size={14} />}{source.type === 'web' ? 'Consulter le site' : 'Texte publié'}<ArrowUpRight size={13} /></a></div>
        <span className="source-id">{source.id}{source.type !== 'web' && ` · version ${source.corpus_version.slice(0, 8)}`}</span>
      </article>)}</div>
      <footer>Le résumé définit les propositions. Les sources externes documentent le contexte et la situation actuelle ; elles sont identifiées séparément.</footer>
    </aside>
  </div>;
}
