# Première évaluation réelle de Chati

**Score : 38/40 cas validés (95.00 %).**
Réponses complètes et validées : **32/40**. Le seuil à 75/100 tolère certaines incomplétudes.

Exécution unique du 31 octobre 2026 via le service Docker réel. Modèle : `gpt-6-luna`, recherche `hybrid`, embeddings `text-embedding-3-small` ; `research=false` pour les 40 cas.

**Nature du jugement :** audit sémantique par l’agent Codex de cette session, sans relecture humaine ni second juge indépendant. Ces notes sont provisoires et leur détail est conservé. Aucun réglage de l’application n’a été modifié pendant cette évaluation.

## Mesures de recherche

37 cas comportent des groupes de preuves actifs, soit 59 groupes ; les autres ne sont pas artificiellement crédités.

| Métrique | Top 8 avant expansion | Contexte fourni |
| --- | ---: | ---: |
| Rappel macro des groupes connus | 91.89 % | 91.89 % |
| Rappel micro des groupes connus | 90.96 % | 90.96 % |
| Rappel macro après alternative sémantique admise | 92.79 % | 92.79 % |
| Précision sémantique micro, cas avec preuves actives | 30.41 % | 30.41 % |
| Précision sémantique macro, cas avec preuves actives | 30.41 % | 30.41 % |

Précision principale : 90/296 occurrences de passages jugées pertinentes. Sur tous les cas, diagnostic secondaire : 99/320 (30.94 %), incluant refus et absence de budget.

Tous les groupes connus sont couverts dans 31/37 cas ; 32/37 après acceptation du troisième exemple de MIL-029.

Pour MIL-029, les droits de douane écologiques (`s01-ss16-m008`) sont un exemple fiscal écologique recevable, absent de la liste ouverte du corrigé. La métrique brute conserve ce manque ; la métrique ajustée ajoute cette alternative dans l’audit uniquement, sans modifier le corrigé.

La précision vient de la lecture des textes, pas de leur simple appartenance à la liste d’IDs attendus. Une proximité thématique seule ne suffit pas. Ce rappel de groupes ne constitue pas un rappel exhaustif de tous les documents pertinents ; aucune F1 documentaire classique n’est revendiquée.

## Génération

| Métrique | Résultat |
| --- | ---: |
| Couverture micro des critères attendus | 89.29 % (75/84) |
| Couverture macro des critères attendus | 92.19 % |
| Couverture du sous-ensemble de critères factuels | 88.36 % (64.5/73) |
| Couverture des attentes conditionnelles activées | 90.00 % (5 critères) |
| Liens bloc–source apportant une contribution | 100.00 % (108/108) |
| Fidélité moyenne des blocs factuels | 99.00 % (49/50 entièrement étayés) |
| Conformité des fiches de mesures | 100.00 % (70 fiches) |
| Cas avec erreur critique | 1/40 |
| Note moyenne de la grille | 95.31/100 |

La couverture est évaluée sémantiquement sur les critères du benchmark (avec demi-crédit), pas par recherche de mots-clés. Le sous-ensemble factuel exclut les critères de clarification/refus/constat d’absence des cas 33–40 ; leurs faits explicitement attendus restent inclus. Il s’agit d’une approximation de « fact coverage », pas d’une annotation exhaustive de faits atomiques.

Une citation peut contribuer à une partie du bloc sans en justifier toutes les affirmations. C’est le cas du RIC dans MIL-003 : les références existent et contribuent au bloc, mais le pouvoir de révoquer des élus est ajouté sans appui. Une très bonne précision des liens ne suffit donc pas à valider une réponse. Les blocs purement négatifs ou les invitations sont exclus du dénominateur de fidélité, avec justification dans l’audit.

## Cas non validés

- **MIL-003 — 37.5/100** : Échec de génération malgré les deux preuves présentes. La fiche RIC reproduit correctement le texte, mais ne corrige pas la contradiction du bloc principal. Le vote à 16 ans est correct. Chaque citation contribue à une partie du bloc ; le bloc n’est que partiellement fidèle.
- **MIL-020 — 62.5/100** : Échec de recherche : s03-ss09-m001 (plans anti-inondations + fonds de relocalisation) absent. L’ORSEC pénurie est décrit fidèlement mais ne répond pas au débordement. Abstention limitée aux passages fournis, sans fabrication ; les trois éléments attendus manquent.

## Cas validés mais incomplets

- **MIL-001 — 87.5/100** : Les deux nombres 14 sont corrects. Ni le bloc ni les fiches ne disent explicitement que la CSG devient progressive : deuxième critère partiel. Définitions CSG/tranche pertinentes ; barème 2025 et autres impôts hors demande.
- **MIL-018 — 87.5/100** : Guichets papier, aide et intérêt expliqués. La réouverture des accueils physiques (s02-ss06-m005) n’est ni retrouvée ni évoquée. Internet gratuit est un complément prudemment présenté ; les guichets ferroviaires ne remplacent pas l’accueil des démarches administratives.
- **MIL-025 — 87.5/100** : APL +10 % absent du contexte et de la réponse. Encadrement et offre bien décrits ; la garantie est correctement distinguée d’une allocation. La séparation des trois leviers est partielle car la garantie remplace le soutien direct attendu. Accessibilité handicap et expulsions hors des leviers demandés.
- **MIL-027 — 87.5/100** : Plan général et filière psy exacts. s06-ss09-m002 absent du contexte : psychologues et soins gratuits étudiants manquent. Zéro tabac est correctement distingué de santé mentale étudiante. Autres maladies et finance de recherche ne répondent pas aux dispositifs demandés.
- **MIL-030 — 87.5/100** : Plan emploi/logement, testing et dossiers anonymes corrects. Récépissé de contrôle d’identité (s07-ss01-m004) non retrouvé et omis. Les autres discriminations générales ou médicales ne documentent ni cette traçabilité ni les dispositifs ciblés.
- **MIL-034 — 75.0/100** : Cas limite validé à 75 : « Pour le logement étudiant » circonscrit l’objet ; la réponse distingue ensuite les crèches non retrouvées et n’invente pas de tarif. Mais elle n’explicite pas vraiment l’ambiguïté nombre/prix et ne demande pas de précision. Couverture partielle du premier critère et réserve insuffisante. Seul le nombre de logements est affirmé : ne pas activer artificiellement les conditions places/prix de crèches. À revoir indépendamment.

## Par catégorie

| Catégorie | Cas validés | Note moyenne |
| --- | ---: | ---: |
| adversarial | 1/1 | 100.00/100 |
| conversation | 4/4 | 93.75/100 |
| insufficient | 5/5 | 100.00/100 |
| precise | 15/16 | 95.31/100 |
| semantic | 7/8 | 93.75/100 |
| transversal | 6/6 | 93.75/100 |

## Registre des 40 cas

Notes : exactitude / sources / limites / clarté, chacune sur 2. La décision suit la règle publiée : score ≥75, Sources ≥1 si applicable, aucune erreur critique.

| Cas | Notes | Score | Critères couverts | Rappel groupes connus | Décision |
| --- | --- | ---: | ---: | ---: | --- |
| MIL-001 | 1/2/2/2 | 87.5 | 75.00 % | 100.00 % | Validé |
| MIL-002 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-003 | 0/1/0/2 | 37.5 | 75.00 % | 100.00 % | Non validé |
| MIL-004 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-005 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-006 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-007 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-008 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-009 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-010 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-011 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-012 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-013 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-014 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-015 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-016 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-017 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-018 | 1/2/2/2 | 87.5 | 66.67 % | 50.00 % | Validé |
| MIL-019 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-020 | 0/2/2/1 | 62.5 | 0.00 % | 0.00 % | Non validé |
| MIL-021 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-022 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-023 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-024 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-025 | 1/2/2/2 | 87.5 | 62.50 % | 66.67 % | Validé |
| MIL-026 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-027 | 1/2/2/2 | 87.5 | 66.67 % | 50.00 % | Validé |
| MIL-028 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-029 | 2/2/2/2 | 100.0 | 100.00 % | 66.67 % | Validé |
| MIL-030 | 1/2/2/2 | 87.5 | 66.67 % | 66.67 % | Validé |
| MIL-031 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-032 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-033 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-034 | 1/2/1/2 | 75.0 | 75.00 % | 100.00 % | Validé |
| MIL-035 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-036 | 2/2/2/2 | 100.0 | 100.00 % | N/A | Validé |
| MIL-037 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-038 | 2/2/2/2 | 100.0 | 100.00 % | N/A | Validé |
| MIL-039 | 2/2/2/2 | 100.0 | 100.00 % | 100.00 % | Validé |
| MIL-040 | 2/2/2/2 | 100.0 | 100.00 % | N/A | Validé |

## Exécution et limites

- 40/40 réponses structurées reçues ; 0 erreur technique.
- Latence client : médiane 4.14 s ; p95 8.28 s ; maximum 14.44 s. 2 requêtes simultanées au maximum, durée murale de collecte 102.17 s.
- Tokens retournés par les générations finales : 51,756 en entrée et 18,293 en sortie. Embeddings et éventuelles tentatives internes supplémentaires non comptabilisés ; pas d’estimation monétaire.
- Ce benchmark a servi à la conception : les résultats ne mesurent pas une généralisation indépendante. Le nouveau lot de sous-sections reste à construire après les ajustements.
- Cette évaluation ne teste pas le web, l’interface visuelle ni la véracité du programme dans le monde réel.

## Fichiers et reproduction

- [Protocole](../../EVALUATION.md) ; [questions](../../questions.jsonl) ; [corrigé](../../references.jsonl).
- [Sorties brutes SSE et réponses](responses.jsonl), [empreintes et configuration](run.json), [provenance Docker](runtime-provenance.json).
- [Décisions du juge](audit-decisions.json), [audit développé](audit.jsonl), [métriques exactes](metrics.json).

Recalcul sans appel réseau, depuis la racine :

```bash
.venv/bin/python scripts/score_evaluation.py --run benchmarks/chati-v1/runs/2026-10-31-first
```

Priorités suggérées après cette mesure : mieux diversifier la recherche des questions à plusieurs volets, retrouver les inondations par leur formulation usuelle, éviter l’ajout de pouvoirs juridiques non écrits et clarifier les suivis ambigus. Conserver ce run comme baseline ; toute correction doit être suivie d’un nouveau run et d’une revue indépendante des jugements.
