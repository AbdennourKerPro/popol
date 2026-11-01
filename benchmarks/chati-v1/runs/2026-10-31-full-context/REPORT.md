# Évaluation de Chati avec tout le corpus dans le contexte

Run du 31 octobre 2026, mêmes 40 questions, même protocole de collecte que `2026-10-31-first` (une tentative par cas, 2 requêtes simultanées, `research=false`, corrigé jamais envoyé). Seule différence côté application : `CONTEXT_MODE=full`. Le modèle reste `gpt-6-luna`.

**Résultat : 39/40 cas validés** (premier run : 38/40 selon Codex, 34/40 selon ma contre-expertise). Réponses complètes et validées : **35/40** (premier run : 32/40). Seul MIL-003 échoue, pour la même erreur que la première fois.

## Comparaison

| | Premier run (8 passages) | Corpus complet |
|---|---:|---:|
| Cas validés, règle publiée | 38/40 (Codex) | **39/40** |
| Cas validés, règle stricte (exactitude ≥ 1 et pas de fausse absence) | 34/40 | **39/40** |
| Réponses complètes et validées | 32/40 | **35/40** |
| Couverture des critères attendus | 89,3 % (75/84) | **97,0 % (81,5/84)** |
| Fausses absences (élément demandé présent dans le corpus, déclaré absent) | 5 (MIL-020, 025, 027, 030, 034) | **0** |
| Cas avec erreur critique | 1 (MIL-003) | 1 (MIL-003) |
| Note moyenne de la grille | 95,3 | 96,6 |
| Erreurs techniques | 0 | 0 |
| Latence médiane / p95 / max | 4,1 s / 8,3 s / 14,4 s | 4,5 s / 9,7 s / 20,0 s |

Les six cas dont la recherche était la cause (MIL-018, 020, 025, 027, 030, 034) retrouvent tous la mesure manquante : accueils physiques, plans anti-inondations et fonds de relocalisation, APL +10 %, psychologues étudiants, récépissé de contrôle d'identité. MIL-034 reste à 75/100 : la réponse donne les deux objets sourcés, mais ne signale pas l'ambiguïté.

## Ce qui reste imparfait

- **MIL-003 (non validé).** La réponse dit encore que le RIC permettrait « de révoquer des élus ». La source dit « révoquer, proposer ou abroger des lois ». C'est un défaut de rédaction, indépendant de la recherche : il apparaît aux deux runs, et la fiche est correcte alors que le bloc principal la contredit.
- **MIL-001, MIL-005.** Détails omis dans la lecture stricte : progressivité de la CSG, reconversion.
- **MIL-017 (nouveau).** Le texte contient des marqueurs bruts « [s01-ss08-m007] [a01-ss01-b041] ». La validation interdit `[1]` et les URL, mais pas `[id]`.
- **MIL-040 (régression).** La réponse refuse bien de fabriquer, mais ne dit plus explicitement que `s99-ss99-m999` n'existe pas ; le premier run le disait.
- **MIL-034.** Toujours à 75/100 (ambiguïté non signalée).

Avec un seul run, je ne peux pas dire si MIL-017 et MIL-040 sont du bruit de génération ou un effet du long contexte.

## Coût

Tokens retournés par l'API sur les 40 cas :

| | Premier run | Corpus complet |
|---|---:|---:|
| Entrée totale | 51 756 | 896 204 |
| dont relus depuis le cache | 0 | 871 908 (97 %) |
| dont écrits dans le cache | 51 636 | 22 380 (1 écriture) |
| dont facturés sans cache | 120 | 1 916 |
| Sortie (dont raisonnement) | 18 293 (7 472) | 16 623 (7 720) |

Ce que j'ai fait pour limiter le surcoût :

1. **Format compact du corpus** : titres de section et de sous-section écrits une fois par groupe, sans JSON ni champs répétés. 77 700 caractères au lieu de 194 600 (−60 %), soit environ 22 400 tokens par requête.
2. **Cache de préfixe explicite** : le corpus est placé en tête, suivi d'un seul point de coupure (`prompt_cache_breakpoint`) avec `prompt_cache_options.mode = explicit`. Seul le préfixe stable est écrit puis relu ; la conversation est facturée normalement. Avec le cache implicite par défaut, une question différente ne réutilisait rien : 22 000 tokens étaient réécrits à chaque requête, alors qu'ici 97 % sont relus. J'ai vérifié les deux comportements par des appels réels.
3. **Plus d'appel d'embedding ni de recherche** par question en mode complet.
4. Sortie inchangée (`max_output_tokens` et schéma identiques). Les tokens de sortie sont même un peu plus bas (16 623 contre 18 293).

**Le coût réel n'est pas calculé** : je n'ai pas le tarif de `gpt-6-luna`, et le protocole interdit d'inventer un prix. Il dépend de deux ratios : le prix d'un token relu depuis le cache et celui d'un token écrit, relatifs au prix d'un token d'entrée normal. En ordre de grandeur, l'entrée passe de 1 300 tokens par question à 22 400. Si les tokens relus coûtent 10 % d'un token normal et les écrits 100 %, l'entrée coûte environ 2,2 fois le premier run ; à 25 %, environ 4,7 fois.

**Point d'attention.** Le cache a une durée de vie minimale de 30 minutes. Pour un outil peu utilisé, la plupart des questions arriveraient à froid et paieraient les 22 400 tokens en écriture, soit environ 17 fois l'entrée du premier run. Le gain du cache n'existe que si le trafic est régulier (le point de coupure accepte aussi une durée de 12 h, que je n'ai pas activée faute de connaître son tarif).

## Limites de cette évaluation

- **Le juge change.** Le premier audit est de Codex, celui-ci est de moi (Sonnet 5.5), avec le même assistant que celui qui a implémenté le mode. Les 40 cas ont été lus avec le corrigé en main, un justificatif par cas est dans `audit-decisions.json`, mais aucun humain n'a relu. Comparer 38 et 39 serait trompeur ; c'est surtout la différence de fausses absences (5 contre 0) qui est solide, car elle se vérifie dans les textes.
- **Un seul run, un seul lot.** La génération est stochastique. Les 40 cas ont servi à concevoir l'outil : ce résultat ne dit rien de la généralisation, qui attend le lot inédit de `NEXT-BENCHMARK.md`.
- **Cache déjà chaud.** Quelques appels de test avaient préparé le cache avant le run ; un seul cas (MIL-029) a payé l'écriture. Le total d'écritures (22 380) correspond donc à une seule écriture, pas à un démarrage à froid.
- **Retrieval non mesuré.** Rappel et précision ne s'appliquent pas sans recherche, et le champ `context_ids` est vide dans les réponses de ce mode.

## Fichiers

- Sorties brutes : [responses.jsonl](responses.jsonl), configuration et empreintes : [run.json](run.json)
- Jugements par cas : [audit-decisions.json](audit-decisions.json) ; métriques : [metrics.json](metrics.json)
- Recalcul : `PYTHONPATH=scripts .venv/bin/python scripts/score_judged_run.py --run benchmarks/chati-v1/runs/2026-10-31-full-context`
- Code : `Corpus.full_context` ([corpus.py](../../../../backend/chati/corpus.py)), `generate_full` ([generation.py](../../../../backend/chati/generation.py)), branchement dans [main.py](../../../../backend/chati/main.py).
