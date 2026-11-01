# Amélioration de la recherche : enrichissement, synonymes, décomposition, plafond

Évaluation du 31 octobre 2026 des quatre pistes retenues (données 1 et 2, conception 5 et 6), d'abord sur la recherche seule, puis de bout en bout sur les 40 cas. Mêmes questions et même protocole que `2026-10-31-first`.

## Ce qui a été implémenté

| Piste | Mise en œuvre | Variable |
|---|---|---|
| Enrichissement de l'index | `data/structured/enrichment.jsonl` : une ligne « autres formulations » par passage (966), générée par `scripts/enrich_index.py` sans voir le benchmark. Elle sert à l'index lexical et sémantique uniquement : jamais affichée, citée, ni envoyée au générateur. Le corpus, ses empreintes et le benchmark sont inchangés. | `INDEX_ENRICHMENT` (défaut `true`) |
| Synonymes | `backend/chati/synonyms.py` : 30 groupes écrits à la main, ajoutés à la requête lexicale. | `SYNONYMS` (défaut `true`) |
| Décomposition des questions | `backend/chati/queries.py` : un appel au modèle produit 1 à 3 sous-requêtes autonomes ; les rangs des requêtes sont entrelacés pour que chaque volet ait des places. Résout aussi les « et pour… ? ». | `QUERY_PLANNING` (défaut `false`) |
| Diversification | `Retriever.select` : plafond de passages par sous-section, souple, avec option de garder les N premiers intacts. | `RETRIEVAL_PER_SUBSECTION` (défaut `0` = désactivé) |

L'index doit être recréé après activation de l'enrichissement : `docker compose run --rm app python -m chati.index`. L'ancien index n'est plus chargé (message d'index incompatible). J'ai recréé celui du volume et conservé l'ancien dans `index-plain`. Le service tourne maintenant avec ces défauts.

Contrôle de l'enrichissement : un seul alias contient un nombre absent du passage (« 49.3 », cité dans le sujet), moyenne de 87 caractères. J'ai relu un échantillon et les passages des cas ratés ; aucun humain n'a relu les 966.

## Recherche seule (`scripts/eval_retrieval.py`)

Rappel des groupes de preuves inconditionnels du corrigé dans les 8 passages, sur les 35 cas qui en ont (57 groupes). Même métrique pour toutes les lignes.

| Configuration | Rappel micro | Cas entièrement couverts | Sous-sections distinctes (moy.) |
|---|---:|---:|---:|
| Base (état avant) | 0,906 | 29/35 | 3,97 |
| Enrichissement seul | 0,912 | 30/35 | 4,20 |
| Synonymes seuls | 0,959 | 32/35 | 3,77 |
| Décomposition seule | 0,959 à 0,982 (2 tirages) | 32 à 34/35 | 3,8 à 4,1 |
| Enrichi + synonymes | 0,965 | 33/35 | 3,97 |
| Enrichi + décomposition | 0,965 | 33/35 | 4,37 |
| Enrichi + synonymes + décomposition | 0,965 | 33/35 | 4,22 |
| Plafond 4 seul | 0,854 | 26/35 | 5,03 |
| Plafond 2, 5 premiers intacts, seul | 0,819 | 24/35 | 5,17 |
| Enrichi + synonymes + plafond 4 | 0,965 | 33/35 | 4,97 |

Lecture :

- **La décomposition et les synonymes apportent l'essentiel du gain** (+5 points de rappel). L'enrichissement apporte peu seul (+0,6 point).
- **Le plafond par sous-section dégrade le rappel** (−5 à −9 points seul). Les preuves attendues se trouvent souvent au fond d'une sous-section dense (retraites, ONU, EHPAD) ; les évincer pour diversifier coûte plus qu'elles ne rapportent. Combiné à la décomposition il est neutre : l'entrelacement des sous-requêtes fournit déjà la diversité. Je le laisse désactivé.
- **Le bruit est de l'ordre d'un groupe sur 57** : la décomposition seule donne 0,959 et 0,982 sur deux tirages du planificateur. Les écarts de 0,965 entre les meilleures lignes ne permettent pas de les départager.
- **Biais à connaître : j'ai écrit les synonymes en connaissant les cas ratés** (APL, inondation, récépissé, ESAT, AESH…). Leur gain sur ce lot est donc optimiste. La décomposition et l'enrichissement n'ont pas eu cette connaissance.

## Bout en bout (40 cas, génération réelle)

| | Base (Codex / ma lecture) | Enrichi + synonymes | + décomposition | Corpus complet |
|---|---:|---:|---:|---:|
| Validés, règle publiée | 38 / — | 39 | **40** | 39 |
| Validés, règle stricte (exactitude ≥ 1, sans fausse absence) | 34 | 38 | 38 | **39** |
| Réponses complètes et validées | 32 | 33 | **37** | 35 |
| Couverture des critères | 89,3 % | 94,0 % | **97,0 %** | **97,0 %** |
| Fausses absences | 5 | 1 (MIL-034) | 2 (MIL-025, 034) | **0** |
| Rappel des groupes dans le contexte | 0,906 | 0,965 | 0,965 | sans objet |
| Erreur critique | MIL-003 | MIL-003 | aucune | MIL-003 |
| Latence médiane / p95 | 4,1 / 8,3 s | 4,9 / 12,6 s | 7,1 / 11,5 s | 4,5 / 9,7 s |

Passages : tous les groupes sont retrouvés dans 33 cas sur 35 avec les deux configurations, contre 29 avant.

Ce que cela dit, avec prudence :

- **Les six ratés de recherche du premier run sont réparés en grande partie.** Il reste des fausses absences : MIL-034 (500 000 places en crèche non retrouvées, dans les deux configurations) et MIL-025 avec la décomposition (APL non retrouvées, alors que la requête simple les trouvait). Le corpus complet n'en a aucune.
- **La différence entre les deux configurations de recherche n'est pas démontrée.** Le rappel est identique (33/35). Les écarts de score viennent de la génération, qui est stochastique : MIL-003 réussit avec la décomposition et échoue sans, alors que les deux preuves sont retrouvées dans les deux cas ; trois réponses sans décomposition (MIL-017, 021, 035) contiennent des identifiants bruts dans leur texte, aucune avec. Ce n'est pas un effet de la recherche.
- **Un seul run par configuration, jugé par moi** (Sonnet 5.5, qui a aussi implémenté les changements), sans relecture humaine. Les jugements sont dans `audit-decisions.json` de chaque run. Les 40 cas sont ceux qui ont servi à régler l'outil.

## Passage de 8 à 12 passages (sans décomposition)

Réglage `RETRIEVAL_COUNT` (défaut passé à 12). Choix du nombre sur la recherche seule, avec enrichissement et synonymes :

| Passages | Rappel micro | Cas entièrement couverts | Sous-sections distinctes |
|---:|---:|---:|---:|
| 8 | 0,965 | 33/35 | 3,97 |
| **12** | **0,982** | **34/35** | 6,11 |
| 16 | 0,982 | 34/35 | 8,02 |
| 20 | 0,982 | 34/35 | 10,2 |

Le rappel plafonne à 12 : 16 et 20 ajoutent seulement des passages parasites pour le générateur. Sans enrichissement ni synonymes, il faudrait 20 passages pour atteindre 0,965, ce qui montre que les deux améliorations de l'index se cumulent avec le nombre de passages. Les 12 passages ajoutent environ 25 % de tokens d'entrée (62 827 contre 52 264 sur les 40 cas, soit +10 500, hors cache).

Run de bout en bout `2026-11-01-enriched-syn-12` (enrichissement, synonymes, 12 passages, pas de décomposition) :

| | 8 passages | **12 passages** | Corpus complet |
|---|---:|---:|---:|
| Validés, règle publiée | 39 | 39 | 39 |
| Validés, règle stricte | 38 | 38 | **39** |
| Réponses complètes et validées | 33 | **37** | 35 |
| Couverture des critères | 94,0 % | **97,6 %** | 97,0 % |
| Fausses absences | 1 (MIL-034) | 1 (MIL-034) | **0** |
| Rappel des groupes dans le contexte | 0,965 | **0,982** | sans objet |
| Latence médiane / p95 | 4,9 / 12,6 s | **4,7 / 11,2 s** | 4,5 / 9,7 s |

- **Le gain est réel mais plus petit que le rappel ne le laissait penser** : les cas complets passent de 33 à 37 et la couverture de 94,0 à 97,6 %, mais les cas validés ne bougent pas.
- **Les APL (MIL-025) sont retrouvées** et MIL-025 n'est plus une fausse absence. MIL-018 reste le seul groupe manquant dans les cas sans fausse absence (`s02-ss06-m005`, accueils physiques), sans fausse affirmation.
- **MIL-034 reste une fausse absence.** Les 500 000 places en crèche (`s06-ss01-m001`) ne sont toujours pas retrouvées, même à 12 passages, et la réponse dit que le résumé « ne précise pas de nombre de places ». C'est le seul cas pour lequel le corpus complet reste meilleur.
- **MIL-003 échoue toujours** (« révoquer des responsables », reformulation de la même erreur), ce qui fait quatre runs sur cinq. La recherche n'y est pour rien : les deux preuves sont retrouvées. Il faut agir sur la génération.
- **Un défaut de présentation augmente : 4 réponses (MIL-009, 021, 026, 035) contiennent des identifiants de source bruts dans leur texte** (contre 3 au run à 8 passages, 1 avec le corpus complet, 0 avec la décomposition et au premier run). Il coûte 1 point de clarté à chacune. C'est le point le plus simple à corriger : rejeter à la validation tout bloc dont le texte contient un identifiant du corpus (sans bloquer les identifiants inconnus que l'utilisateur cite, comme `s99-ss99-m999`).
- Même limites que plus haut : un run, jugé par moi, sur les 40 cas qui ont servi au réglage.

## Identifiants dans le texte et vérification avant d'affirmer une absence

Deux changements, évalués séparément sur les 40 cas (12 passages, enrichissement, synonymes) :

- **Identifiants bruts** : `validate_answer` rejette tout bloc dont le texte contient un identifiant de source (hors identifiants écrits par l'utilisateur, comme `s99-ss99-m999`) et relance la génération une fois ; la consigne le rappelle aussi.
- **Vérification avant absence** (`VERIFY_ABSENCE`, `backend/chati/verification.py`) : le générateur liste dans `not_found` les aspects demandés qu'il ne trouve pas, chacun comme une requête. Une recherche complémentaire ajoute jusqu'à 4 passages nouveaux par aspect, puis la réponse est régénérée avec ces passages. Si la régénération échoue, la première réponse est conservée.

| | 12 passages (avant) | + correction des identifiants | + vérification avant absence | Corpus complet |
|---|---:|---:|---:|---:|
| Validés, règle publiée | 39 | 40 | 40 | 39 |
| Validés, règle stricte | 38 | 39 | **40** | 39 |
| Réponses complètes et validées | 37 | 35 | 36 | 35 |
| Couverture des critères | 97,6 % | 95,8 % | 96,4 % | 97,0 % |
| Fausses absences | 1 | 1 (MIL-034) | **0** | **0** |
| Réponses avec identifiant dans le texte | 4 | **0** | **0** | 1 |
| Erreur critique | MIL-003 | aucune | aucune | MIL-003 |
| Tokens d'entrée / sortie (40 cas) | 62 827 / 18 860 | 70 643 / 20 745 | 90 819 / 28 161 | 896 204 / 16 623 |
| Latence médiane / p95 | 4,7 / 11,2 s | 5,8 / 10,7 s | 5,8 / 19,9 s | 4,5 / 9,7 s |

Lecture :

- **La correction des identifiants fonctionne** : 4 réponses touchées avant, 0 après dans les deux runs.
- **Les scores des runs ne se comparent pas à ±2 cas.** MIL-003, qui échouait à presque tous les runs, réussit dans les deux derniers sans autre changement que du bruit de génération ; la baisse de « réponses complètes » (37 → 35) vient d'omissions de détail (progressivité de la CSG, démantèlement, accueils physiques), pas des changements.
- **La vérification s'est déclenchée sur 9 cas, tous régénérés** : MIL-022, 023, 034, 035, 036, 037, 038, 039, 040. Huit sont des cas où l'absence est réelle (barème sans seuils, coût total, étude, programme RN, date, identifiant inventé) et la régénération n'a rien changé au fond. Le seul cas utile est MIL-034, et même là ce n'est pas une vraie réparation : le modèle a formulé l'aspect manquant comme « montant budgétaire exact de la gratuité des crèches », la recherche n'a pas rapporté les 500 000 places, et la réponse est devenue vraie mais toujours incomplète (« ne donne pas son coût budgétaire exact »).
- **Le coût est net** : +28 % de tokens d'entrée, +36 % de tokens de sortie, et un p95 de latence qui double (10,7 → 19,9 s, jusqu'à 35 s), pour une amélioration observée sur un seul cas.
- **Le champ `not_found` coûte aussi sans vérification** : environ +10 % de tokens de sortie et +200 tokens d'entrée par question.

Décision : `VERIFY_ABSENCE` est désactivé par défaut. La correction des identifiants reste active.

## Coût

| | Base | Enrichi + synonymes | + décomposition |
|---|---:|---:|---:|
| Entrée génération (40 cas) | 51 756 | 52 264 | 52 090 |
| Sortie génération | 18 293 | 16 894 | 19 311 |
| Appel de décomposition (40) | — | — | 10 156 entrée / 5 483 sortie |
| Embeddings par question | 1 | 1 | 1 appel pour 2 à 4 requêtes |

L'enrichissement et les synonymes ne coûtent rien à l'exécution. La décomposition ajoute environ 20 % de tokens d'entrée et 28 % de tokens de sortie, et environ 2 à 3 secondes de latence médiane (4,9 s → 7,1 s), pour un gain non démontré. Le corpus complet reste le plus fiable sur les fausses absences, mais à environ 17 fois plus de tokens d'entrée par question (voir `2026-10-31-full-context/REPORT.md`).

## Recommandation

1. **Garder en production l'enrichissement, les synonymes et 12 passages** (rappel 0,906 → 0,982 ; +25 % de tokens d'entrée pour le passage à 12).
2. **Laisser la décomposition désactivée** tant qu'un lot inédit n'a pas montré un gain : même rappel, +2 à 3 s, plus de tokens, et une nouvelle fausse absence (MIL-025).
3. **Abandonner le plafond par sous-section** tel quel. Une vraie diversification devrait rester conditionnelle (par exemple, uniquement quand une requête décomposée n'a rien trouvé dans un volet), ce que je n'ai pas essayé.
4. **Prochaines pistes, dans l'ordre :** rejeter à la validation les réponses dont le texte contient un identifiant de source (4 réponses touchées), vérifier avant d'affirmer une absence (MIL-034, seule fausse absence restante), et une consigne ou un contrôle contre les attributions non écrites (MIL-003).
5. **Mesurer sur un lot inédit** avant de conclure : les synonymes et tous les réglages ont été faits à partir de ces 40 cas.

## Fichiers

- Runs : `2026-10-31-enriched-syn/` et `2026-10-31-enriched-syn-plan/` (réponses brutes, jugements, `metrics.json` via `scripts/score_judged_run.py`)
- Recherche seule : `retrieval-ablation/ablation.json` et `ablation.log` (relance : `docker compose run --rm -T -v $PWD/scripts:/s:ro -v $PWD/benchmarks:/b:ro app python /s/eval_retrieval.py`)
- Code : `backend/chati/{corpus,retrieval,synonyms,queries,main,index,config}.py`, `scripts/{enrich_index,eval_retrieval,score_judged_run}.py` ; 64 tests passent.
