# Chati, le Chat Insoumis

Assistant de présentation et d’explication des mesures, avec réponses sourcées.
Interface React/TypeScript, serveur FastAPI, recherche lexicale et sémantique,
génération structurée avec `gpt-6-luna`. Le tout est livré dans **une image Docker**.

## Bêta fermée (Groq, Firebase, liens d’accès)

Une configuration sans API de génération payante est prête : GPT-OSS sur Groq, recherche avec un modèle local,
accès par lien personnel et quota de questions par jour stockés dans Firestore. Tout est décrit, avec les
réglages à faire côté Groq et Firebase, dans [docs/BETA.md](docs/BETA.md) (état et options d’hébergement : [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md)) (`compose.beta.yaml`,
`.env.beta.example`, `scripts/beta_admin.py`, `scripts/beta_check.py`, `firebase/firestore.rules`).

## Démarrer

```bash
cp .env.example .env
docker compose up --build -d
```

Ouvrir **http://localhost:8080**. La configuration initiale active la **consultation
sans IA** : elle retrouve et affiche des textes exacts avec leurs sources. Aucun
appel OpenAI n’est fait dans ce mode lexical. La distinction est affichée dans
l’interface ; ce n’est pas une simulation de réponse de Luna.

## Activer Luna et le RAG hybride

Dans `.env`, renseigner la clé côté serveur et choisir :

```dotenv
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-6-luna
EMBEDDING_MODEL=text-embedding-3-small
CONSULTATION_MODE=false
RETRIEVAL_MODE=hybrid
```

Puis créer l’index avec la même image et lancer le service :

```bash
docker compose run --rm app python -m chati.index
docker compose up -d --force-recreate
```

L’indexation appelle l’API d’embeddings. Les questions en mode hybride appellent
ensuite les embeddings et Luna. L’index persiste dans le volume `chati-index` ;
ses métadonnées lient le corpus et le modèle d’embedding. Après modification du
corpus ou du modèle d’embedding, recréer l’index et redémarrer le service. Un index
manquant ou incompatible ne bascule pas discrètement vers un autre mode.

Pour essayer Luna avec la seule recherche lexicale, utiliser `CONSULTATION_MODE=false`
et `RETRIEVAL_MODE=lexical` ; le caractère lexical reste indiqué. Les poids de Luna
ne sont pas inclus dans l’image : la génération nécessite l’accès à l’API OpenAI.

## Fonctionnalités

- Nouvelle conversation, historique IndexedDB sur l’appareil, recherche, renommage
  et suppression des conversations.
- Questions de suivi, annulation de la requête, copie et reformulation.
- Exploration du corpus, fiches de mesures, annexes et accès aux pages du PDF.
- Réponse structurée, explications, avantages attendus distingués des interprétations,
  et limites lorsqu’une information manque.
- Contrôle des IDs autorisés, des citations littérales et des types mesure/annexe ;
  réparation bornée d’une sortie invalide.
- États de recherche/génération/vérification via SSE, puis affichage de la réponse
  après validation. La V1 ne diffuse pas du texte non validé mot par mot.
- Questions de suivi pour expliquer une mesure avec un exemple, comparer à la
  situation actuelle ou approfondir ses avantages et limites.
- Mode **Programme + web** avec recherche native de Luna et références Internet
  cliquables, distinctes des mesures du résumé.

## Approfondir une mesure et comparer à aujourd’hui

Les boutons « Pour aller plus loin » ouvrent une recherche liée à la mesure
concernée. Le mode **Programme + web** peut aussi être activé près de la zone de
saisie. La mesure reste tirée du corpus ; les explications de contexte et la
situation actuelle peuvent s’appuyer sur des sources externes.

Ce mode utilise l’outil `web_search` de l’API Responses avec le modèle configuré,
par défaut Luna. Il privilégie les sources primaires et officielles pour les règles
en vigueur. La recherche est obligatoire dans ce parcours ; elle est suivie d’une
synthèse structurée. Les URLs proviennent des annotations natives de recherche,
pas d’une bibliographie inventée par le modèle. Les cartes Internet affichent
le site et la date de consultation, sans la confondre avec une date de publication
ou d’entrée en vigueur. Les citations littérales de pages web ne sont pas utilisées,
car leurs extraits exacts ne sont pas transmis à la seconde étape.

Conditions : `CONSULTATION_MODE=false`, clé OpenAI valide et
`WEB_SEARCH_ENABLED=true` (valeur par défaut). `WEB_MAX_TOOL_CALLS=3` borne le nombre
d’appels d’outil d’une recherche (entre 1 et 5). Ce parcours entraîne des appels
OpenAI supplémentaires, dont la recherche web. Si l’outil est indisponible pour le
compte ou ne renvoie pas de références utilisables, Chati n’affirme pas avoir
vérifié la situation actuelle et affiche une erreur explicite.

Le mode **Programme** reste fermé au corpus : la recherche Internet n’y est pas
déclenchée. Le benchmark de conception conserve ce périmètre ; les réponses enrichies
du web demandent une évaluation séparée de fraîcheur et de pertinence des sources.

Les contrôles techniques des références ne prouvent pas le soutien sémantique de
chaque affirmation : cet aspect doit être évalué dans les réponses réelles.

## Développement local

Python 3.14 et Node 24 ont été utilisés pour la validation. Depuis la racine :

```bash
python -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.lock
PYTHONPATH=backend CONSULTATION_MODE=true .venv/bin/uvicorn chati.main:app --port 8080 --reload
```

Dans un second terminal :

```bash
cd frontend
npm ci
npm run dev
```

Vite transmet `/api` et `/documents` au serveur local. Pour la génération en local,
les variables de configuration doivent être exportées dans l’environnement du
serveur ; seul Compose charge automatiquement le fichier `.env`.

## Vérifier

```bash
PYTHONPATH=backend .venv/bin/python -B -m pytest tests -q
npm --prefix frontend test
npm --prefix frontend run build
```

Le benchmark est séparé des données applicatives et exclu de l’image. Pour exécuter
uniquement le diagnostic de recherche sur les quarante cas :

```bash
.venv/bin/python scripts/run_benchmark.py
```

Avec les variables OpenAI exportées, `--generate` ajoute les réponses réelles et
leur usage de tokens. Le script ne transmet jamais le corrigé au modèle. Les
réponses nécessitent ensuite une évaluation sémantique selon la grille ; le taux
de présence de références attendues n’est pas un taux de réponses correctes.

Une [première baseline lexicale](benchmarks/chati-v1/retrieval-baseline.json) est
fournie. La [première évaluation réelle des 40 cas](benchmarks/chati-v1/runs/2026-10-31-first/REPORT.md)
avec Luna et l’index hybride donne **38/40 validés**, dont **32/40 entièrement
complets**, selon un audit de cette session à confirmer indépendamment.
Le [protocole](benchmarks/chati-v1/EVALUATION.md) détaille les métriques et les décisions.
Un essai réel du parcours hybride et web a réussi sur une
comparaison concernant les crèches, avec quatre références externes et la mesure
du programme. Cet essai vérifie l’intégration, pas la qualité sur l’ensemble des sujets.

L’image a été construite et le démarrage, le HTTP et le mode consultation ont été
contrôlés. Les tests automatisés utilisent des doubles pour les appels OpenAI,
en complément de cet essai réel. Le navigateur
de prévisualisation étant indisponible, la validation visuelle desktop/mobile
reste à effectuer.

## Atelier de relecture des résultats v2

Le [second passage des 40 questions inédites](benchmarks/chati-v2/runs/2026-11-01-repeat-01/REPORT.md)
donne **40/40 validés, dont 40/40 complets** (36 au premier passage). Les juges
machine diffèrent entre les deux audits ; ces notes demandent un contrôle humain.

L’atelier séparé propose les quatre cas initialement incomplets et huit réponses
initialement notées parfaites, avec les deux versions, les sources, le contexte
retrouvé, le corrigé replié et des formulaires de relecture vierges.

```bash
docker compose -f compose.review.yaml up --build -d
```

Ouvrir **http://localhost:8081**. Les notes sont persistées séparément et
exportables en JSON. Aucun appel modèle n’est effectué par l’atelier ; le chat
reste sur 8080. Voir le [guide de relecture](review/README.md).

## Configuration et exploitation

Les paramètres sont décrits dans `.env.example`. `docker compose stop` arrête le
service ; `docker compose logs app` montre ses journaux. L’adresse d’écoute sur
l’hôte est locale par défaut (`127.0.0.1`). Cette V1 ne gère pas de comptes ni de
contrôle d’accès multiutilisateur ; l’historique n’est pas synchronisé entre appareils.

Les clés sont injectées à l’exécution, jamais construites dans le front ni dans
l’image. Les journaux applicatifs conservent identifiant, latence et nombre de
sources, sans écrire les messages ni la clé. En génération, les messages utiles
et les passages du corpus sont transmis à OpenAI avec `store=false`.

`GET /api/health` contrôle la vie du processus ; `/api/status` indique la préparation
effective de la recherche et de la génération. Les limites de taille, de durée et
de concurrence sont appliquées côté serveur. Le conteneur utilise un utilisateur
non privilégié ; le seul volume nécessaire contient l’index.

## Documentation

- [Corpus, provenance et extraction](data/README.md)
- [Benchmark de conception](benchmarks/chati-v1/README.md)
- [Second benchmark inédit validé, 40 questions et revues](benchmarks/chati-v2/README.md)
- [Règles de séparation et statut du second benchmark](benchmarks/NEXT-BENCHMARK.md)
- [Architecture et suivi de réalisation](docs/IMPLEMENTATION.md)
- [Compte rendu de validation et vérifications restantes](docs/VALIDATION.md)

La direction graphique s’appuie sur la palette 2027 et les alternatives
typographiques de la [charte de La France insoumise](https://lafranceinsoumise.fr/charte-graphique/).
Les polices sont servies localement ; leurs licences sont dans `frontend/public/licenses/`.
