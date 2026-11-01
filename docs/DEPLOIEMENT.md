# Déploiement de la bêta : état, reste à faire, options

Document de suivi, mis à jour le 1er novembre 2026. Le détail technique de chaque étape est dans
[BETA.md](BETA.md) ; ce fichier dit **où on en est** et **quoi décider**.

## 1. État actuel

| Élément | État |
|---|---|
| Code bêta (Groq + GPT-OSS 120B, recherche locale, liens d'accès, quotas Firestore) | Fait, 113 tests passent |
| Image Docker avec modèle d'embeddings et index intégrés | Fait, démarre en lecture seule, utilisateur 1000 |
| Clé Groq | Saisie dans `.env.beta` (limites du compte : 30 req/min, 1 000 req/jour, 8 000 tokens/min, 200 000 tokens/jour, identiques aux défauts) |
| Projet Firebase `chati-beta` | Créé ; règles « tout refuser » à publier (copier-coller dans l'onglet Règles) |
| Compte de service Firestore (`roles/datastore.user`) et clé JSON | À créer / à ranger dans `secrets/firebase-service-account.json` (ignoré par git) |
| Hébergement public | **Non choisi** (voir section 3) |
| Qualité de GPT-OSS sur le benchmark | **Non mesurée** |

## 2. Ce qui reste à faire, dans l'ordre

1. **Firebase** : base Firestore en mode Production (région européenne, définitive), règles publiées,
   compte de service avec le seul rôle `roles/datastore.user`, clé JSON dans `secrets/`.
2. **Compléter `.env.beta`** : `FIREBASE_PROJECT_ID=chati-beta` (le fichier `firebase/.firebaserc` l'a déjà).
3. **Contrôle** : `GOOGLE_APPLICATION_CREDENTIALS=secrets/firebase-service-account.json FIREBASE_PROJECT_ID=chati-beta python scripts/beta_check.py`
   (vérifie la clé Groq, le schéma strict et Firestore).
4. **Évaluer GPT-OSS** : lot v1 d'abord, puis v2 **une seule fois, sans rien régler dessus**
   (8 000 tokens/min : environ 15 minutes et la moitié du quota du jour pour 40 questions, un benchmark par jour).
   Décider ensuite si la qualité suffit pour inviter des testeurs.
5. **Choisir et mettre en place l'hébergement** (section 3).
6. **Inviter** : `BETA_BASE_URL=<adresse publique> python scripts/beta_admin.py create "Prénom"`.
   Le lien est affiché une seule fois ; le jeton, lui, ne dépend pas de l'adresse (seule la partie avant `#` change).
7. **Surveiller** : `python scripts/beta_admin.py budget` après quelques jours, puis ajuster
   `LLM_TOKENS_PER_REQUEST` (3 000 supposé), `DAILY_TOKEN_CAP` et `INVITE_DAILY_LIMIT`.

## 3. Options d'hébergement

Le serveur doit tourner quelque part : il garde la clé Groq et applique les quotas, donc un hébergement
statique (GitHub Pages, Space « Static ») ne suffit pas. Il faut un hébergeur de conteneur ou une machine.
Les informations de tarif et de gratuité ci-dessous viennent de pages consultées le 1er novembre 2026 et
changent souvent : **vérifiez la page de tarification avant de vous inscrire**.

### Sans carte bancaire

| Option | Principe | Avantages | Limites |
|---|---|---|---|
| **Votre PC + tunnel Cloudflare** | `docker compose -f compose.beta.yaml up`, puis `cloudflared` donne une adresse HTTPS publique | Gratuit, sans carte, déjà testé | Disponible seulement PC allumé ; adresse du tunnel rapide qui change à chaque redémarrage (adresse fixe = nom de domaine payant) |
| **Hébergeurs gratuits de conteneurs** (SnapDeploy, Back4app…) | Pousser l'image | Gratuit annoncé | 256 à 512 Mo de RAM annoncés : **à mesurer** (l'image charge un modèle d'embeddings) ; gratuité et heures contradictoires selon les sources |
| **Recherche sans modèle local** | Passer `EMBEDDING_PROVIDER` en lexical pour tenir dans moins de mémoire | Plus petit besoin en RAM | Rappel 0,889 au lieu de 0,947 |

### Avec carte bancaire (gratuit ou presque dans les petits volumes)

| Option | Remarques |
|---|---|
| **Google Cloud Run** | Même projet que Firestore, secrets dans Secret Manager, pas de fichier de clé. Compte de facturation requis. Garder `--max-instances 1` (la jauge de limites est en mémoire). Commande dans BETA.md section 6A. |
| **Autres PaaS à conteneur** (Fly.io, Railway, Render…) | Une carte est généralement demandée ; offres et prix à vérifier. Mêmes réglages : 1 instance, secrets en variables d'environnement, `FIREBASE_SERVICE_ACCOUNT_JSON` pour la clé Firebase. |

### Payant

| Option | Remarques |
|---|---|
| **Hugging Face Spaces (Docker)** | Désormais réservé aux abonnements payants (PRO) d'après la documentation et les retours d'utilisateurs. Tout est prêt : `python scripts/prepare_space.py`, puis BETA.md « Option C ». |
| **Petit VPS** (quelques euros par mois) | Docker + `compose.beta.yaml`, adresse stable, HTTPS via Caddy ou un tunnel. Machine toujours allumée, 1 Go de RAM ou plus suffit. Le plus simple si une adresse fixe est souhaitée. |

### Recommandation
- **Pour commencer, sans dépense** : PC + tunnel Cloudflare, avec quelques testeurs de confiance.
- **Pour une bêta qui dure** : un petit VPS, ou Cloud Run si la carte n'est pas un obstacle. Dans les deux cas,
  l'alerte de budget et le plafond `DAILY_TOKEN_CAP` protègent contre les surprises.
- Rien à changer dans le code selon l'option : l'image et les réglages sont les mêmes.

## 4. Points communs à tous les hébergements
- **HTTPS obligatoire** : le lien d'invitation contient un secret.
- **Une seule instance** : la jauge de limites par minute de Groq est en mémoire du processus.
- **Aucun secret dans git ni dans l'image** : clé Groq et clé Firebase en variables secrètes de l'hébergeur ou en fichiers ignorés.
- **Fuite d'un secret** : révoquer la clé Groq dans sa console, supprimer la clé JSON dans Google Cloud (onglet Clés), en recréer une.
- **Quota épuisé** : l'application bascule sur la consultation des mesures, jamais vers une API payante.

## 5. Décisions à prendre
1. Hébergement : gratuit local (tunnel), conteneur gratuit à tester, ou payant (VPS, Cloud Run, HF PRO) ?
2. Seuil d'acceptation de GPT-OSS sur v1 puis v2 avant d'inviter des testeurs.
3. Nombre de testeurs et `INVITE_DAILY_LIMIT` (5 par défaut ; environ 60 questions/jour au total avec le quota Groq).
