# Premier run de Chati sur le benchmark v2 (1.0.1)

Run du 1er novembre 2026, une seule exécution par cas, configuration par défaut figée avant la collecte et corrigé jamais envoyé à l'application (`research=false`, `questions.jsonl` seul). Protocole : `benchmarks/chati-v2/EVALUATION.md`.

## Résultat

| Mesure | Résultat |
|---|---:|
| **Cas validés** (règle principale, exactitude ≥ 1, sans erreur critique ni fausse absence) | **40/40** |
| Règle historique de v1 (score ≥ 75, Sources ≥ 1, sans erreur critique) | 40/40 |
| **Cas entièrement complets** (tous critères et conditions à 1) | **36/40** |
| Cas non validés | aucun |
| Erreurs techniques | 0 |
| Note moyenne de la grille | 98,4/100 |
| Erreurs critiques / fausses absences | 0 / 0 |

Catégories : précis 16/16, sémantiques 8/8, transversaux 6/6, conversations 4/4, partiels 5/5, fabrication 1/1.

**Prudence sur le 40/40.** Ce lot est plus facile que la moyenne des usages : 16 cas « précis » sur 40 demandent une ou deux mesures reprenant les mots du résumé. Le score confirme que la configuration tient hors du lot de réglage, mais il ne dit rien des questions difficiles ou ambiguës, et un seul run ne mesure pas la dispersion.

## Configuration évaluée

Celle des défauts de l'application : `gpt-6-luna`, recherche hybride (`text-embedding-3-small`), enrichissement d'index et synonymes activés, **12 passages**, sans décomposition des questions ni vérification avant absence, rejet des identifiants de source dans le texte. Image Docker `sha256:28edc920ed7f6673350e3d3e47003dcf2e5e0315730962b865d21c4d1e7bfd51`, corpus `d23e70c6…`. Empreintes du code, du corpus, du benchmark et de l'état de l'application dans `run.json`. Aucune modification de l'application ou du corrigé n'a été faite pendant ou après la collecte.

## Les 4 cas validés mais incomplets

| Cas | Notes | Motif |
|---|---|---|
| CH2-007 | 1/2/2/2 | Le bloc et la fiche écrivent que le veto s'applique « lorsqu'ils se font sans harmonisation » : portée fixée aux deux objets alors que le texte ne la précise pas, ce que le piège du corrigé interdit. Faits exacts. Critère C01 à 0,5. |
| CH2-030 | 1/2/2/2 | Les formulations « au-dessus » et « au moins » sont comparées correctement et aucun montant n'est inventé, mais la compatibilité n'est pas dite et « pas exactement le même plancher » penche vers une différence. Critère C03 à 0,5. |
| CH2-031 | 2/2/2/1 | Mesure exacte (interdiction des voyages commerciaux privés), mais la réponse ne nomme pas l'espace (« ce type de voyage »). Résolution C01 à 0,5, clarté 1. |
| CH2-038 | 1/2/1/2 | Le bloc dit « traité contre l'appropriation » (exact) ; la fiche écrit « un traité international visant l'appropriation des ressources spatiales », sens ambigu voire inversé par l'omission de « contre ». « Ne précise pas quels pays l'ont signé » accepte aussi la prémisse d'une signature. Aucun signataire inventé. |

**CH2-038 est un cas limite à faire arbitrer par une personne.** Je l'ai noté sans erreur critique (le bloc principal est exact et la fiche est ambiguë plutôt que franchement inversée). Une lecture stricte de « inversion de proposition » en ferait une erreur critique et un cas non validé : le score serait alors **39/40**.

## Couverture des critères

88 critères (dénominateur par type), couverture sémantique avec demi-crédit, 86/88 :

| Type | Couverture |
|---|---:|
| Faits (67) | 99,3 % (66,5/67) |
| Interprétations (5) | 100 % |
| Structure (4) | 87,5 % |
| Résolution (3) | 83,3 % |
| Limitations (5) | 90,0 % |
| Refus (2) / clarifications (2) | 100 % |
| **Micro** (88) | **97,7 %** |
| Macro par cas | 97,7 % |

Les critères sont composites, ce ne sont pas des faits atomiques.

## Recherche

| Mesure | Résultat |
|---|---:|
| Rappel des groupes de preuves actifs dans le contexte | 100 % (69 groupes, 38 cas concernés) |
| Rappel des groupes dans les sources citées | 100 % |
| Taille du contexte | 12 passages (13 dans les cas où l'expansion d'une dépendance s'est déclenchée) |

Le contexte contient toutes les preuves attendues sur ce lot. Ce rappel ne mesure pas la précision (aucune annotation de pertinence n'a été faite), et ne dit rien d'un ensemble exhaustif de passages pertinents.

## Absences

- **Aucune fausse absence** : aucun volet demandé et présent dans le corpus n'a été déclaré absent.
- **Absences réelles, bien reconnues** : CH2-035 (économie en euros), 036 (plafond mensuel), 037 (enveloppe), 038 (pas de liste de signataires, mais voir le défaut ci-dessus), 039 (nombre de jours). Aucune valeur importée du droit actuel ou inventée.
- CH2-034 (suivi ambigu) : pas de clarification demandée, mais séparation explicite des deux branches (HCERES / ANR), toutes deux sourcées, sans attribution arbitraire : admis par le corrigé.
- CH2-040 : refus de la fausse réalisation, du gain de 1 200 € et de la citation fabriquée ; la citation du bloc `quote` est la vraie mesure.

## Résultats par sous-section

Plusieurs cas réutilisent les mêmes preuves : ces regroupements complètent le total sans en faire des observations indépendantes. Les 4 cas utilisant la mesure des 700 000 logements (005, 025, 035, 040) sont validés. Les cas incomplets touchent quatre sous-sections : `s04-ss01` (Union européenne, CH2-007), `s01-ss15` (jeunesse, CH2-030), `s01-ss19` (espace, CH2-031 et 038) et `s05-ss07` (pauvreté, CH2-030). Détail dans `metrics.json`.

## Exploitation

- 40/40 réponses reçues, aucune erreur technique, aucune relance externe.
- Latence client : médiane 3,65 s, p95 7,25 s, maximum 11,9 s (2 requêtes simultanées).
- Tokens retournés par les générations finales : 69 843 en entrée (1 746 par question), 16 396 en sortie (410 par question, dont 7 061 de raisonnement). Les embeddings et les tentatives internes éventuelles ne sont pas comptabilisés ; pas d'estimation de coût.
- Aucun identifiant de source dans le texte des blocs.

## Limites

- **Un seul run**, sans mesure de dispersion. Le protocole recommande au moins trois runs pour comparer des versions ; trois runs de plus permettraient de dire si CH2-007, 030, 031 et 038 sont stables.
- **Juge unique et non indépendant.** J'ai évalué les 40 réponses : je suis le même assistant que celui qui a conçu l'enrichissement, les synonymes et les réglages évalués, et qui a relu ce benchmark. Aucune personne n'a confirmé les jugements. Les raisons de chaque dimension sont dans `audit-decisions.json` avec un extrait de la réponse pour chacun des 88 critères.
- **Fidélité et citations** : les citations ont été vérifiées contre les groupes du corrigé, mais aucun taux de fidélité lien par lien n'est publié (le protocole l'interdit sans annotation propre à chaque lien).
- **Ne pas régler l'application sur ces résultats.** Si les défauts de CH2-007, 030, 031 et 038 conduisent à des modifications, ce lot devient un lot de développement et une évaluation indépendante demandera un nouveau lot.
- Le benchmark ne mesure pas le web, l'interface, ni la véracité du programme.

## Fichiers

- Réponses brutes : `responses.jsonl` ; configuration et empreintes : `run.json`
- Jugements : `audit-decisions.json` ; métriques : `metrics.json`
- Recalcul : `PYTHONPATH=scripts .venv/bin/python scripts/score_judged_run.py --run benchmarks/chati-v2/runs/2026-11-01-default --benchmark benchmarks/chati-v2`
