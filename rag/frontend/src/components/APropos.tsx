import { ArrowRight, X } from 'lucide-react';
import type { Status } from '../lib/types';

/** Dialog « À propos de Chati ». */
export default function APropos({ status, onClose }: { status: Status | null; onClose: () => void }) {
  const mode = status?.consultation_mode ? 'Mode consultation : les textes sont retrouvés et affichés sans génération par une IA.'
    : status?.generation_available ? 'Les réponses sont générées à partir des passages retrouvés, avec contrôle de leurs références.'
      : 'La génération doit encore être configurée côté serveur. Les textes restent accessibles depuis les liens utiles.';
  return (
    <div className="info-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title">
        <button className="icon-button info-close" autoFocus onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <span className="eyebrow">LE CHAT INSOUMIS</span>
        <h2 id="info-title">Le programme,<br />simplement.</h2>
        <p>
          Chati vous aide à parcourir les mesures du programme, à comprendre leurs enjeux et les avantages attendus. Les
          explications s’appuient sur le programme L’Avenir en commun, ses mesures et ses textes explicatifs.
        </p>
        <div className="info-stat">
          <strong>{status?.measure_count ?? 1069}</strong><span>mesures</span>
          <strong>{status?.text_count ?? 140}</strong><span>textes explicatifs</span>
        </div>
        <p className="info-mode">{mode}{status?.retrieval_mode === 'lexical' && ' La recherche actuelle utilise les mots-clés du texte.'}</p>
        <p className="info-small">
          Les conversations sont stockées dans ce navigateur. Les messages envoyés sont traités par le serveur ; en mode
          génération, ils sont aussi transmis au fournisseur du modèle de langage ({status?.provider === 'groq' ? 'Groq' : 'OpenAI'}).
          Le profil choisi reste sur cet appareil et accompagne vos questions pour orienter les réponses. Les avis donnés avec
          les pouces sont anonymes : ni la question ni la réponse ne sont transmises. Le mode Programme + web active une recherche
          externe pour vérifier le contexte actuel. Face à une objection, Chati peut aussi chercher sur Internet des exemples
          d’autres pays, cités avec leur lien. Cet outil n’est pas présenté comme un service officiel du mouvement.
        </p>
        <button className="info-done" onClick={onClose}>Revenir à la conversation<ArrowRight size={16} /></button>
      </div>
    </div>
  );
}
