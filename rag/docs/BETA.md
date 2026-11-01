# Bêta de Chati : Groq (GPT-OSS), Firebase et liens d'accès

Ce document décrit ce qui a été mis en place pour une bêta fermée sans API de génération payante, **et ce que vous devez configurer de votre côté** (sections 2 à 6). Les limites de chaque service ont été vérifiées dans leur documentation le 1er novembre 2026 ; elles peuvent changer, et celles de *votre* compte font foi.

## 1. Ce qui change dans l'application

| Sujet | Mise en œuvre |
|---|---|
| Génération | `LLM_PROVIDER=groq` : `backend/chati/groq.py` appelle l'API compatible OpenAI de Groq (chat completions, sortie JSON stricte) avec `openai/gpt-oss-120b`. Le reste du pipeline (consignes, validation des références, citations) est inchangé. |
| Limites par minute | Groq limite l'organisation à 30 requêtes et 8 000 tokens par minute. Une jauge interne (`RateGate`) fait patienter ou refuse poliment une demande (« réessayez dans N secondes ») au lieu de gaspiller le quota quotidien en appels rejetés. Cette question n'est alors pas décomptée. |
| Recherche | `EMBEDDING_PROVIDER=local` : modèle multilingue `paraphrase-multilingual-MiniLM-L12-v2` exécuté sur le serveur (fastembed/ONNX), index construit à la fabrication de l'image. Aucun appel externe, aucune clé. |
| Accès | `BETA_MODE=true` : chaque testeur a un **lien personnel** `https://<site>/#t=<jeton>`. Le jeton est dans le *fragment* de l'adresse, qui n'est ni envoyé au serveur, ni journalisé, ni transmis en `Referer` ; le navigateur le range dans son stockage local et le retire de la barre d'adresse. |
| Quota par lien | `INVITE_DAILY_LIMIT` questions par jour et par lien (5 par défaut, modifiable par invitation). Réservation dans une **transaction Firestore** avant la génération, restituée si aucune réponse n'a été livrée. Remise à zéro à minuit, fuseau `QUOTA_TIMEZONE` (Europe/Paris). |
| Budget global | `DAILY_REQUEST_CAP` et `DAILY_TOKEN_CAP` (suivi des tokens réellement consommés, tentatives de réparation comprises) protègent les limites gratuites de Groq. |
| Quota épuisé | Pas de bascule vers une API payante : la réponse devient une **consultation des mesures** (passages du programme sans génération), avec un message explicatif. |
| Recherche web | Désactivée avec Groq (elle dépend des outils d'OpenAI). |

Données stockées dans Firestore (jamais lisibles par un navigateur) :

- `chati_invites/{sha256 du jeton}` : étiquette, limite quotidienne, actif, expiration. **Le jeton lui-même n'est jamais stocké** : une fuite de la base ne donne aucun lien utilisable.
- `chati_usage/{invitation}_{jour}` : nombre de questions et tokens du jour.
- `chati_budget/{jour}` : compteurs globaux.
- Les compteurs portent un champ `expire_at` : vous pouvez activer une politique TTL pour les purger (facultatif).

## 2. Clé API Groq

1. Créez un compte sur <https://console.groq.com>.
2. **API Keys → Create API Key**, nom `chati-beta`. La clé (`gsk_…`) n'est affichée qu'une fois : copiez-la directement dans votre gestionnaire de secrets (section 5), pas dans un fichier du dépôt, un message ou une capture d'écran.
3. Ouvrez **Settings → Limits** et relevez les limites réelles de votre organisation pour `openai/gpt-oss-120b`. Les chiffres attendus sont 30 requêtes/min, 1 000 requêtes/jour, 8 000 tokens/min, 200 000 tokens/jour, mais ils sont donnés pour une organisation, pas par clé : une seconde clé n'augmente rien. Si les vôtres diffèrent, ajustez `LLM_RPM_LIMIT`, `LLM_TPM_LIMIT` et `DAILY_TOKEN_CAP`.
4. Groq n'indique pas, dans la page de limites, l'heure de remise à zéro des compteurs quotidiens : le budget global de l'application suit le jour UTC (`BUDGET_TIMEZONE`) ; marge de sécurité : `DAILY_TOKEN_CAP=170000` sur 200 000.
5. Une clé exposée se révoque dans la même page (Delete) puis se remplace ; elle n'a aucun usage hors du serveur.

Ordre de grandeur : une question consomme environ 3 000 tokens (hypothèse du réglage `LLM_TOKENS_PER_REQUEST`, **à mesurer**, les tokens de raisonnement de GPT-OSS comptant dans la sortie). À ce rythme, 200 000 tokens correspondent à environ 60 questions par jour pour toute la bêta : par exemple 12 testeurs × 5 questions.

## 3. Firebase / Firestore

1. <https://console.firebase.google.com> → **Ajouter un projet** (Google Analytics inutile). Notez l'**ID du projet** (`FIREBASE_PROJECT_ID`).
2. **Build → Firestore Database → Create database**. Choisissez le mode **Production** (il bloque tout accès depuis un navigateur ; seul le serveur passe) et un emplacement européen (par exemple `eur3` ou `europe-west1`) : **l'emplacement ne peut pas être modifié ensuite**.
3. Publiez les règles du dépôt (refus total pour les navigateurs) : soit collez `firebase/firestore.rules` dans l'onglet *Règles* de la console, soit en ligne de commande :
   ```bash
   npm install -g firebase-tools && firebase login
   cd firebase && cp .firebaserc.example .firebaserc   # puis remplacez l'ID du projet
   firebase deploy --only firestore:rules
   ```
4. Quotas gratuits de Firestore (documentation Firebase) : 1 Gio stocké, 50 000 lectures, 20 000 écritures et 20 000 suppressions par jour, remise à zéro vers minuit heure du Pacifique. Une question coûte environ 3 lectures et 4 écritures : la bêta reste très en dessous.
5. **Facturation.** Firestore tourne dans le quota gratuit, mais **Google Cloud Run exige qu'un compte de facturation soit rattaché au projet**, même si l'usage reste dans son niveau gratuit (à vérifier sur la page de tarification au moment du déploiement). Si vous voulez zéro compte de facturation, hébergez l'application ailleurs (section 6, option B) et gardez Firestore. Dans tous les cas, créez une **alerte de budget** (Facturation → Budgets et alertes) à un montant bas.

## 4. Identités : qui accède à Firestore

N'utilisez pas la clé « Firebase Admin SDK » proposée par défaut (droits très larges). Créez une identité dédiée, limitée à Firestore :

```bash
export PROJECT=VOTRE-ID-DE-PROJET
gcloud config set project $PROJECT
gcloud iam service-accounts create chati-beta --display-name "Chati bêta (serveur)"
gcloud projects add-iam-policy-binding $PROJECT \
  --member "serviceAccount:chati-beta@$PROJECT.iam.gserviceaccount.com" --role roles/datastore.user
```

`roles/datastore.user` donne la lecture et l'écriture des documents Firestore, et rien d'autre.

- **Sur Cloud Run (option A)** : on rattache simplement ce compte au service ; aucun fichier de clé n'existe (identifiants applicatifs par défaut).
- **Sur un serveur Docker (option B)** : créez une clé JSON de ce compte (IAM → Comptes de service → `chati-beta` → Clés → Ajouter une clé), rangez-la hors du dépôt dans `secrets/firebase-service-account.json` (`chmod 600`). `secrets/` et les fichiers `*service-account*.json` sont déjà ignorés par git et par Docker.
- **Vous, pour créer les liens** : `gcloud auth application-default login` avec votre compte Google propriétaire du projet. Ne réutilisez pas la clé du serveur sur votre poste.

## 5. Secrets : où les mettre

| Secret | Où | À éviter |
|---|---|---|
| `GROQ_API_KEY` | Google Secret Manager (Cloud Run) ou `.env.beta` (option B) | dépôt, image Docker, historique du shell, frontend |
| Clé JSON du compte de service | `secrets/` hors dépôt (option B uniquement) | e-mail, messagerie, image Docker |
| Liens d'invitation | transmis en privé, un par personne | forum, canal public (un lien partagé partage aussi son quota) |

Créer le secret Groq sans le laisser dans l'historique du shell :

```bash
read -rs GROQ_KEY && printf %s "$GROQ_KEY" | gcloud secrets create groq-api-key --data-file=- ; unset GROQ_KEY
gcloud secrets add-iam-policy-binding groq-api-key \
  --member "serviceAccount:chati-beta@$PROJECT.iam.gserviceaccount.com" --role roles/secretmanager.secretAccessor
```

## 6. Déploiement

### Option C : Hugging Face Spaces (Docker)

> **Attention (constaté le 1er novembre 2026) :** les Spaces Docker sont désormais marqués « Paid » à la
> création pour un compte gratuit ; seul le SDK Static est gratuit, et il ne peut pas exécuter ce serveur.
> Cette option ne sert donc que si vous avez un abonnement Hugging Face PRO. Sinon, utilisez l'option B.

Un Space « Docker » gratuit héberge l'image ; l'adresse est fixe (`https://<compte>-<nom>.hf.space`).
Le Space doit être **public** (un Space privé exige une connexion Hugging Face de chaque visiteur) :
le code est donc visible, les secrets non. Le Space s'endort après une période d'inactivité et se
réveille à la première visite.

1. Créez un compte sur <https://huggingface.co> (e-mail, sans carte), puis **New → Space**, SDK **Docker**
   (modèle « Blank »), matériel **CPU basic (gratuit)**, visibilité **Public**.
2. Préparez le dossier à pousser (sans secrets, sans benchmarks) :
   `python scripts/prepare_space.py` → `output/space/`.
3. Dans **Settings → Variables and secrets** du Space, ajoutez en **Secrets** (jamais en Variables) :
   - `GROQ_API_KEY` : la clé Groq ;
   - `FIREBASE_PROJECT_ID` : `chati-beta` ;
   - `FIREBASE_SERVICE_ACCOUNT_JSON` : le **contenu complet** du fichier JSON du compte de service
     (copiez-collez le fichier tel quel). Les autres réglages sont déjà dans le Dockerfile généré.
4. Poussez le dossier. Créez un jeton **Write** (Settings → Access Tokens, durée limitée) ; il sert de mot de passe :
   ```bash
   cd output/space && git init -b main && git add . && git commit -m "Chati bêta"
   git remote add space https://huggingface.co/spaces/<compte>/<nom>
   git push --force space main      # identifiant = votre compte, mot de passe = le jeton
   ```
   Le Space construit l'image (quelques minutes, onglet **Logs**) puis démarre.
5. Les liens d'invitation utilisent l'adresse du Space :
   `BETA_BASE_URL=https://<compte>-<nom>.hf.space python scripts/beta_admin.py create "Prénom"`.
   Pour mettre à jour : relancez `prepare_space.py`, puis refaites le commit et le push depuis `output/space`.

### Option A : Google Cloud Run (recommandé si la facturation est acceptable)

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com firestore.googleapis.com
gcloud run deploy chati-beta --source . --region europe-west1 \
  --service-account chati-beta@$PROJECT.iam.gserviceaccount.com \
  --allow-unauthenticated --max-instances 1 --memory 1Gi --cpu 1 --cpu-boost --timeout 120 \
  --set-env-vars "LLM_PROVIDER=groq,GROQ_MODEL=openai/gpt-oss-120b,RETRIEVAL_MODE=hybrid,EMBEDDING_PROVIDER=local,INDEX_DIR=/app/index-local,HF_HUB_OFFLINE=1,WEB_SEARCH_ENABLED=false,BETA_MODE=true,QUOTA_BACKEND=firestore,FIREBASE_PROJECT_ID=$PROJECT,INVITE_DAILY_LIMIT=5,DAILY_TOKEN_CAP=170000,MAX_CONCURRENT_REQUESTS=2" \
  --set-secrets "GROQ_API_KEY=groq-api-key:1"
```

- `--allow-unauthenticated` est nécessaire (la protection est le lien d'invitation, côté application).
- `--max-instances 1` est **volontaire** : la jauge des limites par minute de Groq vit dans le processus. Deux instances la doubleraient. Les quotas par lien et le budget global, eux, sont dans Firestore et restent exacts.
- Le premier démarrage à froid charge le modèle de recherche (quelques secondes) ; `--cpu-boost` aide. Pour l'éviter, `--min-instances 1` (peut sortir du niveau gratuit).
- Épinglez la version du secret (`:1`) plutôt que `latest` : les variables sont résolues au démarrage.

### Option B : un serveur ou un poste avec Docker (sans compte de facturation)

```bash
cp .env.beta.example .env.beta        # renseignez GROQ_API_KEY et FIREBASE_PROJECT_ID
mkdir -p secrets                      # y placer firebase-service-account.json (chmod 600)
docker compose -f compose.beta.yaml up --build -d
```

Mettez un proxy HTTPS devant (Caddy, Cloudflare Tunnel…). Les liens contiennent un secret : **HTTPS obligatoire**.

## 7. Vérifier puis inviter

```bash
# depuis votre poste, avec vos identifiants applicatifs et les variables de .env.beta
export FIREBASE_PROJECT_ID=$PROJECT GROQ_API_KEY=...   # ou: set -a; . ./.env.beta; set +a
python scripts/beta_check.py          # Groq : clé, schéma strict, limites restantes ; Firestore : lecture/écriture/restitution

export BETA_BASE_URL=https://adresse-publique-de-la-beta
python scripts/beta_admin.py create "Prénom Nom" --limit 5 --days 30   # affiche le lien UNE fois
python scripts/beta_admin.py list                                      # usage du jour par invitation
python scripts/beta_admin.py revoke <id>                               # désactive un lien (restore pour le rétablir)
python scripts/beta_admin.py budget                                    # budget global du jour
```

Après quelques jours, comparez `budget` (tokens réels par requête) à l'hypothèse de 3 000 et corrigez `LLM_TOKENS_PER_REQUEST`, `DAILY_TOKEN_CAP` et les limites par lien.

## 8. Ce qui n'est pas validé

- **La qualité des réponses de GPT-OSS n'a pas été mesurée.** Le 40/40 obtenu avec le modèle précédent ne se transfère pas. Je n'avais pas de clé Groq : l'adaptateur est testé avec un faux serveur compatible (requête, schéma strict, jauge, erreurs 400/429), pas avec le vrai service. Avant d'ouvrir la bêta : lancer `beta_check.py`, puis évaluer le lot de développement `benchmarks/chati-v1`, puis seulement ensuite `chati-v2` (lot réservé : ne rien régler à partir de ses résultats).
- **Évaluation sous les limites gratuites :** 40 questions consomment environ 120 000 tokens (la moitié du quota du jour) et, à 8 000 tokens/minute, prennent une quinzaine de minutes. Lancez le test avec un serveur **sans** `BETA_MODE`, `LLM_MAX_WAIT_SECONDS=90` et `--concurrency 1`, un benchmark par jour.
- **Recherche locale :** sur le lot de développement, le rappel des preuves attendues est de 0,947 avec le modèle local (12 passages), contre 0,982 avec les embeddings OpenAI et 0,889 en recherche lexicale seule. La différence est un risque de passages manquants (donc de « fausses absences ») un peu plus élevé.
- **Une seule instance** ; la jauge des limites par minute n'est pas partagée entre instances.
- Les réglages de GPT-OSS (`GROQ_REASONING_EFFORT=low`, `GROQ_TEMPERATURE=0.3`, `GROQ_MAX_COMPLETION_TOKENS=2500`) sont des choix prudents pour économiser les tokens, non des optimums mesurés.
- Si Groq refuse le schéma strict (erreur 400), l'adaptateur retente une fois en mode « au mieux » ; `GROQ_STRICT_SCHEMA=false` force ce mode.
- Un lien partagé partage son quota ; un lien perdu se désactive avec `revoke`.

## 9. Réglages

| Variable | Défaut | Rôle |
|---|---|---|
| `LLM_PROVIDER` | `openai` | `groq` pour la bêta |
| `GROQ_API_KEY`, `GROQ_MODEL` | – / `openai/gpt-oss-120b` | clé (secret) et modèle ; `openai/gpt-oss-20b` est moins cher en tokens |
| `GROQ_REASONING_EFFORT` | `low` | `low`, `medium` ou `high` : plus c'est élevé, plus les tokens de raisonnement sont nombreux |
| `LLM_RPM_LIMIT`, `LLM_TPM_LIMIT`, `LLM_TOKENS_PER_REQUEST`, `LLM_MAX_WAIT_SECONDS` | 30, 8000, 3000, 20 | jauge par minute |
| `EMBEDDING_PROVIDER`, `LOCAL_EMBEDDING_MODEL` | `openai` / MiniLM multilingue | `local` pour la bêta |
| `BETA_MODE` | `false` | active l'accès par lien et les quotas |
| `QUOTA_BACKEND` | `firestore` | `memory` : tests uniquement |
| `FIREBASE_PROJECT_ID`, `QUOTA_COLLECTION_PREFIX` | – / `chati` | projet et préfixe des collections |
| `INVITE_DAILY_LIMIT` | `5` | questions par jour et par lien (modifiable par invitation) |
| `QUOTA_TIMEZONE`, `BUDGET_TIMEZONE` | `Europe/Paris`, `UTC` | jour des quotas par lien, jour du budget global |
| `DAILY_REQUEST_CAP`, `DAILY_TOKEN_CAP` | 900, 170000 | budget global journalier |
