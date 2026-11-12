import { ArrowRight, BookOpen, ExternalLink, Users } from 'lucide-react';

const LIENS = [
  { icon: BookOpen, href: 'https://melenchon2027.fr/', title: 'Le programme officiel',
    text: 'Le programme de Jean-Luc Mélenchon sur le site de campagne, melenchon2027.fr.' },
  { icon: Users, href: 'https://lfi-reseaux.melenchon2027.workers.dev/', title: 'Les comptes à soutenir',
    text: 'Découvrir des comptes sur les réseaux sociaux et accéder à leurs profils.' },
  { icon: BookOpen, href: 'https://lfi-reseaux.melenchon2027.workers.dev/', title: 'Le programme et son QCM',
    text: 'Parcourir les mesures par thème et tester ses connaissances avec le QCM.' },
];

export default function LiensUtiles({ onBack }: { onBack: () => void }) {
  return (
    <section className="useful-links" aria-labelledby="useful-links-title">
      <button className="links-back" onClick={onBack}><ArrowRight size={16} />Revenir à la conversation</button>
      <span className="eyebrow">POUR ALLER PLUS LOIN</span>
      <h1 id="useful-links-title">Liens utiles<span>.</span></h1>
      <p>Retrouver les textes, découvrir le programme et les réseaux.</p>
      <div className="useful-links-list">
        {LIENS.map(l => (
          <a key={l.title} href={l.href} target="_blank" rel="noopener noreferrer">
            <l.icon size={23} /><div><h2>{l.title}</h2><p>{l.text}</p></div><ExternalLink size={18} />
          </a>
        ))}
      </div>
    </section>
  );
}
