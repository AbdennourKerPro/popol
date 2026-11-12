# Avancement de la refonte (PLAN-REFONTE.md)

État au 12/11/2026. Tests verts à ce point : RAG pytest 165 (6 ignorés), vitest RAG 30, vitest app 52.

## Fait

- **Étape 1 — socle** : `design/jetons.css`, `design/systeme.css`, `design/synchroniser.mjs`
  (copies dans `app/src/styles/systeme/` et `rag/frontend/src/styles/systeme/`),
  `systeme.test.mjs` dans chaque projet (en `.mjs` : `tsc` n'a pas les types Node),
  `design/contraste.test.mjs` (lancé par le vitest de l'app : `app/vite.config.ts` inclut
  `../design/**/*.test.mjs`). La planche charge `jetons.css` et `systeme.css`.
- **Étape 2 — RAG en ordre** : `App.tsx` réduit à l'état et aux actions ; composants
  `Lateral`, `Accueil`, `Profil`, `Message`, `Attente`, `Saisie`, `APropos`, `LiensUtiles` ;
  suggestions dans `content/suggestions.ts` (tests Python repointés) ; CSS en zones
  (`coque`, `lateral`, `accueil`, `message`, `saisie`, `sources`, `dialogues`) ; `frames.css`,
  `app.css`, `followups.css` et les sélecteurs morts supprimés. Captures avant/après identiques
  (0 pixel au-dessus du seuil). Écart : un fichier `coque.css` en plus des six zones du plan.
- **Étape 3 — RAG coque et accueil (code écrit, rendu NON vérifié)** : barre latérale violette,
  barre mobile, accueil (titre, chat et bulle, « Je suis… » en cases, suggestions en sommaire
  avec repère de partie vérifié dans le corpus), saisie (`.champ`, ligne d'options).
  `theme.css` ne contient plus que des **alias provisoires** vers les jetons, pour les zones
  `message`, `sources`, `dialogues` pas encore réécrites. Écart : les lignes d'état
  (erreur, quota, nouvel essai) ont été refaites dès l'étape 3 (prévu à l'étape 5).

## À faire en reprenant

1. **Vérifier l'étape 3 au navigateur** : la dernière capture montrait encore l'ancien accueil,
   probablement un cache du navigateur du banc. Relancer avec un profil Chrome neuf.
2. Étapes 4 (réponse, notes en marge, `lib/folio.ts` et son test), 5 (attente, panneau,
   dialogues, puis supprimer `theme.css`), 6 (carte image) pour le RAG.
3. Étapes 7 à 11 pour l'app, puis 12 (garde-fous, nettoyage, documentation).
4. Contrôle des 140 caractères par ligne (comptés en caractères, pas en octets) à la fin de l'étape 5.

Banc de captures utilisé (hors dépôt) : serveur Chati réel avec `generate` simulé, Chrome
sans interface piloté par le protocole DevTools, `Math.random` figé, mouvement réduit,
captures à 1440, 1024 et 390 px.
