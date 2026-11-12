# Ça change quoi pour moi ?

Appli web statique et non officielle, en soutien à la candidature de Jean-Luc Mélenchon. Un **parcours de
questions** classe les mesures du programme *L'Avenir en commun* (1 069 mesures, extraites de
<https://melenchon2027.fr/programme/livre/> le 8 novembre 2026) selon la situation de la personne.

## Le parcours

Trois longueurs, qui s'emboîtent : on peut passer à la suivante sans perdre ses réponses.

| Parcours | Questions | Durée estimée | Classement |
|---|---|---|---|
| Court | 6 | ≈ 2 min | 15 mesures |
| Normal | 11 | ≈ 3 min | 20 mesures |
| Long | 20 | ≈ 5 min | 30 mesures |

La durée vient du nombre de questions (15 s par question, `SECONDES_PAR_QUESTION`). Les **10 premières mesures**
sont mises en avant, les autres suivent. Deux modes utilisent le même moteur :

- **Je joue** : questions en tutoiement, « Ça me parle » sur chaque mesure, image à partager (post 4:5 ou story 9:16).
- **Je milite** : questions à poser à voix haute (avec le pourquoi), arguments qui se classent en direct, synthèse.

Plus **Tout le programme** (`#explorer`) : les 1 069 mesures par partie, chapitre et sous-section, avec recherche
et filtre sur les 107 mesures clés. Chaque mesure renvoie à sa page sur melenchon2027.fr.

## Comment le classement est calculé

Tout se fait dans le navigateur, rien n'est envoyé. Les réponses donnent des étiquettes :

- des **situations** (28 « publics » : salarié, locataire, parent, rural, handicap…) ;
- des **centres d'intérêt** (17 thèmes), au premier tour (poids 3), au deuxième (2) ou en sondage léger (1).

Chaque mesure porte ses propres étiquettes (`data/annotations.jsonl`). Une mesure visant des publics précis n'est
proposée qu'aux personnes qui en font partie ; une mesure pour tout le monde ne l'est que si son thème compte pour la
personne. Une difficulté déclarée (factures, fins de mois, santé, logement) fait remonter les mesures pour tout le monde de ce
thème qui touchent directement la population, sans qu'il ait été coché. Une mesure propre à l'outre-mer n'est proposée qu'à ses
habitants, même si elle vise aussi d'autres profils. Le score ajoute la catégorie (clé, complémentaire, sous-mesure), la portée, l'adéquation aux publics et le
poids du thème. La sélection garde au plus 2 mesures par sous-section et écarte les quasi-doublons. Sans réponse
exploitable, on propose les mesures clés qui concernent le plus de monde.

Le vocabulaire (publics, thèmes) est dans `data/taxonomie.json` ; des tests vérifient que chaque public peut être
produit par une réponse et que chaque mesure peut être atteinte.

## Les annotations

Les étiquettes et la phrase « ce que ça change » de chaque mesure sont produites **une fois, hors ligne**, puis
figées dans le dépôt : l'appli n'appelle jamais de modèle.

```bash
../rag/.venv/bin/python scripts/annotate_mesures.py   # profils, thèmes, portée, résumé (OPENAI_API_KEY requise)
../rag/.venv/bin/python scripts/audit_publics.py      # 2e passe, plus stricte : ne peut que retirer des profils
```

- Le **résumé** est une reformulation sans chiffre, nom propre ni fait absent de la mesure (vérifié par script). Si
  aucun résumé ne passe (3 mesures), l'appli affiche le texte exact.
- Le **texte exact** de la mesure et sa page sont toujours à un clic sous chaque argument.
- `data/audit-publics.json` liste les profils retirés par la 2e passe, pour relecture.

Ce sont des annotations automatiques relues par échantillon : une étiquette peut rester imprécise.

## Lancer

```bash
cd app
npm install
npm run dev      # http://localhost:5174
npm test
npm run build    # site statique dans dist/
```

`npm run data` (lancé avant dev, build et test) compile `../rag/data/programme/mesures.jsonl` et
`data/annotations.jsonl` dans `src/data/programme.json` (non versionné).

Pour imprimer l'adresse publique au bas des images partagées, définir `VITE_PUBLIC_URL` au build.

## Chiffrages

Sous une mesure qui s'y prête, « Calculer ce que ça change pour toi » ouvre un calculateur (`src/content/chiffrages.ts`,
26 mesures, 24 calculateurs). Règles :

- un calcul n'utilise que des **chiffres écrits dans la mesure** (liste `figures`, vérifiée par un test contre le texte
  du programme) et des montants saisis par la personne ; les valeurs de départ sont des exemples ronds à ajuster ;
- ce que le programme ne dit pas est écrit dans « Comment c'est calculé » ;
- une perte est affichée comme une perte ; seuls les chiffres que la personne a réglés vont sur l'image.

Ce qui a changé avec le nouveau programme : l'impôt sur le revenu est chiffré **sans la CSG** (le programme la fusionne dans
une cotisation sociale universelle non chiffrée) ; l'héritage se limite à l'exonération sous 150 000 € (le barème au-delà n'est
pas publié) ; le seuil de pauvreté (1 337 €) vient du programme ; l'indemnisation chômage dès le premier jour n'est plus
chiffrée, faute de chiffre dans le nouveau texte. La rémunération de la conscription vient du texte qui introduit la mesure (`appui`). Les taux des 14 tranches viennent toujours du simulateur de
La France insoumise (`src/lib/fiscalite.ts`) : ils ne sont pas dans le programme.

`legacy/` garde les anciens chiffrages, hors compilation.

## Publier

Le workflow [../.github/workflows/pages.yml](../.github/workflows/pages.yml) lance les tests, construit le site et
le publie sur GitHub Pages à chaque push sur `main` touchant `app/` ou le corpus. La navigation passe par le fragment
d'URL (`#jeu`, `#militant`, `#explorer`) : aucun réglage de redirection n'est nécessaire. Pour Cloudflare Workers,
voir `wrangler.jsonc` (dossier publié : `dist`).

## Marque et mentions

Aucun logo ni nom d'organisation : seulement la tortue de l'appli (`src/content/brand.ts`, le chat Chati peut être
rétabli) et « en soutien à la candidature de Jean-Luc Mélenchon ». Mentions légales : `src/screens/Mentions.tsx`.
