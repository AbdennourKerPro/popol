import { FOR_ME, insecable, type Suggestion } from '../content/suggestions';
import type { ChatOptions, Status } from '../lib/types';
import { ChatiCat } from './ChatiCat';
import { serviceState } from './Lateral';
import { ProfilePicker } from './Profil';

interface Props {
  status: Status | null;
  profile: string[];
  suggestions: Suggestion[];
  disabled: boolean;
  onToggleProfile: (id: string) => void;
  onAsk: (text: string, options?: ChatOptions) => void;
}

const nombre = (n: number) => n.toLocaleString('fr-FR');

/** Home screen, before the first question. */
export default function Accueil({ status, profile, suggestions, disabled, onToggleProfile, onAsk }: Props) {
  return (
    <section className="accueil">
      <div className="accueil-folio">
        <span className="folio">L’Avenir en commun · {nombre(status?.measure_count ?? 1069)} mesures</span>
        <span className="folio">{serviceState(status)}</span>
      </div>
      <div className="accueil-grille">
        <div className="accueil-titre">
          <h1 className="titre-affiche">Posez votre question<br /> au <span className="surligne">programme</span><span className="ponctuation">.</span></h1>
          <p className="corps chapeau">Chati cherche dans les mesures de L’Avenir en commun, répond simplement et cite chaque passage.</p>
        </div>
        <div className="parole accueil-parole">
          <p className="bulle vers-le-bas">
            Moi, c’est Chati.
            <span className="bulle-detail">Dites-moi qui vous êtes, je vous dirai ce qui change pour vous.</span>
          </p>
          <ChatiCat mood="happy" size={132} />
        </div>
      </div>
      <ProfilePicker status={status} profile={profile} onToggle={onToggleProfile} />
      <div className="sommaire accueil-suggestions">
        {!!profile.length && (
          <button className="entree" disabled={disabled} onClick={() => onAsk(FOR_ME, { research: false, standalone: false })}>
            <span className="etiquette"><i className="repere" />Votre situation</span>
            <span className="entree-texte">{insecable(FOR_ME)}</span>
            <span className="fleche" aria-hidden="true">→</span>
          </button>
        )}
        {suggestions.slice(0, profile.length ? 3 : 4).map(s => (
          <button key={s.text} className="entree" disabled={disabled} onClick={() => onAsk(s.text)}>
            <span className="etiquette" data-partie={s.partie}><i className="repere" />{s.category}</span>
            <span className="entree-texte">{insecable(s.text)}</span>
            <span className="fleche" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}
