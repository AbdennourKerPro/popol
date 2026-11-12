# Chati (`rag/`) — plan d'implémentation des améliorations UX et techniques

## Contexte

Chati est l'assistant RAG du dépôt, dans `rag/` : front React 19/Vite (`rag/frontend`), FastAPI
(`rag/backend/chati`), recherche hybride (SQLite FTS5 + embeddings, fusion RRF), génération
structurée via `client.responses.parse` (OpenAI « Luna », ou GPT-OSS sur Groq en bêta via
l'adaptateur `groq.py`), puis contrôle strict des références (`validate_answer`).

La fidélité est déjà bonne (benchmark v2 : 40/40). Le but de la plateforme est de **présenter le
programme sous un bon jour pour convaincre**. Ce plan traite ce que le benchmark ne mesure pas :
lisibilité, vitesse perçue, pertinence personnelle, partage, réponse aux objections, plus deux
défauts repérés dans le code. Contrainte forte de la bêta : Groq plafonne à 8 000 tokens/min et
~200 000 tokens/jour, soit environ 60 questions par jour pour tous les testeurs ; le cache de
réponses (étape 7) est donc le levier principal de capacité.

Décisions déjà prises par l'utilisateur :
- Périmètre : lots 1 et 2 (étapes 1 à 12 ci-dessous). Hors périmètre : changement de modèle
  d'embeddings, reclassement, multi-instance, refonte complète de `App.tsx`.
- Objections : Chati **répond aux objections de l'utilisateur avec les arguments du programme** ;
  il n'en formule toujours aucune de sa propre initiative.

## Règles de travail

- Toutes les commandes se lancent depuis `rag/`. Tests :
  `PYTHONPATH=backend .venv/bin/python -B -m pytest tests -q`, `npm --prefix frontend test`,
  `npm --prefix frontend run build`. Les faire passer **après chaque étape**.
- L'arbre de travail contient beaucoup de modifications non commitées (voir `git status`) : ne
  rien annuler, ne rien reformater hors des lignes touchées, ne pas committer sans demande.
- Ne pas modifier `rag/benchmarks/` (sauf le nouveau dossier `benchmarks/objections/`), ni `app/`
  (lecture seule ; `app/data/` sert de source à l'étape 10).
- Aucun appel réseau réel dans les tests : suivre le style existant (`AsyncMock`,
  `SimpleNamespace`, `monkeypatch.setattr('chati.main.generate', …)` dans `tests/test_api.py`,
  `tests/test_web.py`, `tests/test_beta.py`).
- Pas de nouvelle dépendance front ni back (ni bibliothèque Markdown, ni Redis).
- Garder les invariants existants : aucune URL ni identifiant de source dans le texte généré, les
  URL sont résolues par le serveur, le mode web ne retombe jamais sur une affirmation non vérifiée,
  un index incompatible ne bascule pas en silence.
- Textes d'interface en français, vouvoiement, typographie française (apostrophes « ’ »).
- Chaque étape est livrable seule. Si une étape bute sur une hypothèse fausse (API du SDK,
  comportement d'un test), s'arrêter et le signaler plutôt que d'improviser un contournement.

## Étape 1 — Corriger le contrôle « réponse factuelle sans source »

`backend/chati/generation.py`, `validate_answer` : le test
`answer.status in {'answered','partial'} and block.kind == 'answer' and not block.source_ids`
est placé dans la boucle `for kind in (...)` et lit la variable `block` restée de la boucle
précédente : seul le **dernier** bloc est vérifié.

- Déplacer ce test dans la boucle `for block in answer.blocks`.
- Test (`tests/test_api.py`) : un bloc `answer` sans source suivi d'un bloc `explanation` sourcé,
  statut `answered` → `ValueError` « sans source ». Une `clarification` sans source reste valide.

## Étape 2 — Filtre des questions de suivi moins aveugle

`backend/chati/followups.py` : `CRITICAL` écarte par sous-chaîne (`limite`, `risque`, `problème`,
`danger`, `mais`…) des questions légitimes.

- Réécrire le motif pour ne viser que la mise en cause d'une mesure :
  - nom critique **suivi de** sa cible : `(risques?|dangers?|inconvénients?|limites?|faiblesses?|défauts?|problèmes?)`
    puis `de|du|des|d’` puis éventuellement un déterminant, puis `mesure|proposition|programme|réforme|projet` ;
  - termes toujours écartés (bornes de mots) : `critiqu…`, `inconvénient`, `réaliste`, `faisable`,
    `irréalis…`, `utopi…`, `démagog…`, `impossible`, `efficace ?`, `n’est-ce pas`,
    `ce qu’en disent`, `opposition`, `contest…`, `polémi…`, `trop (cher|coûteux|élevé)`,
    `pourquoi pas`, et `exemple`, `compar…` (ces deux-là supposent le web).
  - retirer `mais`, `et si`, et les sous-chaînes nues `limite|risque|problème|danger`.
- Tests (`tests/test_web.py::test_followups_are_clean_programme_only_questions`) : la liste `bad`
  existante doit rester rejetée ; ajouter comme **acceptées** : « Comment le programme veut-il
  limiter les loyers ? », « Que prévoit le programme face aux risques d’inondation ? », « Quelles
  mesures pour les problèmes de logement ? », « Que prévoit le programme pour les produits
  dangereux ? ».

## Étape 3 — Répondre aux objections avec le programme

`backend/chati/generation.py`, `INSTRUCTIONS`, paragraphe `TON.` : remplacer la phrase
« N’écris jamais d’objection… même si l’utilisateur en fait une. » par :

```
TON. Tu présentes le programme de façon claire et positive, sans exagérer ce que disent les
sources. Tu ne formules jamais de ta propre initiative une objection, une critique, un
inconvénient ou un risque sur une mesure, ni dans les blocs ni dans les suivis.
OBJECTIONS. Si l’utilisateur exprime un doute ou une objection (financement, faisabilité,
réalisme, efficacité), ne l’ignore pas et ne la reprends pas à ton compte : réponds-y avec ce
que le programme dit lui-même. Dans answer, dis en une phrase ce que le programme répond ; dans
explanation, expose les mesures et textes explicatifs qui portent sur ce point (recettes et
financement prévus, méthode, étapes, justification avancée), avec leurs chiffres tels qu’écrits.
N’invente aucun argument, chiffre, étude ou précédent absent des sources. Si les passages ne
répondent pas à l’objection, dis-le simplement dans limits et présente ce que le programme
prévoit sur le sujet. Ne dénigre ni l’utilisateur ni un autre programme.
```

- Conserver la phrase finale du paragraphe sur `benefits` (pas d'avertissement ajouté).
- La règle SUIVIS (« ni question qui critique ou met en doute une mesure ») et le filtre de
  l'étape 2 restent : Chati ne **propose** pas d'objection.
- `backend/chati/synonyms.py` : ajouter le groupe `financement|financer|recettes|budget|cout`.
  Vérifier ensuite que le diagnostic lexical ne recule pas :
  `RETRIEVAL_MODE=lexical PYTHONPATH=backend .venv/bin/python scripts/run_benchmark.py`
  (sans `--generate`, gratuit) → comparer `mean_known_evidence_coverage` à
  `benchmarks/chati-v1/retrieval-baseline.json` ; retirer le groupe s'il baisse.
- Nouveau lot de contrôle manuel `benchmarks/objections/questions.jsonl` (12 questions, même
  format `{"id","messages"}` que `chati-v1/questions.jsonl`), par exemple : « Comment tout cela
  est-il financé ? », « La retraite à 60 ans, c’est irréaliste, non ? », « Bloquer les prix, ça ne
  crée pas des pénuries ? », plus des suivis en deux tours (« Et qui paie ? »). Ajouter
  `benchmarks/objections/README.md` : ce lot n'a pas de corrigé, il se relit à la main (réponse
  non esquivée, sourcée, aucun fait inventé, aucune critique reprise à son compte).
- Nouveau `scripts/run_objections.py` : calqué sur `scripts/run_benchmark.py` (même construction
  `Settings/Corpus/Retriever`, `generate`), sans références ; écrit `output/objections.json` et
  affiche pour chaque cas le statut, les blocs et les IDs cités. À lancer par l'utilisateur avec
  une clé ; **ne pas** l'exécuter dans les tests.
- Test hors ligne : `INSTRUCTIONS` contient `OBJECTIONS.` et ne contient plus
  « même si l’utilisateur en fait une ».

## Étape 4 — Réponses lisibles : points sourcés, chiffres en gras, tailles de police

### 4a. Schéma et validation (back)

`backend/chati/models.py` :
```python
class Point(StrictModel):
    text: str
    source_ids: list[str]

class Block(StrictModel):
    kind: ...
    text: str
    source_ids: list[str]
    points: list[Point] = Field(default_factory=list)
```
(`groq.strict_schema` rend déjà toutes les propriétés obligatoires et retire les contraintes ;
vérifier que `tests/test_beta.py::test_strict_schema_…` passe avec le nouveau champ.)

`generation.py`, `INSTRUCTIONS`, section STRUCTURE :
- `explanation` : `text` = une phrase d'introduction ; `points` = 2 à 6 éléments, un par mesure
  ou groupe de mesures proches, une à deux phrases chacun, avec **ses propres** `source_ids`.
  Remplace la consigne actuelle « regroupées par thème dans le même bloc (phrases ou courts
  paragraphes) ». Toujours un seul bloc `explanation`.
- `benefits` : même principe ; chaque point commence par « Le programme affirme… » ou « On peut
  en déduire… ».
- `answer`, `limits`, `quote` : `points` vide. `comparison` : points autorisés.
- Mise en forme : « Tu peux encadrer de `**` les chiffres, seuils et durées clés (trois au plus par
  bloc). Aucune autre mise en forme, aucune liste dans `text`. »

`validate_answer` :
- `points` autorisés seulement pour `explanation`, `benefits`, `comparison` ; 8 au plus par bloc.
- Chaque point : texte non vide ≤ 2 000 caractères ; `source_ids` non vide et inclus dans les IDs
  fournis ; mêmes interdits que le texte de bloc (URL, `[1]`, marqueurs web, identifiant de source).
  Factoriser ces contrôles de texte dans une fonction interne appliquée aux blocs et aux points.
- « Explication sans référence » : satisfait si le bloc a des `source_ids` **ou** des points.
- En fin de validation, normaliser : `block.source_ids = dédoublonné(block.source_ids + ids des points)`.
  Ainsi `main.py` (`cited`), les contrôles du mode web et `scripts/score_judged_run.py` continuent
  de fonctionner sans changement.
- `scripts/audit_v2_repeat.py:105` et `scripts/score_evaluation.py:121` lisent `block['text']` :
  y ajouter le texte des points (`' '.join([b['text'], *[p['text'] for p in b.get('points', [])]])`)
  pour que les futurs audits voient tout le contenu. Les anciennes réponses archivées n'ont pas
  de `points` : toujours utiliser `.get('points', [])`.
- Tests : point avec ID inconnu rejeté ; point sans source rejeté ; points dans un bloc `answer`
  rejetés ; normalisation de `source_ids` ; un bloc `explanation` sans `source_ids` mais avec
  points sourcés accepté.

### 4b. Rendu (front)

- `frontend/src/lib/types.ts` : `blocks: { kind; text; source_ids; points?: { text: string; source_ids: string[] }[] }[]`.
- Nouveau `frontend/src/lib/richText.tsx` : `renderInline(text)` découpe sur `**…**` et renvoie
  des `<strong className="key-figure">` ; tout le reste est du texte brut (jamais de HTML injecté).
  `stripInline(text)` retire les `**` (copie, partage). Tests vitest : gras simple, `**` non fermé
  laissé tel quel, aucune balise interprétée.
- Nouveau composant `frontend/src/components/AnswerBlocks.tsx` (extrait de `App.tsx:152`) :
  titre du bloc, `<p>` d'introduction suivi des pastilles de citation des IDs **absents des
  points**, puis `<ul className="answer-points">` avec, par `<li>`, le texte et ses citations.
  Numérotation des citations inchangée (index dans `answer.sources` + 1).
- `plainAnswer` (`App.tsx:19`) : inclure les points (« • … »), sans `**`.
- « Les mesures expliquées » : badge « Mesure clé » quand la source a `categorie === 'cle'` ;
  `<details open>` quand il y a 3 mesures ou moins.
- Les conversations déjà stockées (sans `points`) doivent s'afficher comme avant.

### 4c. Tailles de police (`frontend/src/styles/app.css`, `followups.css`, `frames.css`)

Aujourd'hui : 6–8 px pour de nombreux libellés, 9–11 px pour l'interface. Appliquer cette échelle
aux deux points de rupture (bureau et `@media(max-width:760px)`) :

| Actuel | Nouveau |
|---|---|
| 6, 7, 8 px (surtitres en capitales espacées) | 11 px, en réduisant `letter-spacing` à ≤ 1 px |
| 8, 9, 10 px (texte courant d'interface, notes, boutons) | 12 px |
| 11 px | 13 px |
| 12 px | 14 px |
| 13 px | 15 px |
| `.composer textarea` | 16 px partout (évite le zoom automatique d'iOS) |

Texte des réponses inchangé (17 px, 16 px mobile). Après changement, ajuster seulement ce qui
déborde (barre latérale de 267 px, cartes de suggestion, pied du composeur). `.key-figure` :
graisse 700, couleur `var(--purple)`. `.answer-points` : liste sans puce native, espacement
vertical de 10 px, puce carrée `var(--blue)`.

## Étape 5 — Plus d'impasse

`backend/chati/main.py`, `frontend/src/App.tsx`.

- **Mesures proches.** Dans le résultat de `/api/chat`, nouveau champ `related` : jusqu'à 3
  `public_source` de type `mesure` prises dans `selected`, non citées, en préférant
  `categorie == 'cle'` ; renseigné seulement si `answer.status == 'not_in_corpus'`, sinon `[]`.
  Front : sous la réponse, encart « À explorer dans le programme » avec une carte par mesure
  (sous-section + texte tronqué à 160 caractères) ; clic →
  `send('Que prévoit le programme sur ce point : « <texte> » ?', false, { research: false, focus_measure_id })`.
- **Repli quand le contrôle des références échoue.** Entourer les appels `generate` /
  `generate_full` **hors mode web** : sur `ValueError`, produire
  `consultation_answer(rows[:4]…, notice='Je n’ai pas pu rédiger une réponse vérifiée. Voici les passages du programme les plus proches de votre question.')`,
  `mode='consultation'`, et ne pas décompter la question (`delivered` reste faux pour `settle`,
  mais l'événement `answer` est bien émis). Journaliser un avertissement sans le contenu.
  En mode web (`payload.research`), conserver l'erreur actuelle.
  Tests à adapter : `test_api.py::test_generation_failure_is_actionable` (attend maintenant un
  événement `answer` en mode consultation, toujours sans fuite du message d'exception) et
  `test_beta.py::test_failed_generation_gives_the_question_back` (premier cas : plus d'erreur,
  mais `remaining` reste 3). `test_web.py::test_missing_web_proof_never_falls_back_to_current_claim`
  doit rester vert sans modification.
- **Boutons indisponibles.** Dans les fiches de mesure, n'afficher « Expliquer concrètement » et
  « Comparer à aujourd’hui » que si `status.web_available` ; sinon un seul bouton « En savoir
  plus sur cette mesure » →
  `send('Que prévoit précisément le programme avec cette mesure : « <texte> » ?', false, { research: false, focus_measure_id: m.id })`.
  Masquer aussi la bascule « Programme / Programme + web » quand le web est indisponible.
- **Fournisseur saturé.** L'événement `error` émis sur `LLMBusy` porte en plus
  `retry_after` (secondes). `lib/api.ts` lève une `BusyError` (sous-classe d'`Error` avec
  `retryAfter`). `App.tsx` : afficher « Chati est très sollicité, nouvel essai dans N s… » avec
  compte à rebours, relancer **une seule fois** automatiquement la même question, bouton
  « Annuler ». Test vitest : `chat` rejette avec `BusyError` et la bonne durée.

## Étape 6 — Lien direct `?q=` et partage

- `App.tsx` : une fois `loaded` et `status` connus, lire `new URLSearchParams(location.search).get('q')`
  (longueur 2 à 500). Si présent : retirer le paramètre avec `history.replaceState`, puis
  `send(q)` si aucun `accessError`, sinon préremplir `draft`. Protéger par un `useRef` contre le
  double effet de `React.StrictMode`. Ne pas toucher à `lib/invite.ts` (le jeton vit dans `#t=`).
- Nouveau `frontend/src/lib/share.ts` : `shareUrl(question)` →
  `${location.origin}${location.pathname}?q=${encodeURIComponent(question)}` ; `shareAnswer({question, text})`
  utilise `navigator.share({ title: 'Chati', text, url })` s'il existe, sinon copie le lien dans le
  presse-papiers. Test vitest sur `shareUrl` (encodage, pas de jeton).
- Bouton « Partager » dans `.message-actions`, pour les réponses `mode === 'generated'` dont la
  question précédente est le premier message de la conversation ou un suivi autonome : la
  question partagée est le texte du message utilisateur précédent ; `text` = premier bloc sans `**`.

## Étape 7 — Cache de réponses

Nouveau `backend/chati/cache.py` :
```python
def normalize(question: str) -> str   # minuscules, sans accents, espaces réduits, ponctuation finale retirée
class AnswerCache:
    def __init__(self, size: int): ...          # OrderedDict LRU ; size == 0 → désactivé
    def key(self, question, corpus_version, model, profile=()) -> str   # sha256 des champs
    def get(self, key) -> dict | None
    def put(self, key, result: dict) -> None
    def load(self, path, corpus_version, model) -> int   # amorçage depuis un JSONL, entrées d'une autre version ignorées
```
- `config.py` : `answer_cache_size: int = int(os.environ.get("ANSWER_CACHE_SIZE", "300"))`,
  `answer_cache_file: Path = Path(os.environ.get("ANSWER_CACHE_FILE", "data/programme/answers.jsonl"))`.
  Documenter dans `.env.example` et `.env.beta.example`.
- `main.py` : cache créé dans `lifespan`, amorcé si le fichier existe. Une demande est
  **éligible** si : un seul message, `research` faux, pas de `focus_measure_id`, pas de mode
  consultation configuré. Clé = question normalisée + `corpus.version` + `settings.generation_model`
  + profil trié (étape 10 ; vide d'ici là).
  - **Succès de cache** : en bêta, `authorize(request, reserve=False)` (lien valide exigé, aucune
    question décomptée, y compris quota épuisé) ; ne pas prendre le sémaphore ; émettre
    `status` → `answer` → `done` avec un nouveau `request_id`, `cached: true`, `latency_ms` réel,
    `usage: None`, `quota` courant.
  - **Échec de cache** : parcours normal ; après une réponse `mode == 'generated'` de statut
    `answered` ou `partial`, stocker le résultat sans `request_id`, `quota`, `latency_ms`, `usage`,
    `planner_usage`, `research_usage`.
  - `/api/status` : ajouter `answer_cache: {'enabled': bool, 'entries': int}`.
- Amorçage : nouveau `scripts/warm_cache.py --base http://127.0.0.1:8080 [--token …] --questions data/faq-questions.txt --output data/programme/answers.jsonl`
  qui interroge un serveur lancé, lit le flux SSE et écrit `{question, corpus_version, model, result}`
  par ligne. Créer `data/faq-questions.txt` avec les questions des suggestions d'accueil (une par
  ligne, commentaire rappelant de le garder synchronisé avec `App.tsx`) et un
  `data/programme/answers.jsonl` vide commité ; ajouter ce fichier au `COPY` du `Dockerfile` et à
  la liste de `scripts/prepare_space.py:16`.
- Tests : les fixtures `settings` (`tests/test_api.py`) et `beta_settings` (`tests/test_beta.py`)
  passent `answer_cache_size=0` pour ne pas changer les tests qui répètent une question. Nouveau
  `tests/test_cache.py` : normalisation (« Retraites ? » ≡ « retraites »), deuxième demande
  identique servie sans appel à `generate` et avec `cached`, pas de cache pour un suivi / le web /
  une réponse `not_in_corpus` / le repli consultation, éviction LRU, en bêta un succès de cache ne
  consomme pas le quota et exige un lien valide, entrée d'amorçage d'une autre version ignorée.

## Étape 8 — Passages trouvés affichés pendant la rédaction

- `main.py` : juste après la recherche (avant `generating`), émettre
  `event('context', {'sources': [public_source(...)]})` avec au plus 6 lignes de type `mesure`
  (pas en mode `full`, pas en consultation).
- `lib/api.ts` : remplacer les paramètres positionnels de `chat` par un objet de rappels
  `{ onStatus, onContext?, onBlocks? }` (mettre à jour `api.test.ts` et l'appel dans `App.tsx`).
- `App.tsx` : pendant `busy`, sous le libellé d'étape, liste « Dans le programme, j’ai trouvé : »
  avec les titres de sous-section dédoublonnés (4 au plus). Effacée à l'arrivée de la réponse,
  d'une erreur ou d'un arrêt.
- Tests : l'événement `context` précède `answer` (test API avec `generate` simulé) ; `chat`
  appelle `onContext` (vitest).

## Étape 9 — Profil « Et pour moi ? »

Données : `app/data/annotations.jsonl` contient, pour les 1 069 mesures (mêmes IDs que
`rag/data/programme/mesures.jsonl`), `publics`, `themes`, `portee`, `resume` ;
`app/data/taxonomie.json` donne les 28 publics et leurs libellés.

- Nouveau `scripts/sync_annotations.py` : copie vers `rag/data/programme/annotations.jsonl`
  (champs `id`, `publics`, `themes` seulement) et `rag/data/programme/publics.json`
  (`{id: libellé}`) ; refuse d'écrire si un ID est inconnu du corpus. Exécuter le script, commiter
  les deux fichiers, les ajouter au `COPY` du `Dockerfile` et à `scripts/prepare_space.py`.
- `corpus.py` : chargement facultatif → `corpus.publics: dict[str, str]` et
  `corpus.publics_by_id: dict[str, set[str]]` (vides si fichiers absents). Ne pas les inclure dans
  `corpus.version` (l'index d'embeddings reste valide).
- `models.py` : `ChatRequest.profile: list[str] = Field(default_factory=list, max_length=3)`.
  `main.py` : 422 si un identifiant n'est pas dans `corpus.publics`. `/api/status` ajoute
  `publics: [{id, label}]`.
- Recherche (`retrieval.py`) : `search(..., profile=())` → dans `rank`, après la fusion RRF et
  avant le tri, `scores[id] += settings.profile_boost` pour les candidats **déjà présents** dont
  `publics_by_id` croise le profil. `config.py` : `profile_boost: float = 0.005`
  (`PROFILE_BOOST`). Profil vide → classement strictement identique à aujourd'hui (test).
- Génération (`generation.py`) : `generate(..., profile_labels=None)` ajoute `payload['profil']`
  et la note :
  ```
  PROFIL. Le champ profil indique la situation déclarée par l’utilisateur. Quand des mesures des
  sources la concernent directement, place-les en premier dans explanation et dis en quoi elles
  la concernent (« Pour un·e locataire… »). N’invente ni montant personnalisé ni condition
  d’éligibilité absente du texte. Si aucune source ne concerne ce profil, n’en parle pas.
  ```
  Même paramètre pour `generate_full` et pour la régénération de `verification.py`.
- Cache : le profil trié fait partie de la clé (étape 7).
- Front :
  - `lib/profile.ts` : lecture/écriture de `localStorage['chati-profile']` (tableau d'IDs,
    validés contre `status.publics`, 3 au plus), avec `try/catch`.
  - Accueil : rangée « Je suis… » de puces à choix multiple. Ordre et sous-ensemble affichés :
    `etudiant, salarie, precaire, chomeur, retraite, parent, locataire, proprietaire, rural,
    agriculteur, independant, handicap` ; libellés courts définis dans le front (« Étudiant·e »,
    « Salarié·e », « Locataire »…), les libellés longs du serveur servant d'infobulle.
  - Quand un profil est choisi, première carte de suggestion : « Et pour moi ? » →
    `send('Qu’est-ce que le programme changerait concrètement pour moi ?')`.
  - Près du composeur : pastille « Profil : Étudiant·e, Locataire » avec bouton pour l'effacer.
  - `ChatOptions.profile` transmis par `chat()` ; le profil utilisé est enregistré sur le message
    utilisateur (réessai fidèle).
  - Dialogue « À propos » : ajouter « Le profil choisi reste sur cet appareil et accompagne vos
    questions pour orienter les réponses. »
- Suggestions d'accueil : porter la liste à 12 (une par grand thème, même forme que les 4
  actuelles) et en afficher 4 tirées au hasard au montage ; mettre `data/faq-questions.txt` à jour.
- Tests : profil inconnu → 422 ; bonus appliqué seulement aux candidats annotés ; classement
  inchangé sans profil ; `payload['profil']` présent ; vitest sur `lib/profile.ts`.

## Étape 10 — Carte image à partager

- Lire `app/src/lib/poster.ts` (rendu canvas 2D → `canvas.toBlob`, palette et polices de la
  charte, fonction `glue` pour les espaces insécables) et en porter la technique dans
  `frontend/src/lib/shareCard.ts` : `renderShareCard({ question, answer, points, url }): Promise<Blob>`,
  1080 × 1350, fond crème, cadre épais, question en Public Sans 900, réponse en Gowun Batang,
  3 points au plus, signature « Chati — le Chat Insoumis » et l'adresse `?q=`. Attendre
  `document.fonts.ready` avant de dessiner. Pas d'import depuis `app/` (contextes Docker séparés).
- Bouton « Image » dans `.message-actions` : `navigator.share({ files: [File] })` si
  `navigator.canShare?.({ files })`, sinon téléchargement du PNG.
- Test vitest limité à la fonction pure de découpe du texte en lignes (pas de canvas en test).

## Étape 11 — Retour utilisateur

- `POST /api/feedback` (`main.py`), corps strict :
  `{request_id: uuid, rating: 'up'|'down', reason: 'incomplet'|'hors_sujet'|'pas_clair'|'erreur'|null, status, mode, source_ids: list[str] (≤ 20)}`.
  Aucune question ni réponse n'est transmise ni stockée. Le serveur valide les `source_ids` contre
  le corpus et enregistre : jour, note, motif, statut, mode, `section_id` et thèmes des sources.
- Stockage : méthode `record_feedback(doc)` sur `BaseStore` (`quota.py`) — `MemoryStore` : liste ;
  `FirestoreStore` : collection `{prefix}_feedback` avec `expire_at` (90 jours). Hors bêta : une
  ligne `logger.info('feedback …')`. En bêta, lien valide exigé (`authorize(reserve=False)`).
  Un seul retour par `request_id` (ensemble borné en mémoire, 2 000 entrées) → 409 ensuite.
- `scripts/beta_admin.py` : sous-commande `feedback` (totaux par note, motif et thème).
- Front : pouces haut/bas dans `.message-actions` ; « bas » déplie 4 motifs ; le choix est
  enregistré sur le message (`feedback`) et les boutons se figent. Échec réseau silencieux.
- Mettre à jour `docs/BETA.md` (nouvelle collection) et le dialogue « À propos ».
- Tests : validation du corps, 409 au second envoi, 401 sans lien en bêta, document sans texte libre.

## Étape 12 — Diffusion réelle des blocs (à faire en dernier, derrière un réglage)

Objectif : afficher le bloc `answer` dès qu'il est produit, sans attendre la fin de la génération.

- `config.py` : `stream_blocks: bool` (`STREAM_BLOCKS`, faux par défaut).
- Nouveau `backend/chati/streaming.py` : `complete_blocks(buffer: str) -> list[dict]` — repère
  `"blocks"` puis `[`, parcourt en tenant compte des chaînes et des échappements, et renvoie les
  objets `{…}` **complets** déjà reçus (via `json.loads` de chaque objet). Tests unitaires : flux
  coupé au milieu d'une chaîne, guillemets et accolades échappés, tableau vide.
- `generate(..., on_block=None)` : quand `on_block` est fourni et que le client sait diffuser,
  utiliser la variante en flux et appeler `on_block(index, bloc)` pour chaque nouveau bloc complet
  dont les IDs appartiennent aux sources fournies ; la validation finale et la réparation restent
  identiques. Sinon, comportement actuel (`responses.parse`) — les doubles de test n'ont pas de
  flux et ne doivent pas changer.
  - Groq (`groq.py`) : `chat.completions.create(..., stream=True, stream_options={"include_usage": True})`,
    cumuler `delta.content`, lire l'usage du dernier fragment ; mêmes règles de `RateGate`,
    de compteur de tokens et de repli sans schéma strict.
  - OpenAI : `client.responses.stream(..., text_format=GeneratedAnswer)` (gestionnaire de contexte
    asynchrone, événements `response.output_text.delta`, puis `get_final_response()`). **Vérifier
    cette API dans la version installée du SDK** (`.venv`) avant d'écrire le code.
- `main.py` : comme `generate` est attendu dans un générateur SSE, faire passer les blocs par une
  `asyncio.Queue` consommée par `stream()` → événements `block` `{index, kind, text, points, source_ids}` ;
  événement `reset` avant une seconde tentative ; l'événement `answer` final fait foi.
- Front : `onBlocks` alimente un rendu provisoire avec `AnswerBlocks` (citations inactives),
  remplacé par la réponse finale ; vidé sur `reset`, erreur ou arrêt.
- Tests : flux simulé → événements `block` puis `answer` ; second essai → `reset` ; réglage à faux
  → aucun événement `block`.

## Fichiers principaux

- Back : `rag/backend/chati/{generation,models,followups,synonyms,main,config,corpus,retrieval,verification,groq,quota}.py`,
  nouveaux `cache.py`, `streaming.py`.
- Front : `rag/frontend/src/App.tsx`, `lib/{api,types}.ts`, nouveaux `lib/{richText.tsx,share.ts,shareCard.ts,profile.ts}`,
  `components/AnswerBlocks.tsx`, `styles/{app,followups,frames}.css`.
- Données et scripts : `rag/data/programme/{answers.jsonl,annotations.jsonl,publics.json}`,
  `rag/data/faq-questions.txt`, `rag/scripts/{warm_cache,sync_annotations,run_objections}.py`,
  `rag/benchmarks/objections/`, `rag/Dockerfile`, `rag/scripts/prepare_space.py`.
- Docs à tenir à jour en fin de parcours : `rag/README.md` (fonctionnalités, variables),
  `rag/docs/IMPLEMENTATION.md` (événements SSE `context`/`block`/`reset`, champs `points`,
  `related`, `cached`, `profile`), `rag/docs/BETA.md`, `rag/.env.example`, `rag/.env.beta.example`.

## Vérification de bout en bout

1. Après chaque étape : les trois commandes de test/compilation de la section « Règles de travail ».
2. Démarrage local sans clé (consultation) :
   `PYTHONPATH=backend CONSULTATION_MODE=true .venv/bin/uvicorn chati.main:app --port 8080` et
   `npm --prefix frontend run dev` ; contrôler au navigateur, bureau et largeur 390 px : tailles
   de police, accueil et puces de profil, lien `?q=retraites`, panneau des sources.
3. Avec une clé (à faire par l'utilisateur, non bloquant pour la livraison) :
   - `scripts/run_benchmark.py --generate` sur `benchmarks/chati-v1` puis relecture : la consigne
     a changé (points, objections), la fidélité ne doit pas reculer. **Ne pas** relancer v2.
   - `scripts/run_objections.py`, relecture manuelle des 12 réponses.
   - Parcours manuel : question d'accueil deux fois (seconde instantanée, `cached`), question
     hors programme (encart « À explorer »), question sceptique, profil « Locataire », partage
     du lien et de l'image, pouce bas avec motif.
4. Rapport final attendu : par étape, ce qui est fait, les tests ajoutés, ce qui n'a pas pu être
   vérifié sans clé ou sans navigateur, et tout écart par rapport à ce plan.
