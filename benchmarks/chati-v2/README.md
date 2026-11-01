# Chati v2 — 40 questions inédites

Créé le **1er novembre 2026**, version **`1.0.3-user-amended`**.
**Benchmark validé après seconde revue externe et revue finale, puis exécuté deux fois.**

Le [second run](runs/2026-11-01-repeat-01/REPORT.md) donne **40/40 validés et
40/40 complets**, contre 40/40 et 36/40 au premier passage. Les audits sont ceux
de deux modèles différents, sans validation humaine acquise. L’[atelier de
relecture](../../review/README.md) permet de contrôler quatre cas fragiles et huit
réponses initialement notées parfaites. Le [registre des exécutions](executions.json)
décrit l’état actuel. Le manifeste original est archivé dans
[reviews/1.0.2-validated](reviews/1.0.2-validated/manifest.json) ; les empreintes
des runs restent celles de cette publication. Le corrigé actuel inclut un
[arbitrage utilisateur postérieur aux runs](amendment-CH2-007.json) :
l’harmonisation concerne uniquement les élargissements, pas les accords de
libre-échange. Les questions et les citations du corpus sont inchangées.

Ce second lot suit [NEXT-BENCHMARK.md](../NEXT-BENCHMARK.md). Les 40 conversations
mobilisent **30 sous-sections de mesures** (29 cibles et une nouvelle en complément), toutes disjointes de celles mobilisées
par le corrigé de `chati-v1`, y compris ses alternatives et compléments facultatifs.
Les sujets et sources ont changé ; les familles de tâches sont conservées pour
faciliter une comparaison descriptive avec le premier lot.

## Sélection et portée

- Le corpus comporte 80 sous-sections. Les entrées `evidence` de v1 en excluent
  **39**, pas seulement celles de ses réponses principales.
- Par prudence, **s01-ss11** est également exclue : sa mesure de salariat des
  plateformes était nommée comme distracteur dans l’ancien corrigé.
- Parmi les **40** sous-sections restantes après ce filtre supplémentaire,
  **30** sont mobilisées ici, sur **7 grandes sections**.
- Les trois sous-sections de la section 8 « Immigration, droits et lutte contre
  les discriminations » sont déjà exclues. Aucun cas n’y est ajouté artificiellement.
- Le lexique est réutilisé pour des définitions ; l’annexe sur le Concordat est
  un complément contextuel facultatif à CH2-015. Ni une définition ni ce cas local
  ne remplacent la preuve de la proposition générale demandée.

Le [rapport de sélection](selection-report.json) donne les exclusions, leurs
anciens cas d’origine, les titres retenus et l’affectation des nouveaux cas.
Les mesures réutilisées entre plusieurs nouveaux cas sont visibles : ces 40 cas
ne sont pas 40 observations thématiques indépendantes.

| Catégorie | Cas | Nombre |
| --- | --- | ---: |
| Précis | CH2-001 à CH2-016 | 16 |
| Sémantiques | CH2-017 à CH2-024 | 8 |
| Transversaux, avec plusieurs nouvelles sous-sections | CH2-025 à CH2-030 | 6 |
| Conversation avec historique synthétique | CH2-031 à CH2-034 | 4 |
| Réponses partielles : proposition connue, paramètre absent | CH2-035 à CH2-039 | 5 |
| Demande de fabrication et de fausse réalisation | CH2-040 | 1 |

Nouveaux thèmes : fraude, banques, dette, collectivités, probité, laïcité, justice,
sport, rénovation, déchets, animaux, biodiversité marine, numérique et environnement,
Union européenne, diplomatie, développement, Méditerranée, fin de vie, santé des
femmes, pauvreté, enseignement professionnel, recherche et renseignement.

## Fichiers

| Fichier | Usage |
| --- | --- |
| [questions.jsonl](questions.jsonl) | **Seul fichier d’entrées à transmettre à Chati** : ID et messages |
| [references.md](references.md) | Questions, corrigé, critères, pièges et textes sources lisibles |
| [references.jsonl](references.jsonl) | Même corrigé structuré ; schéma 2.2, compatible avec les champs de base de v1 |
| [manifest.json](manifest.json) | Version, empreintes, comptages, statut de revue et d’exécution |
| [selection-report.json](selection-report.json) | Preuve de disjonction des sous-sections et exclusions conservatrices |
| [absence-checks.json](absence-checks.json) | Dossiers des cinq paramètres absents, avec recherches de contre-exemples |
| [authorship-snapshot.json](authorship-snapshot.json) | Empreintes du code applicatif et des enrichissements au moment de la création |
| [benchmark_review.md](benchmark_review.md) | Auto-revue documentaire des 40 cas et corrections appliquées |
| [benchmark_review-external.md](benchmark_review-external.md) | Première revue externe de la version 1.0.0, conservée intacte |
| [benchmark_review-external-v1.0.1.md](benchmark_review-external-v1.0.1.md) | Contre-vérification externe : 40 cas cohérents, aucun blocage |
| [benchmark_review-final.md](benchmark_review-final.md) | Validation finale et traitement des réserves facultatives |
| [review-decisions.md](review-decisions.md) | Décisions sur toutes les remarques et corrections de la version 1.0.1 |
| [review-prompt.md](review-prompt.md) | Instructions pour la relecture par un autre LLM ou un humain |
| [EVALUATION.md](EVALUATION.md) | Règles de jugement à figer avant le premier run |

Le champ `criteria` relie chaque critère à ses groupes de preuves et indique sa
nature : fait, interprétation, résolution de référence, structure de réponse,
clarification, limitation ou refus. `must_include`
conserve les mêmes textes pour les outils existants. Les groupes distinguent les
preuves toujours requises des branches conditionnelles de CH2-034 et CH2-040.
Les réponses de référence sont des exemples ; les paraphrases fidèles et les
autres preuves véritablement équivalentes sont recevables.

Les entrées, corrigé et empreintes de la version soumise à la première revue sont
archivés dans [reviews/1.0.0-self-reviewed/manifest.json](reviews/1.0.0-self-reviewed/manifest.json).
La seconde revue externe porte sur les corrections de la version 1.0.1,
également [archivée](reviews/1.0.1-external-review-applied/manifest.json).
La publication 1.0.2 conservait exactement le contenu relu. La version 1.0.3
modifie uniquement le corrigé de CH2-007 après clarification explicite de
l’utilisateur ; les 39 autres corrigés et toutes les questions sont identiques.
Cette modification ciblée n’est pas une nouvelle revue externe de tout le lot.
Les revues initiales restent des revues de modèles ; aucune relecture humaine
complète des réponses n’est revendiquée.

## Préserver le nouveau lot

Le corpus évalué reste le résumé source figé, sans web ni connaissance supposée
du droit actuel. Les alias de `enrichment.jsonl` facilitent la recherche mais ne
constituent pas le corrigé ni des sources faisant autorité.

Le snapshot d’auteur **n’est pas** la preuve de la configuration réellement
déployée. Avant l’exécution, figer image, modèle, prompts, paramètres,
enrichissement, corpus et index **avant** l’exécution. Aucun secret ni fichier
`.env` n’a été lu pour construire ce lot. Le générateur ne contacte pas l’API.

Ne pas utiliser ces questions ou leurs corrections pour ajuster l’application
avant le premier run. Si ce lot sert aux réglages, il devient un lot de
développement. Il faudra alors un autre lot pour une conclusion indépendante.
La disjonction des sous-sections ne prouve pas que le modèle n’a jamais vu le
contenu du corpus, et ne transforme pas les questions rédigées ici en échantillon
aléatoire de tous les usages possibles.

## Vérifier et régénérer

```bash
.venv/bin/python -B -m pytest tests/test_benchmark_v2.py -q
.venv/bin/python scripts/build_benchmark_v2.py
```

Le second script remplace uniquement les fichiers générés du nouveau lot ; il ne
réécrit pas `chati-v1`, l’application ni le corpus. Reporter les corrections du
relecteur dans ce script avant régénération. Le snapshot initial n’est pas écrasé.
Les documents de revue, le README et le protocole sont maintenus séparément.
Le générateur refuse désormais une modification des questions ou du corrigé
sémantique conservant le statut validé. Toute évolution du contenu nécessite une
nouvelle revue ou un arbitrage humain explicite, un numéro de version et un
nouvel ancrage sur le contenu approuvé. L’amendement CH2-007 fixe cette nouvelle
empreinte ; les autres modifications non approuvées restent refusées.
