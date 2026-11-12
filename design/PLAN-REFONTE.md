# Refonte du design — Chati (`rag/`) et « Ça change quoi pour moi ? » (`app/`)

Plan à appliquer étape par étape. La référence visuelle est **`design/planche.html`** (à ouvrir
dans un navigateur depuis le dépôt, après `npm install` dans `app/` pour les polices) : jetons,
composants et huit maquettes (cinq écrans de bureau, trois mobiles). En cas de doute entre ce texte et la planche, **la planche fait foi
pour l'apparence, ce texte pour le périmètre et l'ordre**.

## 1. Pourquoi refaire

Les deux interfaces fonctionnent, mais elles ont l'air générées, et elles ne se ressemblent pas.

| Constat (mesuré le 12/11/2026) | Où |
|---|---|
| Le RAG n'est plus dans la charte : fond bleu `#eaf2fa`, barre marine `#203652`, accents bleu, vert, ocre et corail, absents des deux palettes de la charte | `rag/frontend/src/styles/theme.css` |
| Le même cadre répété partout : contour épais, coins très ronds, ombre dure décalée, enfoncement au clic (boutons, cartes, champ, dialogue, puces) | `frames.css`, `base.css`, `game.css`, `militant.css` |
| Décor sans fonction : fond à pois, autocollants inclinés, icônes dans des carrés colorés penchés, rotation au survol, mascotte qui sautille en boucle, confettis | `app/src/styles/*`, `common.tsx` |
| Couleur d'accent attribuée au hasard aux cartes de suggestion (`tone: blue/green/ochre/coral`) | `rag/frontend/src/App.tsx` |
| Capitales espacées partout (surtitres, badges, entêtes) ; slogans creux (« Les mesures, simplement. Les idées, clairement. », « Parcourez les mesures, comprenez leurs enjeux. ») | `App.tsx` (rag) |
| Aucun système : 86 couleurs en dur dans le CSS de l'app, 12 rayons et jusqu'à 18 tailles de police différentes par fichier | `app/src/styles/*`, `rag/.../styles/*` |
| Code illisible : `app.css` du RAG tient sur 10 lignes minifiées ; `frames.css` redéfinit `app.css` ; `App.tsx` (253 lignes) contient 8 lignes de plus de 400 caractères ; sélecteurs morts (RAG : `topbar*`, `explorer-*`, `corpus-badge`, `lfi-logo`, `brand-symbol` ; app : `swipe-*`, `quiz-*`, `theme-card*`, `theme-tab*`, `bonus-*`, `priority-*`, `stamp-*`, `round-*`) | les deux projets |
| Deux identités : l'app est crème et violette, le RAG est bleu ; les bulles, boutons et titres n'ont rien en commun | — |

## 2. La direction : « Le violet structure, le rouge ponctue »

Une seule langue graphique, tirée de l'imprimé militant : **l'affiche** pour les titres, **le livre**
pour les réponses. Sept règles, toutes visibles sur la planche.

1. **Quatre couleurs, celles de la palette « Couleurs 2027 »** : crème `#FFFCF4` (fond), charbon
   `#212320` (texte et filets), violet `#4C0297` (structure et action : aplats, boutons, sélection,
   liens), rouge `#D1271C` (ponctuation : le signe final des titres, les appels de note, les numéros
   de classement, l'étiquette « Mesure clé », le surligneur). Le rouge n'est jamais un fond de
   bouton ni une surface. Les seules autres valeurs sont des teintes de ces quatre couleurs (liste
   fermée en § 4).
2. **La seconde palette de la charte ne sert qu'à repérer les six parties du programme** : un carré
   de 10 px devant un libellé. Jamais en fond, jamais en texte, jamais seul porteur d'une
   information.
3. **Aplats et filets, angles vifs.** Plus aucune ombre, plus aucun contour épais, plus aucune
   rotation. Un panneau est un aplat (violet, papier) ou une zone délimitée par un filet charbon de
   1,5 px. Rayon 4 px pour les contrôles (boutons, champs, cases), 0 pour tout le reste.
4. **Les mascottes sont les seuls dessins.** Le chat (RAG) et la tortue (app) gardent leur tracé
   actuel, au trait près. Elles et leur bulle sont les seuls éléments à contour épais et à formes
   rondes : c'est ce qui les fait ressortir. Elles **parlent** : accueil, attente, erreur, écran
   vide passent par la bulle. Elles ne bougent que pour cligner des yeux.
5. **Titres d'affiche, texte de livre.** Public Sans Black serré pour les titres, Gowun Batang pour
   tout texte qui se lit (réponses, citations, chapeaux), Public Sans 600 pour l'interface : ce sont
   les alternatives gratuites prévues par la charte. Un seul mot surligné par titre.
6. **Le livre comme modèle pour les réponses** : la question posée devient un titre ; les sources
   sont des **appels de note** rouges en exposant et des **notes en marge** ; les listes sont à
   tirets cadratins ; les chiffres clés sont surlignés ; un **folio** en petites capitales situe
   chaque écran ou passage (« Partie 3 · Chapitre 1 »).
7. **Le sommaire comme modèle pour les choix** : toute liste d'entrées cliquables (suggestions,
   modes de l'accueil, questions de suivi, mesures proches, parties du programme) est une liste de
   lignes séparées par des filets, qui se remplissent de violet au survol. Toute réponse à cocher
   (profil, questions du parcours) est une case à cocher, comme sur un bulletin.

Signature commune aux deux marques : **`Chati.`** et **`Ça change quoi ?`**, en Public Sans Black,
avec la ponctuation finale en rouge.

## 3. Règles de travail

- Ne rien committer sans demande. L'arbre contient des modifications non commitées : ne rien
  annuler, ne rien reformater hors des fichiers repris par ce plan.
- **Aucun changement de comportement** : mêmes fonctionnalités, mêmes appels d'API, mêmes données.
  C'est une refonte de l'apparence et de la structure du code d'interface.
- Aucune nouvelle dépendance. Icônes : `lucide-react` déjà présent, trait 1,75, 18 px, jamais dans
  une pastille colorée, et seulement là où elles portent un sens (actions).
- Tests à faire passer après chaque étape :
  - RAG, depuis `rag/` : `PYTHONPATH=backend .venv/bin/python -B -m pytest tests -q`,
    `npm --prefix frontend test`, `npm --prefix frontend run build` ;
  - app, depuis `app/` : `npm test`, `npm run build`.
- Points d'accroche à préserver (des tests ou des scripts en dépendent) :
  - `rag/tests/test_cache.py` et `test_objections.py` lisent les suggestions d'accueil dans
    `frontend/src/App.tsx` avec le motif `text: '…', category`. Si la liste déménage (§ étape 2),
    adapter ces deux tests dans la même étape ;
  - les `aria-label` existants (« Envoyer la question », « Réponse utile », « Réponse à améliorer »,
    « Consulter la source … », « Copier la réponse », « Partager cette réponse »…) et les `id`
    (`#question`, `source-<id>`) ;
  - `lib/*.ts` du RAG et `lib/*`, `content/*` de l'app ne changent pas, sauf `shareCard.ts` et
    `poster.ts` (étapes 6 et 11).
- Textes : français, vouvoiement dans le RAG, tutoiement dans le parcours « Je joue » (déjà le cas),
  apostrophes « ’ », **espace insécable avant `? ! : ;` et à l'intérieur des guillemets** dans tout
  texte affiché en grand (un « ? » ne doit jamais passer seul à la ligne).
- Accessibilité : cible tactile de 44 px, focus visible (`outline: 3px solid` violet, crème sur
  aplat violet, décalage 2 px), `prefers-reduced-motion` respecté, aucune information portée par la
  couleur seule.
- Si une hypothèse du plan est fausse (fichier absent, test qui dépend d'une classe), s'arrêter
  sur l'étape et le signaler.

## 4. Le système (source : `design/planche.html`, bloc « Jetons » et section « SYSTÈME »)

### Jetons

| Jeton | Valeur | Usage |
|---|---|---|
| `--creme` | `#FFFCF4` | fond de page |
| `--charbon` | `#212320` | texte, filets forts, icônes |
| `--violet` | `#4C0297` | aplats, boutons, liens, sélection, focus |
| `--rouge` | `#D1271C` | ponctuation (voir règle 1) |
| `--papier` | `#F6F0E1` | surface en creux : marge de notes, survol d'une ligne, panneau des sources |
| `--gris` | `#5E5F5A` | texte secondaire |
| `--filet` | charbon à 16 % | séparateurs fins (1,5 px) |
| `--violet-nuit` | `#37016E` | survol d'un bouton plein |
| `--violet-pale` | `#EEE6F6` | fond d'une case cochée |
| `--surligneur` | `#FFC9C2` | trait de surligneur |
| `--creme-70`, `--creme-25` | crème à 70 % et 25 % | texte secondaire et filets sur aplat violet |
| `--partie-1` … `--partie-6` | `#2E9959`, `#F9C900`, `#ED5FB1`, `#3885F4`, `#7B13D6`, `#F91616` | repère de la partie du programme |

Contrastes calculés (WCAG) : charbon/crème 15,5 ; violet/crème 11,6 ; gris/crème 6,3 ; gris/papier
5,7 ; crème à 70 %/violet 6,1 ; rouge/crème 5,1 ; rouge/papier 4,6. Conséquences :

- le rouge ne s'emploie en texte courant que sur crème (sur papier, il reste réservé aux numéros
  de note en 14 px gras et aux étiquettes) ;
- le point rouge de `Chati.` sur l'aplat violet (2,3) et les repères de partie (jaune 1,5 ;
  rose 3,0) sont décoratifs : ils accompagnent toujours un libellé lisible.

Typographie : échelle fermée **12, 14, 16, 18, 22, 28, 40, 64 px** (96 px pour le seul titre de
l'accueil de l'app, 56 px pour les numéros de classement). Rien sous 12 px. Les capitales espacées
(`letter-spacing: .08em`) sont réservées au **folio** et à l'**étiquette**.

Espacements : 4, 8, 12, 16, 24, 32, 48, 72 px. Mouvement : 160 ms `ease-out` sur les fonds et les
couleurs ; le surligneur d'un titre se trace une fois à l'apparition (`scaleX` de gauche à droite,
300 ms) ; aucune boucle, aucun ressort, aucune translation de carte.

### Composants (classes de la planche, à reprendre telles quelles)

| Composant | Classes | Remplace |
|---|---|---|
| Titres | `.titre-affiche`, `.titre`, `.titre-2`, `.intertitre`, `.ponctuation` | `h1` centrés, `.marker`, surtitres |
| Texte | `.corps`, `.corps-petit`, `.interface`, `.folio` | `.lede`, `.eyebrow`, tailles éparses |
| Surligneur | `.surligne` | `.key-figure` (violet gras), `.marker` |
| Appel de note | `.appel` | `.citation` (pastille bleue numérotée) |
| Boutons | `.bouton` + `-plein`, `-contour`, `-texte`, `-inverse` | `.btn*`, `.new-chat`, `.send-button`, `.info-done`, boutons d'action |
| Étiquette, repère | `.etiquette`, `.etiquette-cle`, `.repere` | `.sticker*`, `.theme-chip`, `.key-measure-badge`, `.suggestion-top` |
| Case à cocher | `.coche`, `.bulletin .ligne` | `.profile-picker button`, `.choice`, `.chip` |
| Sommaire | `.sommaire .entree` | `.suggestion-card`, `.mode-card`, `.followup-list`, `.related-measures`, `.useful-links-list`, accordéons de l'explorateur |
| Champ | `.champ` | `.composer`, `.explorer-search`, `.sidebar-search` |
| Mascotte et bulle | `.parole`, `.bulle`, `.mascotte` | `.bubble*`, `.thinking`, `.thinking-found` |
| Citation exacte | `.citation` (figure) | `.quote`, `.consultation-quote`, `blockquote` du panneau |
| Avancement | `.avancement` | `.progress` rayée |

### Partage entre les deux projets

`app/` et `rag/frontend/` sont construits séparément (contextes Docker distincts) : pas d'import de
l'un vers l'autre. Le système vit donc dans **`design/`** et il est **copié** :

- `design/jetons.css` : le bloc `:root` de la planche ;
- `design/systeme.css` : les composants du tableau ci-dessus, écrits lisiblement (une déclaration
  par ligne, regroupés par composant, uniquement des jetons) ;
- `design/synchroniser.mjs` : copie ces deux fichiers dans `app/src/styles/systeme/` et
  `rag/frontend/src/styles/systeme/` avec un entête « fichier généré, modifier `design/` » ;
- un test dans chaque projet (`vitest`) vérifie que la copie est identique à `design/` quand ce
  dossier est accessible (test ignoré sinon, par exemple dans l'image Docker).

La planche charge ensuite `jetons.css` et `systeme.css` au lieu de son bloc `<style>` : elle reste
ainsi la démonstration exacte du système livré.

## 5. Étapes

Chaque étape est livrable seule et se termine par les tests de § 3 et par des captures d'écran
(§ 6) comparées à la planche.

### Étape 1 — Socle partagé

Créer `design/jetons.css`, `design/systeme.css`, `design/synchroniser.mjs`, les copies et les deux
tests de synchronisation. Ajouter un test de contraste (dans `design/`, lancé par le `vitest` de
l'app) qui recalcule les rapports de § 4 et échoue sous 4,5 pour les paires de texte. Brancher la
planche sur ces fichiers. Aucun écran ne change encore.

### Étape 2 — RAG : mettre le code en ordre, sans changer l'apparence

- Découper `rag/frontend/src/App.tsx` : `App.tsx` ne garde que l'état et `send`. Créer dans
  `components/` : `Lateral.tsx` (marque, nouvelle conversation, recherche, historique, liens),
  `Accueil.tsx`, `Profil.tsx` (rangée « Je suis… » et rappel du profil), `Message.tsx` (question,
  réponse, mesures expliquées, mesures proches, actions, avis), `Attente.tsx`, `Saisie.tsx`
  (champ, messages d'erreur, quota, nouvel essai), `APropos.tsx`, `LiensUtiles.tsx`. Une ligne de
  JSX par élément ; aucune ligne de plus de 140 caractères.
- Déplacer les 12 suggestions dans `content/suggestions.ts` en gardant la forme
  `{ …, text: '…', category: '…' }` ; faire pointer les deux tests Python (§ 3) vers ce fichier.
- Réécrire le CSS en fichiers lisibles par zone : `styles/lateral.css`, `accueil.css`,
  `message.css`, `saisie.css`, `sources.css`, `dialogues.css`. Supprimer `frames.css` (ses règles
  rejoignent leur zone) et les sélecteurs morts listés en § 1.
- Critère : captures identiques avant et après (à l'œil), tests verts.

### Étape 3 — RAG : coque et accueil (maquettes « Chati — Accueil », bureau et mobile)

- `theme.css` est remplacé par les jetons. `theme-color` de `index.html` : `#4C0297`.
- **Barre latérale** : aplat violet, 264 px. Marque `Chati.` (38 px), « le Chat insoumis » en
  Gowun 14 px. Bouton inverse « Nouvelle conversation » (sans flèche ↗). Historique : lignes
  séparées par un filet crème à 25 %, conversation active en gras précédée d'un tiret, menu
  d'actions inchangé. Liens du bas en texte simple. Plus de mascotte dans la barre.
- Mobile (≤ 760 px) : barre violette de 48 px avec la marque et « Menu » ; le panneau latéral
  s'ouvre par-dessus (comportement actuel conservé).
- **Accueil**, aligné à gauche : folio « L'Avenir en commun · 1 069 mesures » (nombre réel) et
  état du service à droite ; titre `.titre-affiche` « Posez votre question au
  <mark>programme</mark>**.** » ; chapeau en Gowun ; à droite, le chat (132 px) et sa bulle ;
  rangée « Je suis… » en cases `.coche` (7 visibles, « Tout voir » déplie les 12) ; suggestions en
  `.sommaire` (4 entrées tirées au hasard, « Votre situation » en tête quand un profil est choisi).
- Supprimer : « EXPLORER LES MESURES. COMPRENDRE LES IDÉES. », « Les mesures, simplement. Les
  idées, clairement. », « Le programme, expliqué… », la ligne « N mesures à explorer » et le pied
  « Parcourez les mesures, comprenez leurs enjeux. ».
- Chaque suggestion reçoit la partie du programme de son sujet (repère coloré) : remplacer `tone`
  par `partie: 1…6`. Proposition à **vérifier dans le corpus** (`section_id` des mesures
  retrouvées) : logement 3, écologie 1, salaires 2, santé 4, retraites 3, éducation 4, démocratie
  5, fiscalité 2, territoires 5, égalité 3, transports 1, international 6.
- **Saisie** : `.champ` (fond blanc, filet charbon, bouton d'envoi violet carré de 44 px, bouton
  d'arrêt charbon). Dessous, une ligne en 12 px : rappel du profil et « effacer » à gauche, « Outil
  non officiel · À propos » à droite. La bascule « Programme / Programme + web » devient un
  `.coche` « Vérifier aussi sur le web », affiché seulement si le web est disponible.

### Étape 4 — RAG : la réponse (maquette « Chati — Réponse »)

- **La question posée est un titre** (`.question-posee` : Public Sans Black 28 px, filet violet de
  6 px à gauche), plus une bulle alignée à droite. Mention « Programme + web » en folio dessous.
- **Signature** : chat de 34 px et folio (« Chati · programme », « Chati · programme et sources
  web », « Chati · extraits du programme » en consultation).
- `AnswerBlocks.tsx` : texte en `.corps` ; `**…**` rendu en `.surligne` (adapter
  `lib/richText.tsx` et son test : la classe change, pas la logique) ; points en liste à tirets
  (`.tirets`) ; intertitres `.intertitre` avec filet au-dessus ; citations en `.appel` (bouton
  accessible, même `aria-label`, même numérotation). Le bloc `limits` : texte gris précédé de
  l'intertitre « À préciser », sans encadré ocre.
- **Notes en marge** : à partir de 1 100 px de large, chaque réponse est une grille « texte |
  notes » (280 px, aplat papier) listant les sources citées : numéro rouge, sous-section, début du
  texte (90 caractères), étiquette avec repère de partie (« Mesure clé · P3 · Ch. 1 », « Texte
  explicatif », « Source web ↗ »). Un clic sur une note ou sur un appel ouvre le panneau complet
  (`SourcePanel`, inchangé dans son comportement). En dessous de 1 100 px, les notes ne sont pas
  affichées : le bouton « N notes et sources » des actions ouvre le panneau.
  La partie et le chapitre se lisent dans l'identifiant (`p3c01-…` → Partie 3, Chapitre 1) : petite
  fonction pure `lib/folio.ts` avec test (`i1-t001` et `p1-t001` → pas de chapitre ; `web-…` → rien).
- **Mesures expliquées** : `details` sans cadre, filet au-dessus ; chaque mesure : étiquette (clé
  ou non, avec repère), sous-section en lien, explication en `.corps-petit`, boutons `-texte`.
- **Mesures proches** (« À explorer dans le programme ») et **suivis** (« Pour aller plus loin ») :
  deux `.sommaire`.
- **Actions** : une ligne de boutons `-texte` (Copier, Partager, Image, sources, Reformuler),
  pouces à droite ; motifs de l'avis en `.coche`. Filet fin au-dessus.
- **Consultation** : extraits en `.citation` avec folio.

### Étape 5 — RAG : états, panneau et dialogues

- **Attente** : `.parole` avec le chat et sa bulle. Le libellé d'étape est le texte de la bulle
  (« Je cherche dans le programme… », « Je rédige à partir des sources… », « Je vérifie les
  références… », « Je cherche des exemples à l'étranger… ») ; les passages trouvés sont la seconde
  ligne de la bulle, séparés par « · ». Reformuler ces libellés côté front à partir de `stage`
  (table `stage → phrase`), le serveur ne change pas.
- **Réponse provisoire** (`STREAM_BLOCKS`) : même rendu que la réponse, texte en gris, sans
  appels cliquables.
- **Erreurs, quota, nouvel essai** : une ligne au-dessus du champ, filet rouge de 3 px à gauche,
  texte charbon, action en bouton `-texte`. Plus de bandeau corail arrondi.
- **Panneau des sources** : aplat papier, 430 px, titre « Notes et sources », chaque source :
  numéro rouge, étiquette, sous-section (`.intertitre`), section en folio, texte en `.citation`,
  lien. Source active : filet violet de 3 px à gauche.
- **À propos** et **Liens utiles** : fond crème, filet charbon, titre `.titre`, texte Gowun ;
  liens utiles en `.sommaire`. Voile : charbon à 40 %.

### Étape 6 — RAG : carte image

`lib/shareCard.ts` : fond crème sans pois ni cadre ombré ; bandeau violet en haut avec `Chati.` en
crème ; question en Public Sans Black charbon avec un filet violet à gauche ; réponse en Gowun ;
points précédés d'un tiret violet ; pied : filet charbon, « Chati — le Chat insoumis » et
l'adresse. Le test de découpe de texte ne change pas.

### Étape 7 — App : socle et entête

- Avant tout, lister les classes des CSS de l'app absentes des `.tsx` (attention aux classes
  composées dans le code : `heat-N`, `sticker-<ton>`, `longueur-<id>`, `measure-<catégorie>`) et
  supprimer les styles morts cités en § 1.
- Importer `systeme/` ; `base.css` ne garde que la mise en page (`.page`, `main`). Supprimer le
  fond à pois, `--shadow*`, `--spring`, `.sticker*`, `.btn*`, `.bubble*`, `.bob`, `.confetti` et
  le composant `Confetti`, les animations `boing`, `pop-in`, `shake`.
- `common.tsx` : `Header` = marque `Ça change quoi ?` (24 px, « ? » rouge), sans mascotte ni
  pastille inclinée ; `Sticker` devient `Etiquette` (plus de `tilt`) ; `Progress` = `.avancement` ;
  `MeasureQuote` = `.citation` avec folio ; plus aucun `style={{…}}` hors largeur de
  l'avancement.
- `Mascot.tsx` : garder le tracé ; `Bubble` produit `.bulle`. Animation : clignement seulement.
- `theme-color` : `#FFFCF4` (inchangé). Favicon : garder la mascotte.

### Étape 8 — App : accueil (maquette « Ça change quoi — Accueil »)

Folio « En soutien à la candidature de Jean-Luc Mélenchon », titre de 96 px (`clamp(48px, 8vw,
96px)`) avec « pour moi » surligné et « ? » rouge, chapeau Gowun. À droite, **aplat violet à fond
perdu** (il touche le haut et le bord droit de la page) où se tient la tortue ; sa bulle chevauche
le bord gauche de l'aplat. Mobile : l'aplat devient un bandeau de 180 px en haut, tortue à droite,
bulle à gauche. Dessous, un `.sommaire` numéroté `01 Je joue`, `02 Je milite`, `03 Tout le
programme` (titre 34 px, description Gowun, étiquette à droite). Mention légale en 12 px.

### Étape 9 — App : « Je joue » (maquettes « Question » et « Classement »)

- Choix de la longueur (`LongueurPicker`) : `.sommaire` de trois entrées (titre, « ≈ 2 min ·
  6 questions » en étiquette, description), sans icône.
- **Question** : folio « Question 3 sur 11 · Logement », `.avancement`, la tortue pose la
  question dans une bulle (28 px), réponses en `.bulletin`, « Continuer » en bouton plein à
  droite, « Question précédente » en bouton texte à gauche. L'humeur de la tortue (`mood`) reste
  celle du code actuel.
- **Classement** (`Classement.tsx`, écran final de `Game.tsx`) : titre « Tes <mark>dix</mark>
  mesures**.** » (nombre réel en toutes lettres jusqu'à dix, en chiffres au-delà), liste
  ordonnée : numéro rouge 56 px (`01`), étiquette du thème avec repère de la partie de la mesure,
  phrase en 22 px gras, `.citation` avec folio, « Ça me parle » / « Gardée » en bouton texte
  (cœur plein violet quand gardée). Les mesures au-delà de la dixième : même ligne, numéro 28 px
  gris. À droite (sous la liste en mobile), aplat violet : nombre de mesures gardées, « Créer mon
  affiche », suite du parcours.
- `Estimator.tsx` : fond papier, résultat en Public Sans Black charbon avec le chiffre surligné ;
  curseur natif stylé par `accent-color: var(--violet)` (supprimer les pouces sur mesure) ;
  bascule en deux `.coche`.
- `PosterModal.tsx` : dialogue sur le modèle « À propos » ; formats en `.coche`.

### Étape 10 — App : « Je milite », explorateur, mentions

- **Militant** : introduction comme l'accueil (titre, chapeau, trois conseils en liste à tirets,
  sans carte inclinée) ; la fiche d'entretien : folio d'étape,
  question en `.titre-2`, « pourquoi » en Gowun gris précédé de « Pourquoi : », réponses en
  `.coche` ; panneau d'arguments : aplat papier collant, arguments en lignes de sommaire dépliables
  (numéro rouge ou jauge `heat` rendue par 1 à 4 carrés violets) ; synthèse sur le modèle du
  classement. La feuille mobile des arguments garde son comportement.
- **Explorateur** : titre « Les 1 069 mesures, <mark>une par une</mark>**.** », champ de
  recherche `.champ`, filtre « Mesures clés » en `.coche`. Chaque partie : numéro d'affiche rouge
  (`1` à `6`), repère de sa couleur, titre `.titre-2` ; chapitres et sous-sections en `.sommaire`
  dépliables ; mesure : texte en Gowun, étiquette « Mesure clé », lien.
- **Mentions** : colonne de 680 px, `.titre`, `.intertitre`, `.corps-petit`.

### Étape 11 — App : affiche à partager

`lib/poster.ts` : même grammaire que la carte du RAG (étape 6) : bandeau violet avec la marque,
titre d'affiche avec « pour moi » surligné, mesures numérotées en rouge séparées par des filets
(plus de cartes lilas ni de pastilles penchées), tortue debout sur un aplat violet en bas à droite,
pied avec la mention non officielle. Formats et tests inchangés.

### Étape 12 — Nettoyage et documentation

- Rechercher et supprimer tout ce que le système remplace : dans les deux projets, plus aucune
  couleur hors `jetons.css` (hors tracé des mascottes), plus de `box-shadow` décalé, de `rotate`,
  de `border-radius` hors 0, 2, 3, 4 px, 50 % et 18 px (bulle), de taille hors échelle. Ajouter
  ces contrôles à un test `design/garde-fous.test` (lecture des CSS des deux projets) pour que la
  dérive ne revienne pas.
- Mettre à jour : `rag/docs/IMPLEMENTATION.md` (section « Direction graphique » : la remplacer par
  un renvoi à `design/`), `rag/README.md` (dernier paragraphe), `app/README.md`, et écrire
  `design/README.md` (les sept règles, comment synchroniser, comment ouvrir la planche).
- `design/mascottes/*.svg` sont des instantanés pour la planche : ajouter au script de
  synchronisation leur régénération depuis `Mascot.tsx` et `ChatiCat.tsx`, ou noter dans le README
  qu'ils se refont à la main.

## 6. Vérification

Pour chaque étape visuelle, captures avec Chrome sans interface (`google-chrome --headless=new
--screenshot`) à **1440, 1024 et 390 px**, comparées à la planche :

- RAG (serveur en consultation : `CONSULTATION_MODE=true`, voir `rag/docs/PLAN-AMELIORATIONS.md`
  § Vérification) : accueil, accueil avec profil, réponse en consultation, lien `?q=retraites`,
  panneau des sources, À propos, menu mobile. Les états qui demandent une génération (points,
  notes en marge, mesures proches, attente, avis) se voient avec un faux `generate` ; à défaut,
  les signaler comme non vérifiés.
- App (`npm run dev`) : accueil, choix de longueur, question, classement, affiche, militant
  (introduction, entretien, synthèse), explorateur, mentions.

Liste de contrôle finale, à cocher dans le compte rendu :

- [ ] aucune couleur hors des jetons ; le RAG n'a plus de bleu, de vert, d'ocre ni de corail ;
- [ ] aucune ombre, aucun contour épais, aucune rotation, aucun élément rond hors mascottes et bulles ;
- [ ] aucune taille de texte sous 12 px, aucune hors échelle ;
- [ ] un seul mot surligné par titre ; le rouge n'apparaît que dans ses cinq rôles (règle 1) ;
- [ ] pas de défilement horizontal à 390 px ; cibles de 44 px ; focus visible partout ;
- [ ] aucun « ? » orphelin en début de ligne ;
- [ ] les deux marques, les bulles, les boutons, les sommaires et les citations sont identiques
      dans les deux applications (mêmes fichiers `systeme/`) ;
- [ ] tous les tests de § 3 verts ; aucun comportement modifié.

Compte rendu attendu : par étape, ce qui est fait, les captures prises, ce qui n'a pas pu être
vérifié, et tout écart par rapport à ce plan ou à la planche.

## 7. Décisions à confirmer avant de lancer

Le plan suppose « oui » à chacune ; dire non à l'une ne remet pas les autres en cause.

1. **Nouveau titre d'accueil du RAG** : « Posez votre question au programme. » à la place de « Les
   mesures, simplement. Les idées, clairement. ».
2. **Notes en marge** sur grand écran (étape 4). Sans elles, les sources restent uniquement dans
   le panneau.
3. **Six couleurs de la seconde palette pour les six parties** du programme (règle 2). Sans elles,
   les repères sont tous violets.
4. **Suppression des confettis** et de la mascotte qui sautille dans l'app.
5. **Le logo LFI n'est pas affiché** (c'est déjà le cas ; la charte en réserve l'usage aux
   insoumis·es et interdit d'engager le mouvement) : les deux outils restent signés « non officiel ».

## 8. Hors périmètre

Mode sombre ; redessiner les mascottes ; police Config (payante) ; toute évolution fonctionnelle
ou de contenu autre que les textes d'interface cités ; l'atelier de relecture `rag/review/` et
`annotation-review/`.
