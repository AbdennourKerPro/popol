import { Download, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Sticker } from '../components/common';
import { Mascot } from '../components/Mascot';
import { MARQUE } from '../content/brand';
import { type Format, FORMATS } from '../lib/posterFormats';

const PUBLIC_URL: string | undefined = import.meta.env.VITE_PUBLIC_URL;

export function PosterModal({ themeId, theme, mesures, chiffres, onClose }: {
  themeId: string; theme: string; mesures: string[]; chiffres: string[]; onClose: () => void;
}) {
  const [format, setFormat] = useState<Format>('post');
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    let url = '';
    setImage(null);
    setError(false);
    import('../lib/poster')
      .then(({ renderPoster }) => renderPoster({ theme, mesures, chiffres, format, url: PUBLIC_URL }))
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => alive && setError(true));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [format, theme, mesures, chiffres]);

  const file = image && new File([image.blob], `mon-programme-${themeId}-${format}.png`, { type: 'image/png' });
  const canShare = !!file && !!navigator.canShare?.({ files: [file] });

  const share = async () => {
    try {
      await navigator.share({ files: [file!], title: 'Ça change quoi pour moi ?', text: 'Ce que le programme de Jean-Luc Mélenchon change pour moi' });
    } catch { /* share sheet dismissed */ }
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = image!.url;
    a.download = file!.name;
    a.click();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="poster-modal" role="dialog" aria-modal="true" aria-labelledby="poster-modal-title" onClick={(e) => e.stopPropagation()}>
        <Sticker tone="red" tilt={-5}>Ton image</Sticker>
        <button className="icon-btn poster-modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 id="poster-modal-title">Prête à partager&nbsp;!</h2>
        <div className="segmented" role="group" aria-label="Format">
          {(Object.keys(FORMATS) as Format[]).map((f) => (
            <button key={f} className={f === format ? 'on' : ''} aria-pressed={f === format} onClick={() => setFormat(f)}>{FORMATS[f].label}</button>
          ))}
        </div>
        <div className={`poster-preview preview-${format}`}>
          {image ? <img src={image.url} alt="Aperçu de l’image à partager" />
            : error ? <p>L’image n’a pas pu être créée.</p>
            : <div className="poster-loading"><Mascot mood="think" size={90} className="bob" /><span>{MARQUE.dessine}</span></div>}
        </div>
        <div className="final-actions poster-modal-actions">
          {canShare && <button className="btn btn-primary" onClick={share}><Share2 size={18} strokeWidth={2.6} /> Partager</button>}
          <button className={`btn ${canShare ? 'btn-secondary' : 'btn-primary'}`} disabled={!image} onClick={download}>
            <Download size={18} strokeWidth={2.6} /> Télécharger
          </button>
        </div>
      </div>
    </div>
  );
}
