# Ça change quoi pour moi ?

Prototype d'appli web qui relie la situation d'une personne aux mesures du programme de la France insoumise.
Deux modes :

- **Je joue** (pour tout le monde) : questions en tutoiement, bonus qui se débloquent, quiz, tri des mesures
  « ça me parle / bof » par glissement, chiffrage personnalisé, puis une affiche « Ce que le programme change
  pour moi » exportée en image (post 4:5 ou story 9:16) à partager sur les réseaux.
- **Je milite** (porte-à-porte, discussion) : la question à poser à voix haute et pourquoi on la pose. Les
  arguments adaptés se débloquent en direct. La synthèse donne les 3 arguments prioritaires, les objections
  fréquentes et les mesures pour toute la société.

9 thèmes : Pouvoir d'achat, Impôts, Héritage, Logement, Travail et retraite, Santé, Jeunesse et études,
Écologie au quotidien, Services publics près de chez moi. Une question déjà posée dans un thème n'est pas reposée dans un autre.

## Lancer

```bash
cd app
npm install
npm run dev      # http://localhost:5174
npm test
npm run build    # site statique dans dist/
```

Pour imprimer l'adresse publique de l'appli au bas des images partagées, définir `VITE_PUBLIC_URL` au build
(par exemple `VITE_PUBLIC_URL=exemple.fr npm run build`).

`npm run data` (lancé automatiquement avant dev, build et test) compile `../rag/data/structured/mesures.jsonl`
dans `src/data/mesures.json` (non versionné).

## Publier sur GitHub Pages

Le workflow [../.github/workflows/pages.yml](../.github/workflows/pages.yml) lance les tests, construit le site et
le publie à chaque push sur `main` qui touche `app/` ou le corpus. Réglage à faire une fois, dans le
dépôt : *Settings → Pages → Build and deployment → Source : GitHub Actions*.

Le site est statique et fonctionne sous un sous-chemin (`base: './'`). La navigation passe par le fragment
d'URL (`#jeu`, `#militant`) : aucun réglage de redirection n'est nécessaire, et un lien vers un mode se partage tel
quel. L'adresse imprimée sur les images de partage est déduite du dépôt (`propriétaire.github.io/dépôt`).

## Principes

- **Pas d'IA dans le parcours.** Ce sont des règles explicites qui choisissent les mesures. Le texte affiché
  est celui du programme, mot pour mot, avec sa sous-section et un lien vers le site de campagne `melenchon2027.fr`
  (aucun renvoi vers un document PDF).
- Les phrases « pourquoi ça vous concerne » et les réponses aux objections sont écrites pour l'appli. Elles
  doivent rester lisibles dans la mesure citée, et l'interface militante le signale.
- **Rien n'est enregistré ni envoyé.** Les réponses vivent en mémoire dans le navigateur. Elles révèlent
  une situation sociale et une sensibilité politique : il faut le préserver.

## Modifier le contenu

| Fichier | Contenu |
|---|---|
| [src/content/questions.ts](src/content/questions.ts) | Banque de questions partagée : formulation jeu et militante, conditions d'affichage (`si`, `sauf`), réponses et étiquettes produites, bonus (`teaser`). |
| [src/content/themes.ts](src/content/themes.ts) | Thèmes : ordre des questions, quiz, règles de ciblage (`cibles`), mesures pour tous, objections. |
| [src/content/estimations.ts](src/content/estimations.ts) | Estimations chiffrées par mesure : curseurs, formule, hypothèses affichées. |
| [src/lib/fiscalite.ts](src/lib/fiscalite.ts) | Calcul de l'impôt sur le revenu, de la CSG et des droits de succession (voir plus bas). |
| [src/lib/engine.ts](src/lib/engine.ts) | Moteur : étiquettes, questions restantes, score et classement. |
| [src/lib/poster.ts](src/lib/poster.ts) | Dessin de l'image à partager (canvas), chargé seulement à la demande. |

Une règle de ciblage :

```ts
{ mesure: 's01-ss09-m005', si: [['locataire']], poids: 2, plus: ['grande_ville', 'loyer_lourd'],
  tu: 'Ton loyer serait encadré…', vous: 'Votre loyer serait encadré…' }
```

`si` est un « OU » de « ET » d'étiquettes. Le score vaut `poids`, plus 1 par étiquette de `plus` présente.
Les tests vérifient que chaque ID cité existe dans le corpus et que chaque étiquette utilisée peut être
produite par une réponse.

## Estimations chiffrées

25 mesures ont une estimation : SMIC, point d'indice, APL, pensions, minimum vieillesse et garanties
d'autonomie, âge de départ, temps de travail, congés, formation, crèche, école, 100 % Sécu, protections
périodiques, AAH, frais d'inscription, CVEC, indemnisation chômage, conscription, et quelques calculettes
collectives (taxe Zucman, logements publics, places en EHPAD), plus le calcul d'impôt sur le revenu et de CSG et celui des droits de succession.

Règles :

- seules des valeurs écrites dans le programme (1 700 € net, +10 %, 60 ans et 40 annuités, 35 h/32 h, 2 %…)
  sont combinées avec des montants saisis par la personne ;
- aucune valeur de la situation actuelle n'est affirmée : les curseurs partent de valeurs rondes d'exemple,
  signalées comme telles, et chaque estimation affiche ses hypothèses (« Comment c'est calculé ») ;
- un chiffre n'apparaît sur l'image partagée que si la personne a réglé ou validé elle-même tous ses curseurs.

Le résumé du programme ne permet pas de chiffrer, entre autres : le barème d'impôt à 14 tranches (les annexes
ne donnent que le barème actuel), la première tranche gratuite d'énergie et d'eau, la baisse de TVA,
l'encadrement des loyers ou la revalorisation des minima sociaux.

## Impôts et héritage : calculs inspirés du simulateur officiel

Les thèmes Impôts et Héritage reprennent la méthode des simulateurs de la France insoumise
([impôt sur le revenu](https://impots.lafranceinsoumise.fr/) et [héritage](https://impots.lafranceinsoumise.fr/heritage)),
dont la logique a été lue dans le code public de leurs pages et portée dans `fiscalite.ts`.

À savoir :

- **Les taux proposés ne sont pas dans le résumé du programme** de ce dépôt, qui indique seulement
  « 14 tranches » et « 12 millions d'euros ». Les barèmes (impôt, CSG, droits de succession) viennent des
  simulateurs, dont la page indique : « un outil pédagogique qui n'a pas vocation à être exact à l'euro près ».
  Le simulateur est titré « Nouveau Front Populaire » : il peut ne pas correspondre exactement au programme de ce
  dépôt. À confirmer avec la source.
- **Paramètres du droit actuel** (barème, décote, abattements) : ceux du simulateur, pour les revenus 2023. À
  actualiser chaque année dans `fiscalite.ts`.
- **Différences voulues avec le simulateur officiel** : (1) il ajuste ensuite ses résultats (gain minimal
  garanti aux revenus modestes, pas de gain aux revenus élevés) ; ce port renvoie le calcul brut, qui peut donc
  afficher une perte. (2) La décote d'un couple utilise le seuil des couples. (3) L'héritage ne couvre que les
  enfants.
- Le crédit d'impôt par enfant et la fin du quotient conjugal ne sont pas chiffrés (montant non précisé).
- Les valeurs de référence des tests viennent d'une seconde implémentation écrite à part. Le code du simulateur
  officiel n'a pas été exécuté : les tests protègent contre une erreur de portage, pas contre une erreur dans
  les règles elles-mêmes.

## Direction graphique

Elle reprend celle de Chati (`rag/frontend`) : violet `#4c0297`, rouge `#d1271c`, crème `#fffcf4`, encre
`#1d1240`, Public Sans en 900 pour les titres et Gowun Batang pour les citations. L'ensemble est poussé vers
le cartoon : cadres épais, ombres décalées pleines, stickers inclinés, rebonds, confettis, et la mascotte
la tortue insoumise, dessinée en SVG (dessin original). L'ancienne mascotte, Chati le chat, est conservée dans
[src/components/MascotCat.tsx](src/components/MascotCat.tsx) : pour la rétablir, mettre `MASCOTTE = 'chat'` dans
[src/content/brand.ts](src/content/brand.ts), qui change aussi les noms affichés ([src/components/Mascot.tsx](src/components/Mascot.tsx)).
Les animations sont désactivées si le système le demande (`prefers-reduced-motion`).

## Limites du prototype

- Environ 135 règles de ciblage et 25 estimations, rédigées sans relecture humaine : à faire valider.
- Les calculs d'impôt et d'héritage sont des ordres de grandeur : salaires uniquement, sans réductions ni crédits
  d'impôt, assurance-vie ou donations.
- Le partage natif de fichier dépend du navigateur (surtout mobile) ; ailleurs, l'image est téléchargée.
- Le mode militant n'a pas d'image à partager.
