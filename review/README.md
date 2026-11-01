# Atelier local de relecture de Chati

**Ouvrir http://localhost:8081.** Cette interface est séparée du chat sur 8080.
Elle sert à la relecture personnelle des résultats v2 : elle n’appelle aucun
modèle, ne modifie pas le programme et n’injecte pas le corrigé dans Chati.

## Ce qui est proposé

- Quatre cas initialement incomplets : CH2-007, 030, 031 et 038, avec leurs deux
  réponses et l’audit ciblé de stabilité.
- Huit réponses notées 100/100 et complètes par le premier juge : CH2-004, 012,
  023, 026, 029, 032, 039 et 040. Il s’agit de **jugements positifs à contrôler**,
  pas de réponses certifiées par une personne.
- Les questions et historiques, les blocs, les fiches de mesures, les lacunes
  déclarées, les sources citées, les preuves attendues et les passages réellement
  fournis à chaque run. Les liens PDF ouvrent la page correspondante.
- Une recherche locale dans les **966 passages canoniques** pour vérifier les
  constats d’absence au-delà des seules citations. Les alias ne font pas preuve.
- Un corrigé et une analyse machine repliés par défaut pour limiter l’ancrage,
  des conseils de relecture et les quatre dimensions de notation.
- Brouillons dans le navigateur, enregistrement sur le serveur local, finalisation
  ou verdict incertain et export JSON avec les identifiants/empreintes de réponses.

L’échantillon de huit couvre les six catégories avec les quotas 2/1/2/1/1/1.
Dans chaque catégorie, les candidats initialement parfaits sont triés par le
SHA-256 de `chati-v2-human-review-2026-11-01:CH2-XXX`. Les premiers du quota sont
retenus. Le second run n’influence pas ce choix. C’est un contrôle des faux
positifs potentiels du juge, pas un échantillon représentatif de tous les usages.

CH2-007 a été renoté après clarification utilisateur : la condition
d’harmonisation concerne uniquement les élargissements. Le second passage est
complet (2/2 en exactitude), le premier reste partiel (1/2). Les anciens audits
sont archivés ; le corrigé actuel est la version 1.0.3-user-amended.

## Parcours conseillé

1. Choisir un cas et le passage à relire. Le premier passage est sélectionné par
   défaut. L’option comparaison montre les deux versions.
2. Lire la question, son historique et **toutes les fiches** : une négation omise
   dans une fiche est aussi un défaut de la réponse.
3. Ouvrir les citations et vérifier ce qu’elles prouvent. Consulter le contexte
   retrouvé, puis la recherche dans le corpus complet si une information est
   déclarée absente.
4. Noter exactitude, sources, limites et clarté, avec vos propres raisons. Les
   notes machine ne sont jamais recopiées dans vos champs.
5. Examiner les critères : 0 absent/incorrect, 0,5 partiel, 1 complet. Copier un
   extrait de la réponse et expliquer votre couverture. Examiner les branches
   conditionnelles seulement lorsqu’elles sont développées.
6. Consulter le corrigé et l’analyse automatique lorsque vous le souhaitez.
   Pour CH2-038, l’arbitrage Codex peut être contesté et votre motif conservé.
7. Enregistrer le brouillon ou finaliser. Un verdict incertain peut être finalisé
   avec une explication sans inventer de notes. Un verdict qui diverge du calcul
   de la grille demande une justification d’arbitrage.

Une relecture finale ne signifie pas automatiquement « réponse valide » : elle
peut conclure à une correction nécessaire ou à une impossibilité de trancher.
Le compteur latéral suit les **12 réponses du premier passage** ; les notes du
second sont conservées indépendamment. Aucun taux de fidélité lien par lien
n’est calculé à partir de ces seuls formulaires de critères.

## Enregistrement et export

La frappe garde un brouillon dans le navigateur. Les boutons d’enregistrement
écrivent dans :

```text
benchmarks/chati-v2/human-review/2026-11-01-session/annotations/human-reviews.json
```

Ce fichier est ignoré par Git. Les essais automatiques utilisent des répertoires
temporaires, et aucune fausse relecture humaine n’a été préremplie. La session
et l’empreinte de la réponse sont associées à chaque note. Un changement de
session ne peut pas écraser silencieusement les notes d’une autre session.

« Exporter mes notes » télécharge les notes enregistrées et les brouillons du
navigateur, avec leur statut. Les annotations humaines ne remplacent jamais
automatiquement `audit-decisions.json`, les réponses brutes ou les métriques.
Une consolidation ultérieure devra conserver les désaccords et leur arbitrage.

## Démarrage Docker

Depuis la racine :

```bash
docker compose -f compose.review.yaml up --build -d
```

Image séparée `chati-review:local`, utilisateur non privilégié, écoute hôte
`127.0.0.1:8081`. La session et le PDF sont montés en lecture seule ; seules les
annotations sont inscriptibles. Le service n’a pas de clé OpenAI. Les UID/GID
par défaut sont 1000 ; adapter `REVIEW_UID`/`REVIEW_GID` si le propriétaire du
répertoire de notes diffère. `REVIEW_PORT` permet de choisir un autre port.

```bash
docker compose -f compose.review.yaml stop
```

L’arrêt ne supprime pas les notes et n’arrête pas le service Chati.

## Démarrage sans Docker

```bash
python -m review.server \
  --session benchmarks/chati-v2/human-review/2026-11-01-session/session.json \
  --annotations benchmarks/chati-v2/human-review/2026-11-01-session/annotations/human-reviews.json \
  --pdf assets/Programme-Mélenchon-LFI.pdf
```

Python standard suffit, sans dépendance supplémentaire. Le paquet est régénérable
hors ligne avec `.venv/bin/python scripts/prepare_human_review.py` ; cela ne
réécrit pas les réponses ni les notes humaines. Pour refaire la collecte des
40 réponses, utiliser un **nouveau dossier de run** et le collecteur habituel,
pas ce préparateur.

## Vérifications effectuées

- Syntaxe JavaScript vérifiée avec `node --check review/app.js`.
- 33 tests ciblés réussis : provenance, sélection, brouillons sans note implicite,
  finalisation, verdict incertain, arbitrage, persistance et routes HTTP.
- Image construite et HTTP vérifié sur l’accueil, les scripts, styles, polices,
  logo, session, notes et PDF. Le fichier réel de notes humaines est vide au départ.
- Le contrôle visuel automatisé n’a pas été possible : le navigateur de
  prévisualisation est indisponible. Les vérifications HTTP ne le remplacent pas.

La palette, le logo et les polices locales reprennent Chati ; notices et
provenance sont conservées dans `review/assets/`.
