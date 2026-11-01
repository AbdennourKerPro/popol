# Deuxième run de Chati v2 — stabilité des cas incomplets

1er novembre 2026. **Les 40 conversations ont été relancées une fois chacune**,
avec la configuration du run `2026-11-01-default`, deux requêtes simultanées et
`research=false`. Les 40 réponses sont reçues, sans erreur technique ni relance
externe d’un cas. Le corrigé n’a pas été envoyé à l’application.

Les 40 réponses ont reçu un nouvel audit sémantique explicite de Codex, conservé
séparément de celui de Claude. **40/40 sont validées, dont 39/40 entièrement
complètes**, contre 40/40 et 36/40 au premier run. Aucune erreur critique ni
fausse absence n’est retenue. Ces notes machine restent à contrôler humainement.

La couverture des critères atteint **87,5/88 (99,43 %)** ; celle des critères
factuels **66,5/67 (99,25 %)**. Le rappel des groupes de preuves obligatoires dans
le contexte est de **100 %**, sur les 38 cas ayant un groupe obligatoire.
Ces résultats ne mesurent pas à eux seuls la fidélité de chaque affirmation à
chaque citation. Le score moyen de grille est de 99,6875/100.

## Résultat ciblé

| Cas | Premier run, critères | Second run, critères | Lecture de la stabilité |
| --- | --- | --- | --- |
| CH2-007 | 0,5 / 1 | 0,5 / 1 | Fragilité grammaticale encore possible ; demi-crédit conservateur. |
| CH2-030 | 1 / 1 / 0,5 | 1 / 1 / 1 | La possibilité d’un même montant est maintenant explicite. |
| CH2-031 | 0,5 / 1 | 1 / 1 | La fiche nomme maintenant « dans l’espace ». |
| CH2-038 | 1 / 0,5 | 1 / 1 | « Contre » est conservé dans la fiche ; signature au conditionnel. |

Sur ce périmètre : **4/4 restent validés**, et **3/4 sont entièrement complets**,
contre 0/4 au premier run. CH2-007 a 87,5/100 ; les trois autres ont 100/100 dans
cet audit ciblé. Aucune erreur critique n’est retenue sur ces quatre réponses.

Pour CH2-007, le premier run écrit « lorsqu’ils se font sans harmonisation »,
qui applique explicitement la condition aux deux objets. Le second écrit
« les accords de libre-échange et les élargissements qui se feraient sans
harmonisation ». C’est plus proche du libellé de la source, et la portée de la
relative reste discutable. Le demi-crédit est une annotation prudente ; on ne
peut pas conclure à une répétition certaine du même défaut. Le relecteur humain
peut confirmer ou contester cette lecture dans l’atelier.

CH2-031 est jugé sur toute la réponse, **fiches comprises** : le référent est
encore implicite dans le bloc, mais explicite dans la fiche. Pour CH2-038, le
conditionnel « l’auraient signé » ne présente pas une signature comme établie ;
le corrigé n’impose pas une formule verbale particulière pour exprimer la limite.

## Arbitrage de CH2-038, premier run

**Décision : validé mais incomplet, 75/100, sans erreur critique certaine.**

La source dit « Traité contre l’appropriation des ressources spatiales ». Le
bloc principal la reprend correctement. La fiche écrit « un traité international
visant l’appropriation des ressources spatiales » : elle perd le mot « contre »
et devient ambiguë. « Visant » peut désigner le sujet ciblé plutôt qu’un but
favorable ; cette formulation, replacée avec le bloc explicite, ne suffit pas à
prouver une inversion affirmative. La phrase « quels pays l’ont signé » demeure
insuffisamment prudente, sans inventer de pays. Les notes 1/2/1/2 et les
couvertures 1/0,5 du premier audit sont donc maintenues.

Une approbation explicite de l’appropriation ou des signataires fabriqués ferait
échouer le cas. Le second run ne contient plus la fiche ambiguë et utilise le
conditionnel. Cet arbitrage est celui de Codex, pas une validation humaine.
La décision, ses extraits et le motif sont conservés dans
[arbitration-CH2-038.json](../../human-review/2026-11-01-session/arbitration-CH2-038.json).
Le premier audit, ses métriques et les réponses brutes ne sont pas modifiés.

## Comparabilité et limites

- Les états `/api/status` et toutes les empreintes enregistrées dans `run.json`
  correspondent au premier run : modèle, prompts, corpus, benchmark et réglages.
- Même image OCI : `sha256:28edc920ed7f6673350e3d3e47003dcf2e5e0315730962b865d21c4d1e7bfd51`.
  L’identifiant image porté par le conteneur est différent du digest de manifeste
  OCI ; le code effectif a été vérifié dans le conteneur et correspond aux SHA
  du premier run. Cette différence d’identifiants n’est pas un changement d’image.
- L’empreinte de l’index et de l’enrichissement effectifs est archivée dans
  `runtime-provenance.json`. Le premier run n’avait pas archivé l’empreinte de
  l’index : son identité binaire passée ne peut pas être démontrée rétrospectivement.
- L’audit initial est de Claude ; le nouvel audit complet et l’arbitrage sont de
  Codex. Les différences de tirage et de juge ne sont donc pas expérimentalement
  isolées. Deux runs ne donnent pas une estimation fiable de fréquence d’échec.
- Aucun réglage du produit n’a été fait à partir de ces cas dans cette tâche.
  L’atelier est un service séparé et ne transmet aucune donnée à un modèle.
- Lors de la vérification finale, le conteneur principal n’était plus présent.
  Il a été recréé avec la même image existante, sans reconstruction ni nouveau
  run ; son index est prêt et son état public correspond à la configuration
  évaluée. La cause de la disparition n’a pas été établie.

## Relecture personnelle

L’atelier local est accessible à **http://localhost:8081**. Il présente les quatre
cas ciblés et huit réponses du premier run notées parfaites, sélectionnées par
une méthode déterministe stratifiée publiée. Les deux réponses, leurs fiches,
les sources citées, le contexte retrouvé et le corpus complet sont disponibles.
Corrigé et analyse machine sont masqués au départ. Les notes humaines partent
vierges et restent séparées des audits.

Documentation : [guide de l’atelier](../../../../review/README.md).

## Fichiers

- `responses.jsonl` : les 40 réponses et événements SSE, sans modification.
- `run.json` : paramètres, empreintes et temps de collecte.
- `runtime-provenance.json` : image, code et données effectifs.
- `audit-decisions.json` : jugements explicites sur les 40 réponses, extraits
  vérifiés et raisons par critère et dimension.
- `metrics.json` : métriques globales et décisions par cas du second run.
- `audit-focused.json` : jugements explicites de Codex sur les quatre cas.
- `focused-metrics.json` : comparaison ciblée uniquement ; le bilan global se
  trouve dans `metrics.json`.
- [selection.json](../../human-review/2026-11-01-session/selection.json) : sélection
  du contrôle humain, indépendante du second run.

Les calculs et le paquet se reproduisent hors ligne, sans relancer Chati :

```bash
.venv/bin/python scripts/audit_v2_repeat.py
PYTHONPATH=scripts .venv/bin/python scripts/score_judged_run.py --run benchmarks/chati-v2/runs/2026-11-01-repeat-01 --benchmark benchmarks/chati-v2
.venv/bin/python scripts/prepare_human_review.py
```

Le premier script matérialise les annotations explicites de cette session ; il
ne constitue pas une nouvelle évaluation indépendante par un autre juge.
