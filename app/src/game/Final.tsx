import { Check, Copy, Home, ImageDown, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Confetti, MeasureQuote, Sticker } from '../components/common';
import { Estimator } from '../components/Estimator';
import { Mascot } from '../components/Mascot';
import { ESTIMATIONS, estimate, isConfirmed, type Values } from '../content/estimations';
import { THEMES } from '../content/themes';
import type { Tag, Theme } from '../content/types';
import { mesure, SITE_URL } from '../lib/engine';
import { PosterModal } from './PosterModal';

export function Final({ theme, liked, done, tags, values, onValue, onOther, onHome }: {
  theme: Theme; liked: string[]; done: Set<string>; tags: Set<Tag>; values: Values;
  onValue: (input: string, value: number) => void; onOther: () => void; onHome: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [poster, setPoster] = useState(false);
  const allDone = THEMES.every((t) => done.has(t.id));
  const chiffres = useMemo(
    () => [...new Set(liked.filter((id) => isConfirmed(id, values, tags)).map((id) => estimate(id, values, tags)?.court).filter((c): c is string => !!c))],
    [liked, values, tags],
  );
  const texts = useMemo(() => liked.map((id) => mesure(id).texte), [liked]);
  // Measures sharing one calculator (income tax and CSG) get it once.
  const estimable = liked.filter((id, i) => ESTIMATIONS[id] && liked.findIndex((o) => ESTIMATIONS[o] === ESTIMATIONS[id]) === i);

  const copy = async () => {
    const text = [`Ce que le programme de Jean-Luc Mélenchon change pour moi (${theme.titre}) :`,
      ...texts.map((t) => `• ${t}`), ...(chiffres.length ? ['', ...chiffres.map((c) => `→ ${c}`)] : []),
      '', `Le programme : ${SITE_URL}`].join('\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard unavailable */ }
  };

  return (
    <section className="screen final-screen">
      {liked.length > 0 && <Confetti count={44} />}
      {liked.length > 0 ? (
        <article className="poster">
          <header>
            <span className="poster-wordmark"><strong>Chati</strong><small>le chat insoumis</small></span>
            <Sticker tone="red" tilt={5}>{theme.titre}</Sticker>
          </header>
          <h2>Ce que le programme change <span className="marker">pour moi</span></h2>
          {chiffres.length > 0 && <div className="poster-chips">{chiffres.map((c) => <span key={c}>{c}</span>)}</div>}
          <ol>{texts.map((t, i) => <li key={liked[i]}>{t}</li>)}</ol>
          <Mascot mood="happy" size={92} className="poster-mascot" />
        </article>
      ) : (
        <div className="final-empty">
          <Mascot mood="think" size={130} />
          <h2>Rien ne t’a vraiment parlé&nbsp;?</h2>
          <p className="lede">Pas grave. Essaie un autre thème, ou regarde ce qui change pour tout le monde.</p>
        </div>
      )}

      <div className="final-actions">
        {liked.length > 0 && <button className="btn btn-primary btn-big" onClick={() => setPoster(true)}><ImageDown size={20} strokeWidth={2.6} /> Créer mon image</button>}
        {liked.length > 0 && (
          <button className="btn btn-secondary" onClick={copy}>
            {copied ? <><Check size={18} strokeWidth={3} /> Copié&nbsp;!</> : <><Copy size={18} strokeWidth={2.6} /> Copier le texte</>}
          </button>
        )}
        {!allDone && <button className="btn btn-secondary" onClick={onOther}><Layers size={18} strokeWidth={2.6} /> Un autre thème</button>}
        <button className="btn btn-ghost" onClick={onHome}><Home size={18} strokeWidth={2.6} /> Accueil</button>
      </div>

      {estimable.length > 0 && (
        <div className="chiffres">
          <h3>Tes <span>chiffres</span></h3>
          <p className="lede">Ajuste les curseurs à ta situation : seuls les chiffres que tu as réglés vont sur ton affiche.</p>
          <div className="chiffres-grid">
            {estimable.map((id) => <Estimator key={id} id={id} values={values} tags={tags} onChange={onValue} />)}
          </div>
        </div>
      )}

      <div className="collectif">
        <h3>Et pour <span>tout le monde</span></h3>
        <div className="collectif-grid">
          {theme.collectif.map((id) => (
            <div key={id} className="collectif-item">
              <div className="collectif-card"><MeasureQuote id={id} compact /></div>
              <Estimator id={id} values={values} tags={tags} onChange={onValue} />
            </div>
          ))}
        </div>
      </div>
      {poster && <PosterModal themeId={theme.id} theme={theme.titre} mesures={texts} chiffres={chiffres} onClose={() => setPoster(false)} />}
    </section>
  );
}
