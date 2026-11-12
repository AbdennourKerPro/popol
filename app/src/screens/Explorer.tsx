import { ChevronDown, Search, Star } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Footnote, Header, MeasureQuote, Sticker } from '../components/common';
import { CHAPITRES, EXTRAIT_LE, MESURES, PARTIES, SOUS_SECTIONS, type Mesure } from '../lib/programme';

const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const INDEX = MESURES.map((m) => ({ m, text: plain(m.texte) }));
const MAX_RESULTS = 60;

/** Every measure of the programme, by part, chapter and sub-section, with a search box. */
export function Explorer({ onHome }: { onHome: () => void }) {
  const [query, setQuery] = useState('');
  const [keyOnly, setKeyOnly] = useState(false);
  const deferred = useDeferredValue(query);
  const words = plain(deferred).split(/\s+/).filter((w) => w.length > 1);
  const visible = (m: Mesure) => !keyOnly || m.categorie === 'cle';
  const results = useMemo(() => (words.length ? INDEX.filter(({ m, text }) => visible(m) && words.every((w) => text.includes(w))).map((x) => x.m) : []),
    [deferred, keyOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page explorer">
      <Header onHome={onHome} />
      <main className="explorer-main">
        <Sticker tone="purple" tilt={-3}>Tout le programme</Sticker>
        <h1>Les {MESURES.length} mesures, <span className="marker">une par une</span></h1>
        <p className="lede">Texte exact du programme, classé comme dans le livre. Chaque mesure renvoie à sa page sur melenchon2027.fr (programme extrait le {EXTRAIT_LE.split('-').reverse().join('/')}).</p>
        <div className="explorer-tools">
          <label className="explorer-search"><Search size={18} strokeWidth={2.5} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher : loyer, retraite, école…" aria-label="Chercher dans le programme" />
          </label>
          <button className={`chip ${keyOnly ? 'on' : ''}`} aria-pressed={keyOnly} onClick={() => setKeyOnly((v) => !v)}><Star size={16} strokeWidth={2.5} /> Mesures clés</button>
        </div>
        {words.length > 0 ? (
          <div className="explorer-results">
            <p className="count-line">{results.length} résultat{results.length > 1 ? 's' : ''}{results.length > MAX_RESULTS && ` (les ${MAX_RESULTS} premiers)`}</p>
            {results.slice(0, MAX_RESULTS).map((m) => <MeasureQuote key={m.id} mesure={m} compact />)}
          </div>
        ) : (
          PARTIES.map((partie) => (
            <section key={partie.id} className="part">
              <h2>{partie.titre}</h2>
              {CHAPITRES.filter((c) => c.partie === partie.id).map((chapitre) => (
                <details key={chapitre.id} className="chapter">
                  <summary><strong>{chapitre.titre}</strong><ChevronDown size={18} strokeWidth={2.5} /></summary>
                  {SOUS_SECTIONS.filter((s) => s.chapitre === chapitre.id).map((sub) => <SubSection key={sub.id} id={sub.id} titre={sub.titre} keyOnly={keyOnly} />)}
                </details>
              ))}
            </section>
          ))
        )}
      </main>
      <Footnote />
    </div>
  );
}

function SubSection({ id, titre, keyOnly }: { id: string; titre: string; keyOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const items = MESURES.filter((m) => m.sousSection === id && (!keyOnly || m.categorie === 'cle'));
  if (!items.length) return null;
  return (
    <details className="subsection" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{titre} <span className="count">{items.length}</span></summary>
      {/* Rendered only when opened: the whole programme is a thousand blocks. */}
      {open && <div className="subsection-list">{items.map((m) => (
        <div key={m.id} className={`measure-row measure-${m.categorie}`}>
          {m.categorie === 'cle' && <span className="key-badge"><Star size={13} strokeWidth={2.8} /> Mesure clé</span>}
          <MeasureQuote mesure={m} compact />
        </div>
      ))}</div>}
    </details>
  );
}
