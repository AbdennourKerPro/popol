# Seconde revue du benchmark Milit'IA v0.2.0-reviewed (40 cas)

Recontrôle indépendant de la version corrigée, réalisé le 31 octobre 2026 en corpus
fermé. La première revue est `benchmark_review.md` ; les réponses de l'auteur sont
dans `review-decisions.md`.

**Verdict global : 34 cas validés, 6 à corriger (corrections mineures), 0 non
vérifiable.** Les corrections de la première revue sont appliquées, et les trois
points refusés ou adaptés sont justifiés. Les problèmes restants n'affectent pas
l'intégrité des sources. Ils concernent surtout deux reformulations « sémantiques »
(MIL-020 et MIL-023) et quelques critères encore mal alignés sur la question posée.

## Ce qui a été vérifié

- **Corpus inchangé** : les empreintes de `mesures.jsonl`, du HTML et du PDF sont
  identiques à la v0.1 et au manifeste. Les fichiers nouveaux (`programme.json`,
  `annexes.jsonl`) ont les empreintes déclarées.
- **Annexes** : les 171 blocs de `annexes.jsonl` reprennent mot pour mot les blocs de
  `programme.json`, et chacun se retrouve dans le HTML source. Aucun texte n'est réécrit.
- **Cohérence du corrigé** :
  - `questions.jsonl` et `references.jsonl` ont des messages identiques ;
  - chaque ID cité (`reference_ids`, `optional_ids`, groupes) a son extrait, et chaque
    extrait est cité au moins une fois ;
  - chaque groupe conditionnel correspond à une branche de `conditional_expectations` ;
  - chaque `minimum` est compris entre 1 et le nombre d'alternatives.
- **Pages, contrôlées indépendamment** : les 132 extraits (mesures et annexes) ont été
  recherchés dans le texte de chaque page, extrait avec `pdftotext`. Tous sont sur les
  pages annoncées.
  - 122 sont retrouvés automatiquement, en tolérant les ligatures rendues par `U+FFFD`.
  - 10 sont confirmés à la lecture du texte brut, parce qu'un bandeau Google s'insère
    dans la mesure. Exemple : « Publié à l'aide de Googleavec » pour s01-ss09-m006.
    Deux coupures de page réelles s'ajoutent à celle déjà connue : s02-ss04-m013
    (p. 13→14) et a01-ss01-b002 (p. 41→42).
- **Tests** : `python -B -m unittest discover -s tests` passe (11 tests).
  `scripts/benchmark_rules.py` applique bien la règle « au moins 75, Sources ≥ 1 si
  applicable, aucune erreur critique » et exclut du rappel les groupes conditionnels
  inactifs.

**Ce qui reste provisoire** : le PDF est toujours une impression de la copie HTML locale.
Le contrôle des pages ne prouve pas la fidélité au Google Doc d'origine.

## 1. Tableau des 40 cas

| ID | Verdict | Constat sur la v0.2 | Correction restante |
|---|---|---|---|
| 001 | validé | Le piège des cinq paliers est ajouté. | — |
| 002 | validé | L'annexe a02-ss02-b007 étaye l'abrogation et les 60 ans ; le groupe « 40 annuités » exige toujours la mesure. C'est correct et testé. | — |
| 003 | validé | Sigle facultatif, erreur « révoquer des élus » ajoutée. | — |
| 004 | validé | Critères exprimés en concepts, avec trois alternatives par groupe. | — |
| 005 | validé | Inchangé, correct. | — |
| 006 | validé | Le leurre externe est généralisé. | — |
| 007 | validé | — | — |
| 008 | validé | m011, m013 et m014 sont facultatifs, avec une erreur sur la force écologique. | — |
| 009 | validé | La paraphrase « remboursement intégral » est acceptée, et la juxtaposition hospitalière est corrigée dans la réponse de référence. | — |
| 010 | validé | — | — |
| 011 | validé | m004 ajouté ; aucune lecture n'est imposée pour « à effectifs réduits ». | — |
| 012 | validé | L'annexe ORE (p. 57, vérifiée) suffit pour les deux suppressions ; l'accès sans sélection devient facultatif. | — |
| 013 | validé | — | — |
| 014 | à corriger | Les groupes séparés sont corrects. Le critère 3 exige cependant les « missions d'utilité publique », que la question ne demande pas (durée, rémunération, caractère obligatoire de la formation). C'est la même situation que MIL-015 et MIL-022, corrigés ailleurs. | Garder « formation militaire optionnelle » comme critère obligatoire ; faire des missions d'utilité publique un complément accepté. |
| 015 | validé | La nationalité devient un complément. | — |
| 016 | validé | — | — |
| 017 | validé | Lexique et encadrement des prix ajoutés ; il est bien précisé que la définition ne prouve pas l'interdiction. | — |
| 018 | validé | La réponse de référence dit « peuvent permettre ». Remarque : le critère 3 parle encore d'« objectif » alors que `benefit_grounding` indique une analyse. | Facultatif : « expliquer l'intérêt possible… ». |
| 019 | validé | Le levier économique est ouvert. Deux remarques : la réponse de référence affirme « L'objectif est d'articuler… », ce qui va contre son propre classement en « analysis » ; et s03-ss07-m002 (« + 300 000 emplois ») concerne l'emploi plutôt que le revenu des agriculteurs. | Facultatif : « On peut y voir… » ; signaler que m002 ne parle pas de revenu. |
| 020 | à corriger | 1) La question demande maintenant « Que précise réellement le texte ? », mais aucun critère obligatoire n'exige de dire que l'objet et les conditions du fonds ne sont pas précisés : seul l'exemple de réponse le fait. 2) La nouvelle formulation crée des distracteurs non couverts : « cours d'eau » renvoie à s03-ss09-m011 et m012 (déclassement, bon état écologique), et « relocalisation » au sens industriel à s03-ss01-m010 (« Agence pour les relocalisations ») et à s01-ss16-m001. | Ajouter le critère « indiquer que le texte ne précise ni ce qui serait relocalisé ni à quelles conditions ». Ajouter comme erreurs : « présenter m011/m012 comme mesures contre les débordements » et « confondre le fonds avec la relocalisation industrielle ». |
| 021 | validé | Compléments et définition ajoutés ; l'objectif est rattaché au titre de la rubrique. | — |
| 022 | validé | « Accord libre » remplace « consentement » ; « viol » reste littéral, ce qui est acceptable ; l'impunité est facultative. | — |
| 023 | à corriger | 1) La reformulation reste littérale : « établissement d'aide par le travail » est le développement presque exact de « Établissement et Service d'Aide par le Travail », écrit dans la mesure. 2) La question annonce les trois réponses attendues (statut, rémunération minimale, droits collectifs) : c'est désormais un cas « précis ». 3) `benefits_requested` vaut toujours `true`, alors que la question ne demande plus d'avantages. 4) Le cas recoupe toujours MIL-026. | Reformuler sans la périphrase du sigle et sans annoncer les rubriques (ex. « Les personnes handicapées employées dans des structures protégées seraient-elles de vrais salariés ? »), ou reclasser en « précis ». Passer `benefits_requested` à `false`. |
| 024 | validé | — | — |
| 025 | validé | Cinq options pour l'offre ; la nuance sur la garantie des loyers est acceptée. | — |
| 026 | validé | Branche conditionnelle sur la fin de la mutualisation, appuyée par la seule source qui la mentionne. C'est correct. | — |
| 027 | validé | L'ambiguïté de « soins gratuits » est conservée et protégée par une erreur. | — |
| 028 | validé | La grille « production et débouchés » devient un exemple. | — |
| 029 | à corriger | Schéma ET/OU correct, et la paire m014+m015 compte pour un exemple (testé). Mais s01-ss16-m005 (« Marchés publics favorables aux entreprises… écologiques ») ne relève ni de la fiscalité ni des aides publiques : la commande publique n'entre pas dans la question reformulée. | Retirer s01-ss16-m005 des alternatives, ou étendre la question à la commande publique. |
| 030 | validé | Erreur sur la portée du testing ajoutée. | — |
| 031 | validé | L'erreur vise l'indexation des retraites sur les prix ; m002, m003, m008 et la définition de l'indexation sont des compléments. | — |
| 032 | validé | — | — |
| 033 | validé | Critère obligatoire en disjonction et groupe conditionnel : la lecture « AME des enfants » est correctement traitée. | — |
| 034 | à corriger | La contradiction est levée. Mais la branche `if_conditional_factual_answer` n'a pas de groupe de preuves conditionnel, contrairement à MIL-033 : la recherche ne sera pas mesurée pour une réponse conditionnelle chiffrée. | Ajouter des groupes `when: if_conditional_factual_answer` : crèches [s06-ss01-m001, s06-ss01-m002], logement étudiant [s06-ss09-m001], avec `minimum` 1. |
| 035 | à corriger | Le traitement du barème est correct, et l'interdiction de déduire l'effet personnel est ajoutée. Mais la branche d'illustration exige de « citer ses cinq paliers » : pour 32 000 €, seuls trois paliers servent au calcul, et ce critère pénaliserait une illustration exacte et sourcée. | « Citer les paliers utilisés et préciser qu'il s'agit du barème des revenus 2025 décrit par le lexique. » |
| 036 | validé | La justification du maintien en `not_in_corpus` est acceptée : la quantité demandée est absente, les montants isolés sont des compléments citables. | — |
| 037 | validé | Piège des 300 000 emplois ajouté. | — |
| 038 | validé | Le volet connu devient facultatif ; la branche conditionnelle précise la limite de l'annexe. | — |
| 039 | validé | Date de la loi de 2023 et date d'impression écartées ; la déduction « proposition » est admise. | — |
| 040 | validé | Catégorie `adversarial`, fond conditionnel, piège « 2027 » de l'illettrisme couvert. | — |

## 2. Réponses aux décisions de l'auteur

- **MIL-036, maintien de `not_in_corpus`** : accepté. Le raisonnement est juste : des
  montants voisins ne constituent pas une partie du solde demandé.
- **MIL-025, nuance sur la garantie des loyers** : acceptée. Interdire l'allocation au
  locataire, sans interdire un effet indirect prudent, est plus précis que ma
  formulation initiale.
- **MIL-029, cardinalité par proposition** : acceptée et vérifiée par le test
  `test_dependent_pair_counts_once_and_needs_both_passages`.
- **Seuil, condition Sources ≥ 1** : acceptée et testée.
- **Couverture et doublons conservés** : acceptés comme limite documentée de ce lot.
  Le constat reste valable : 33 sous-sections sur 80 couvertes, aucun cas sur l'Union
  européenne, l'école, le climat et la planification, l'outre-mer ou la vie politique.
  Le second lot inédit annoncé reste nécessaire avant toute conclusion générale.

## 3. Remarques sur la grille et les outils

1. `applicable_dimensions` a la même valeur dans les 40 cas
   (`sources: if_measure_or_annex_content_is_asserted`) : le champ n'apporte pas
   d'information propre à chaque cas. `score_result` accepte `sources: None` pour
   n'importe quel cas. Il serait utile d'enregistrer, dans les résultats, la raison
   pour laquelle l'évaluateur déclare la dimension non applicable (clarification,
   refus, constat d'absence), pour éviter qu'une réponse factuelle non sourcée soit
   classée « non applicable ».
2. Les tests couvrent bien les règles signalées, mais pas le contrôle des pages.
   Celui-ci est fait par le générateur et `annexes-pdf-verification.json`, et confirmé
   par cette revue.
3. Les bandeaux intercalés touchent au moins 10 extraits du corrigé. Cela confirme
   l'exigence documentée : ne pas indexer le texte du PDF sans retirer les bandeaux et
   recoller les mesures coupées entre pages.

## 4. Suite

Après correction des six cas ci-dessus (MIL-014, 020, 023, 029, 034 et 035) dans
`scripts/build_benchmark.py` et régénération, le corrigé peut être considéré comme
relu. Le benchmark peut alors être exécuté, en gardant en tête sa couverture partielle.
