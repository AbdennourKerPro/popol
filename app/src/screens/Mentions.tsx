import { Header } from '../components/common';

export function Mentions({ onHome }: { onHome: () => void }) {
  return (
    <div className="page">
      <Header onHome={onHome} />
      <main className="legal">
        <h1>Mentions légales</h1>
        <h2>Éditeur</h2>
        <p>Abdennour, à titre non professionnel. Contact : <a href="mailto:contact@abdennour.tech">contact@abdennour.tech</a></p>
        <p>Site non officiel, réalisé en soutien à la candidature de Jean-Luc Mélenchon. Il n’est pas édité par la France insoumise ni par l’équipe de campagne.</p>
        <h2>Hébergeur</h2>
        <p>GitHub, Inc. (GitHub Pages), 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
        <h2>Données personnelles</h2>
        <p>Aucune donnée n’est collectée, enregistrée ni envoyée : les réponses restent dans votre navigateur. Le site n’utilise pas de cookies.</p>
        <button className="btn btn-primary" onClick={onHome}>Retour à l’accueil</button>
      </main>
    </div>
  );
}
