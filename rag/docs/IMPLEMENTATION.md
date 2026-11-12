# Chati, le Chat Insoumis : proposition d’implémentation

Architecture du 31 octobre 2026, désormais implémentée dans `frontend/`,
`backend/chati/`, `Dockerfile` et `compose.yaml`. Les sections ci-dessous conservent
les décisions de conception. Les commandes de lancement et les limites de
validation sont documentées dans le [README](../README.md).

État actuel : interface compilée, image construite, conteneur démarré, consultation
et API vérifiées. Les tests automatisés de l’intégration OpenAI utilisent des doubles ;
un essai réel avec l’index hybride, Luna et la recherche web a également réussi.
Une première évaluation des 40 cas avec génération est [archivée](../benchmarks/chati-v1/runs/2026-10-31-first/REPORT.md) :
38/40 validés selon un audit de cette session, à confirmer indépendamment. Le navigateur
de prévisualisation est indisponible ; la QA visuelle reste à réaliser.

Le diagnostic lexical est dans `benchmarks/chati-v1/retrieval-baseline.json`.
Il mesure la couverture des groupes de preuves connus, pas la qualité des réponses.
La phase de conception n’est pas considérée comme figée : le second benchmark
inédit doit rester réservé jusqu’à la fin des essais et ajustements réels.

## Architecture retenue pour le premier prototype

| Élément | Proposition | Rôle |
| --- | --- | --- |
| Front-end | React, TypeScript et Vite | Interface de conversation, historique local, affichage des réponses et sources |
| Back-end | Python, FastAPI et Pydantic | API, orchestration de la recherche, génération et validation des références |
| Recherche lexicale | SQLite FTS5 | Mots-clés, sigles, expressions et chiffres |
| Recherche sémantique | Embeddings pré-calculés et similarité avec NumPy | Retrouver les formulations proches par le sens |
| Génération | `gpt-6-luna`, API Responses | Produire une réponse structurée à partir des passages sélectionnés |
| Distribution | Une image Docker construite en plusieurs étapes | Livrer front compilé, serveur, corpus et ressources visuelles |
| Données d’exécution | Un volume pour l’index et ses métadonnées | Réutiliser l’index entre les redémarrages |

Le choix de SQLite et d’une matrice de vecteurs vise la taille actuelle du corpus :
795 mesures et 171 blocs d’annexe. Il faudra mesurer la qualité de recherche et
la consommation réelle avant de faire évoluer ce choix.

En production, FastAPI sert les fichiers statiques construits par Vite et les
routes `/api/` sur la même origine. Un seul processus serveur écoute sur le port
8080 dans le conteneur. En développement, Vite utilise un proxy vers l’API.

Les historiques de conversation sont conservés dans IndexedDB dans le navigateur
pour la V1, avec création, changement, renommage et suppression d’une conversation.
Le serveur reçoit les messages utiles à chaque demande et reste indépendant de
ce stockage. La synchronisation entre appareils n’est pas incluse dans cette V1.

## Direction graphique

Source : [charte graphique de La France insoumise](https://lafranceinsoumise.fr/charte-graphique/),
consultée le 31 octobre 2026. Retenir la palette explicitement intitulée
« Couleurs 2027 », distincte de la liste de couleurs web également présente.

| Jeton | Valeur | Usage prévu |
| --- | --- | --- |
| `--color-purple` | `#4C0297` | Action principale, sélection et références interactives |
| `--color-red` | `#D1271C` | Accents graphiques et signalement d’erreur |
| `--color-cream` | `#FFFCF4` | Fond principal |
| `--color-charcoal` | `#212320` | Texte et icônes |

Public Sans Black/Bold pour le nom Chati, les titres, contrôles et libellés.
Gowun Batang Regular/Bold pour les réponses longues et les extraits. Ces familles
sont proposées comme alternatives gratuites sur la page de la charte ; leurs
fichiers et notices seront conservés avec les ressources du front lors de
l’implémentation, puis servis localement. Le nom Chati est accompagné du logo
officiel LFI, téléchargé depuis la charte et servi localement sans modification.
L’accueil met en avant l’exploration des mesures et des explications compréhensibles ;
les références restent disponibles en appui des réponses. La palette générale reste violet/crème ; les encarts Logement et Santé conservent
leurs accents rouges.

Les boutons, les encarts et le nom encadré « Chati » reprennent le traitement
de [LFI Réseaux](https://lfi-reseaux.melenchon2027.workers.dev/) : contours épais
violet foncé, coins arrondis, ombres nettes décalées et effet d’enfoncement à
l’activation. Ces règles sont regroupées dans `frontend/src/styles/frames.css`.

Les variantes de survol, bordures et surfaces seront des jetons distincts. Vérifier
les contrastes des combinaisons réellement affichées et ne jamais utiliser la
couleur seule pour indiquer une sélection, une source ou une erreur.

## Interface de conversation

La structure reprend les usages familiers d’un chat :

- Barre latérale d’environ 260 px : nom de l’outil, nouvelle conversation,
  recherche dans l’historique local et liste des conversations.
- Colonne de conversation centrée, d’environ 760 px maximum, avec une zone de
  lecture aérée, une saisie multiligne et un bouton d’envoi fixé en bas.
- Écran d’accueil avec une invitation courte et quelques exemples de questions.
- Messages utilisateur et réponses différenciés par leur mise en page ; boutons
  copier, réessayer et arrêter la demande en cours.
- Références numérotées accolées aux affirmations et fiches « mesures concernées ».
- Panneau des sources à droite sur grand écran ; panneau plein écran sur mobile.
  Le menu des conversations devient un tiroir sur petit écran.

Une réponse peut contenir : réponse directe, mesures expliquées, avantages
attendus et limites utiles. Les rubriques ne sont affichées que si elles servent
la réponse : une question précise sur un chiffre n’impose pas un long argumentaire.

Chaque fiche source montre le texte exact, la section, la sous-section et un
lien vers la page du PDF. Les annexes portent un libellé « définition » ou
« annexe », distinct de « mesure ». La provenance est présentée comme le résumé
fourni, avec sa version, conformément au corpus de référence.

Les états prévus sont : accueil, conversation, recherche en cours, génération,
vérification, réponse prête, clarification, information absente et erreur récupérable.
Le contenu saisi est conservé en cas d’échec. Prévoir navigation clavier, focus
visible, libellés accessibles, annonces d’état et prise en compte des animations
réduites.

## Parcours d’une requête

1. Valider le message et la taille de l’historique reçu. Reconstituer la question
   utile pour les suivis ; conserver l’ambiguïté lorsqu’elle nécessite une précision.
2. Interroger les index lexical et sémantique. Point de départ à ajuster au
   benchmark : vingt candidats par méthode, fusion des classements, puis six à dix
   passages pour le contexte. Ces paramètres sont des hypothèses, pas des résultats.
3. Ajouter les dépendances documentaires : par exemple s03-ss01-m015 (« Cet argent »)
   avec s03-ss01-m014. Conserver le type mesure/annexe, les ancres et la version.
4. Envoyer à Luna les passages sélectionnés et leur identifiant, avec des consignes
   distinguant proposition, explication, objectif annoncé et interprétation.
5. Recevoir une sortie structurée : blocs de réponse, identifiants cités, mesures
   expliquées, avantages éventuels et limites ou demande de clarification.
6. Valider le schéma et les références. Chaque ID utilisé doit appartenir aux
   passages fournis ; toute citation littérale doit correspondre à son texte.
   Le serveur construit les liens et les numéros de page à partir du corpus.
7. Afficher la réponse et les sources validées. Si la validation structurelle
   échoue, une réparation bornée peut être tentée ; à défaut, retourner une erreur
   explicite plutôt qu’une réponse avec références invalides.

Le contrôle technique d’un ID ou d’une citation ne prouve pas que la source
soutient toute l’explication. Le benchmark doit aussi évaluer ce soutien sémantique,
les conditions des mesures, les effets non démontrés et les absences de données.

L’API transmet progressivement les **étapes de traitement** et les passages
trouvés (`context`), puis une réponse structurée après validation. Derrière le réglage
`STREAM_BLOCKS` (désactivé par défaut), les blocs complets sont aussi diffusés à mesure
qu’ils sont écrits (`backend/chati/streaming.py`), à titre provisoire : la réponse
finale validée les remplace. Le texte n’est jamais diffusé mot par mot.

Une question autonome (un seul message, sans web ni mesure de suivi) dont la réponse
vérifiée est déjà connue est servie depuis le cache en mémoire (`backend/chati/cache.py`,
clé : question normalisée, version du corpus, modèle, profil), sans appel au modèle ni
question décomptée.

## API proposée

| Route | Responsabilité |
| --- | --- |
| `GET /api/health` | Santé du processus |
| `GET /api/status` | Version du corpus, état et mode de l’index, disponibilité de la configuration |
| `POST /api/chat` | Messages en entrée ; événements SSE de statut puis réponse structurée finale |
| `GET /api/sources/{id}` | Texte exact et provenance d’une mesure ou annexe de la version chargée |
| `POST /api/feedback` | Avis anonyme sur une réponse (pouce, motif) ; aucun texte libre accepté |

Le front lit le flux SSE du POST avec `fetch` et peut annuler la demande. L’arrêt
est propagé côté serveur autant que possible. Les événements portent un identifiant
de demande et un type stable :

| Événement | Contenu |
| --- | --- |
| `status` | étape en cours (`stage`, `label`) |
| `context` | après la recherche, avant la rédaction : `sources`, au plus 6 mesures trouvées (ni en mode `full`, ni en consultation) |
| `block` | seulement avec `STREAM_BLOCKS=true` : un bloc complet déjà écrit par le modèle (`index`, `kind`, `text`, `points`, `source_ids`), affiché à titre provisoire s’il ne cite que des IDs fournis et ne contient aucune référence manuelle |
| `reset` | avant une seconde tentative de génération : les blocs provisoires sont effacés |
| `answer` | réponse finale validée ; elle seule fait foi |
| `done` | fin du flux |
| `error` | message ; `retry_after` (secondes) quand le fournisseur est saturé |

La réponse finale contient au minimum `request_id`, `corpus_version`, `blocks`,
`measures`, `sources` et un statut (`answered`, `partial`, `clarification`,
`not_in_corpus`). Chaque bloc porte `points` (liste de `{text, source_ids}`, une
entrée par mesure, autorisée pour `explanation`, `benefits` et `comparison`) ; après
validation, `source_ids` du bloc réunit ses propres IDs et ceux de ses points. Le
texte peut encadrer de `**` au plus trois chiffres clés par bloc, rendus en gras par
le front sans interpréter d’autre balisage. La réponse ajoute aussi `related` (jusqu’à
3 mesures proches non citées, seulement pour `not_in_corpus`) et `cached` (vrai si la
réponse vient du cache). Si le contrôle des références échoue hors mode web, la
réponse est une consultation (`mode: consultation`) des passages les plus proches,
et la question n’est pas décomptée. Les URL ne sont jamais demandées au modèle ; elles sont résolues
par le serveur. Le front affiche les contenus comme du texte ou du Markdown
contrôlé, sans interpréter du HTML arbitraire.

### Questions de suivi et recherche externe

`POST /api/chat` accepte aussi `research` (faux par défaut),
`focus_measure_id` pour ancrer une relance sur une mesure connue du serveur, et
`profile` (au plus 3 publics de `data/programme/publics.json`, 422 sinon). Une question qui exprime
un doute ou porte sur le coût (`backend/chati/objections.py`, texte entre « » ignoré) déclenche,
si la recherche web est disponible et `OBJECTION_RESEARCH` actif, une recherche d’exemples à
l’étranger et de base juridique (`research_web(objective='objection')`) ; la synthèse est générée
en mode `objection`, qui n’exige pas de citation web. Sans résultat vérifié, le programme seul
répond. Quand des exemples web sont utilisés, le champ `research` de la réponse vaut vrai. Enfin, `profile` : les mesures
retrouvées qui concernent ce profil reçoivent un petit bonus de classement
(`PROFILE_BOOST`) et le modèle reçoit le champ `profil`. La
réponse ajoute `followups`, des suggestions construites à partir d’une mesure
effectivement citée, ainsi que l’indication du mode de recherche. L’interface
propose l’exemple concret, la comparaison à aujourd’hui et les avantages/limites.

En mode enrichi, `chati/web.py` appelle Luna avec l’outil natif `web_search`, une
recherche obligatoire, l’accès récent au web et une limite d’appels. Les annotations
URL sont transformées en références `web-XXX` et associées à la synthèse de recherche.
Une seconde génération structurée utilise ces références avec les passages du
programme. Seuls les IDs connus sont admis dans les citations ; les URLs et leurs
métadonnées viennent de la première réponse native. Les plages de citation communes
à plusieurs URLs sont fusionnées avant transformation.

Les sources externes ont le type `web` et leur date de consultation. Elles restent
dans la réponse et l’historique local ; `/api/sources/{id}` demeure la consultation
des sources du corpus. La date de consultation ne vaut pas vérification de la date
de publication ou d’application. Le texte de synthèse n’est pas présenté comme
un extrait littéral des sites. La pertinence sémantique de chaque référence exige
toujours une évaluation.

Le mode programme et le benchmark courant n’appellent pas la recherche web. Un
échec de recherche ne se transforme pas en une comparaison supposée actuelle.

Référence : [outil web_search OpenAI](https://developers.openai.com/api/docs/guides/tools-web-search).

## Construction et exécution Docker

Le Dockerfile aura une étape Node pour construire le front et une étape Python
pour l’exécution. La dernière image contiendra : serveur, front compilé, polices,
corpus structuré et PDF. Les dépendances seront figées par des fichiers de verrouillage.
Les données du benchmark et ses corrigés ne seront pas embarqués dans le contexte
de génération de l’application.

La génération appelle l’API OpenAI : l’image n’embarque pas les poids de Luna et
nécessite une connexion à cette API. La clé est injectée à l’exécution côté serveur.
Aucun appel OpenAI ni secret n’est nécessaire à la construction de l’image.

L’index sémantique est créé par une commande d’indexation **de la même image**, à
l’exécution, puis conservé dans le volume. Cette commande associe au résultat
l’empreinte du corpus, le modèle d’embedding et sa configuration. Le modèle
d’embedding est distinct du modèle de génération et sera fixé avant cette étape.
L’application vérifie ces métadonnées au chargement.

Un index absent ou incompatible doit être signalé par `/api/status` et empêcher
les demandes qui nécessitent le mode hybride. Un mode lexical explicite peut
servir au développement ; il ne doit pas être présenté comme une recherche hybride.

Livrables prévus : `Dockerfile`, `.dockerignore`, `compose.yaml`, `.env.example`,
commande d’indexation et documentation de lancement. Compose décrira un seul
service applicatif, son port et son volume. Le processus s’exécutera avec un
utilisateur non privilégié. Les délais, la taille des requêtes et le nombre de
générations simultanées seront bornés et configurables.

## Organisation proposée du code

```text
frontend/
  src/components/       # conversations, messages, saisie, sources
  src/lib/              # client API, lecture SSE, historique local
  src/styles/           # jetons et styles de la charte
backend/
  chati/main.py         # routes, cycle de vie et événements
  chati/models.py       # schémas des demandes et réponses
  chati/corpus.py       # sources et dépendances de contexte
  chati/retrieval.py    # index, recherche et fusion
  chati/generation.py   # OpenAI, consignes et contrôle des références
  chati/index.py        # commande de construction des index
docs/
Dockerfile
compose.yaml
```

Ce plan prolonge les dossiers `data/`, `scripts/`, `tests/` et `benchmarks/` existants.

## Ordre de réalisation

1. **Socle de bout en bout** : interface aux couleurs retenues, consultation des
   sources réelles, API et image Docker. Un éventuel mode de démonstration est
   explicitement identifié comme tel.
2. **Recherche** : index lexical puis sémantique, fusion, dépendances de contexte
   et diagnostic des résultats sur le benchmark de conception.
3. **Génération** : Luna, sortie structurée, contrôle des références, gestion des
   suivis, clarifications et demandes insuffisamment documentées.
4. **Évaluation et finition** : exécution des quarante cas, analyse des erreurs,
   tests des échanges front/API, consultation des sources, mobile et image Docker.
5. **Évaluation indépendante** : figer la configuration après la conception, puis
   créer le second benchmark sur de nouvelles sous-sections selon
   [NEXT-BENCHMARK.md](../benchmarks/NEXT-BENCHMARK.md).

Critères de livraison du prototype : démarrage reproductible de l’image, index
versionné, conversation fonctionnelle, citations ouvrant le bon texte et la bonne
page, erreurs compréhensibles et rapport de benchmark distinguant recherche,
fidélité et justesse des références. Les résultats et limites observés seront
documentés ; un résultat sur les quarante cas de conception ne vaut pas une
mesure indépendante de généralisation.

## Références techniques

- [Build de production Vite](https://vite.dev/guide/build) : génération du front statique.
- [FastAPI dans Docker](https://fastapi.tiangolo.com/deployment/docker/) : serveur conteneurisé.
- [Construction Docker en plusieurs étapes](https://docs.docker.com/build/building/multi-stage/) : séparation construction/exécution.
- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) et
  [sorties structurées](https://developers.openai.com/api/docs/guides/structured-outputs).
