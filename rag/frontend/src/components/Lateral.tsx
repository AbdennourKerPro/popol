import { Ellipsis, Menu, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Conversation, Status } from '../lib/types';

interface Props {
  conversations: Conversation[];
  current: string | null;
  open: boolean;
  filter: string;
  status: Status | null;
  onFilter: (value: string) => void;
  onSelect: (id: string | null) => void;
  onRename: (id: string) => void;
  onRemove: (id: string) => void;
  onUsefulLinks: () => void;
  onInfo: () => void;
  onClose: () => void;
}

export const serviceState = (status: Status | null) => (status?.consultation_mode ? 'Consultation du programme'
  : status?.generation_available ? 'Assistant connecté' : 'Configuration requise');

/** The Chati wordmark: « Chati. » with a red full stop. */
export function Marque({ className = '' }: { className?: string }) {
  return <span className={`marque ${className}`}>Chati<span className="ponctuation">.</span></span>;
}

/** Side panel on a violet plane: brand, new conversation, history, links. On small screens it opens over the page. */
export default function Lateral(props: Props) {
  const { conversations, current, open, filter, status } = props;
  const shown = conversations.filter(c => c.title.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
  return (
    <aside className={`lateral sur-violet ${open ? 'ouvert' : ''}`} aria-label="Conversations">
      <div className="lateral-tete">
        <a href="/" className="lateral-marque" onClick={e => { e.preventDefault(); props.onSelect(null); }}>
          <Marque />
          <span className="sous-marque">le Chat insoumis</span>
        </a>
        <button className="lateral-fermer bouton bouton-icone" onClick={props.onClose} aria-label="Fermer le menu"><X className="icone" /></button>
      </div>
      <button className="bouton bouton-inverse lateral-nouvelle" onClick={() => props.onSelect(null)}>
        <Plus className="icone" />Nouvelle conversation
      </button>
      <input className="lateral-recherche" aria-label="Rechercher une conversation" placeholder="Rechercher une conversation"
        value={filter} onChange={e => props.onFilter(e.target.value)} />
      <p className="folio">Vos conversations</p>
      <nav className="historique">
        {shown.map(c => (
          <div key={c.id} className={`historique-ligne ${current === c.id ? 'active' : ''}`}>
            <button className="historique-titre" onClick={() => props.onSelect(c.id)} aria-current={current === c.id ? 'page' : undefined}>
              {c.title}
            </button>
            <details className="historique-actions">
              <summary aria-label={`Actions pour ${c.title}`}><Ellipsis className="icone" /></summary>
              <div>
                <button onClick={() => props.onRename(c.id)}><Pencil className="icone" />Renommer</button>
                <button onClick={() => props.onRemove(c.id)}><Trash2 className="icone" />Supprimer</button>
              </div>
            </details>
          </div>
        ))}
        {conversations.length === 0 && <p className="historique-vide">Vos questions s’afficheront ici.</p>}
      </nav>
      <div className="lateral-pied">
        <a href="https://melenchon2027.fr/programme/decouvrir/" target="_blank" rel="noopener noreferrer">Explorer le programme ↗</a>
        <button onClick={props.onUsefulLinks}>Liens utiles</button>
        <button onClick={props.onInfo}>À propos de Chati</button>
        <p>{serviceState(status)} · historique gardé sur cet appareil</p>
      </div>
    </aside>
  );
}

/** Top bar on small screens: wordmark and the button that opens the side panel. */
export function BarreMobile({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="barre-mobile sur-violet">
      <a href="/" className="lateral-marque"><Marque /></a>
      <button className="bouton bouton-texte barre-menu" onClick={onMenu} aria-label="Ouvrir les conversations"><Menu className="icone" />Menu</button>
    </header>
  );
}
