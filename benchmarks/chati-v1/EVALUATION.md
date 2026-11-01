# Protocole de première évaluation

Version 1 du 31 octobre 2026. Le cadre de collecte a été défini avant l’exécution,
et la règle de réussite provient de la grille déjà validée. Les précisions
d’annotation indiquées plus bas ont été documentées après lecture des sorties. Le terme
« passage validé » désigne ici **un cas question/réponse du benchmark**, pour un
dénominateur de 40. Les passages documentaires sont évalués séparément.

## Collecte et séparation du corrigé

Le runner `scripts/evaluate_benchmark.py` envoie les 40 conversations de
`questions.jsonl` à l’API réelle `/api/chat`, avec `research=false`. Il ne transmet
ni corrigé, ni critères, ni IDs attendus. Les historiques synthétiques sont
conservés. Le modèle, l’index, les prompts et le corpus ne sont pas ajustés pendant
la collecte. Deux requêtes au maximum sont exécutées simultanément.

Chaque cas n’a qu’une tentative de bout en bout. La réparation et les retries
déjà internes à l’application restent ceux du produit. Une erreur, un timeout ou
une sortie absente compte comme cas non validé : pas de sélection de la meilleure
réponse ni de relance masquée. Le journal est enregistré après chaque cas ; une
reprise saute les cas déjà enregistrés, y compris ceux en erreur.

Les sorties SSE brutes, réponses structurées, sources citées, IDs retrouvés avant
et après expansion, usages retournés et latences sont archivés. `run.json`
contient l’état de l’application, les dates et les SHA-256 des données et du code
backend. Le runner n’a pas besoin de lire la clé API ni le fichier `.env`.

## Audit sémantique

Un évaluateur lit la réponse complète (blocs **et** fiches de mesures), le corrigé
et les textes des sources. Pour ce premier rapport, cet évaluateur est **l’agent
Codex de cette session**, pas un humain ni un second juge indépendant. Les jugements
sont explicites et révisables, conservés dans `audit.jsonl` avec leurs raisons.
Une seconde revue indépendante devra les confirmer avant toute conclusion forte.

Les groupes `always` sont actifs. Les groupes conditionnels ne sont activés
qu’après lecture de la branche effectivement choisie. Les compléments facultatifs
ne deviennent pas des exigences. Une autre mesure réellement pertinente est
acceptée même si elle ne figure pas dans les exemples du corrigé. Une clarification,
un refus ou un constat d’absence sans affirmation de fond peut avoir Sources
non applicable ; le motif et la justification sont obligatoires.

Pour chaque cas, l’audit consigne :

- Les quatre notes 0–2 de la grille existante et les erreurs critiques éventuelles.
- La couverture de chacun des critères `must_include` : 1 complet, 0,5 partiel,
  0 absent/incorrect ; ce sont des **critères**, pas une segmentation exhaustive
  en faits atomiques. Les conditions activées sont aussi évaluées séparément.
- La pertinence de chaque passage du contexte (pertinent pour répondre, définir
  ou justifier une limite ; simple proximité thématique insuffisante).
- Pour chaque bloc, les citations contribuant réellement au contenu et le degré
  de soutien de l’ensemble des affirmations factuelles par leurs sources citées.
- La conformité des explications et avantages des fiches de mesures.

## Métriques

Les résultats indiquent systématiquement leur dénominateur. Une métrique sans
élément évaluable est `null`, pas artificiellement égale à 100 %.

**Recherche :**

- Couverture/rappel des groupes de preuves : moyenne de `group_coverage` sur les
  groupes actifs, avec alternatives OU, dépendances ET et minimum du corrigé.
  Publier avant expansion (top 8) et après expansion du contexte. Rapporter aussi
  la proportion de cas dont tous les groupes sont couverts. Ce rappel mesure les
  preuves connues, pas un ensemble exhaustif de sources pertinentes.
- Précision sémantique du contexte : passages jugés pertinents / passages fournis.
  Calcul micro global et macro par cas, avec jugement documenté. La précision
  calculée seulement contre la liste d’IDs du corrigé serait une sous-estimation :
  elle ne remplace pas cette annotation.
- Une F1 éventuelle combinant précision sémantique et rappel de groupes sera
  explicitement nommée composite ; elle n’est pas une F1 documentaire classique.

**Génération :**

- Couverture des critères attendus (`fact coverage`, approximation) : somme des
  couvertures / nombre de critères `must_include`, en micro et macro. Inclure les
  critères de clarification/refus ; publier aussi les cas de contenu factuel.
- Précision des citations : liens bloc–source apportant un soutien réel / ensemble
  des liens bloc–source. Ce score ne garantit pas que tout le bloc soit étayé.
- Fidélité des blocs : soutien complet (1), partiel (0,5), absent/incorrect (0)
  de chaque bloc factuel par l’union de ses sources citées. Les simples invitations,
  clarifications ou constats d’absence sont non applicables, avec justification.
- Taux d’erreurs critiques, taux d’obtention d’une réponse, latence médiane/p95 et
  tokens rapportés. Ne pas inventer de coût : les tokens retournés n’incluent pas
  nécessairement les embeddings ni les tentatives internes infructueuses.

**Validation d’un cas :** règle déjà approuvée du benchmark :
`100 × somme(notes) / (2 × dimensions applicables) ≥ 75`, aucune erreur critique,
et Sources ≥ 1/2 si applicable. Un échec technique est non validé. Le score demandé
est **nombre de cas validés / 40**, avec liste et raison des cas non validés.
Un score élevé n’exige pas nécessairement 100 % des critères : publier les
incomplétudes même lorsque le seuil de validation est atteint.

### Précisions d’annotation du premier audit, après collecte

La précision principale est calculée sur les **37 cas ayant des groupes de preuves
actifs**, pour éviter de demander une preuve positive aux trois cas sans groupe.
Le diagnostic sur tous les 40 cas et leurs 320 passages est aussi publié, sans
faire disparaître ces passages. Chaque occurrence est annotée, pas seulement les
IDs contenus dans les exemples du corrigé. Les définitions utiles sont pertinentes ;
une politique simplement voisine ou un titre d’annexe vide ne l’est pas.

Le sous-ensemble de couverture factuelle comprend les critères des cas 1–32,
puis le premier critère de MIL-035, MIL-037 et MIL-039. Les autres critères de
33–40 demandent surtout de clarifier, refuser ou constater une limite ; ils restent
dans la métrique globale de couverture. Les attentes conditionnelles sont publiées
séparément. Certains critères factuels restent composites ou explicatifs : cette
approximation n’est pas une mesure de rappel de faits atomiques.

Pour MIL-029, la question ouverte autorise les droits de douane écologiques comme
troisième exemple fiscal pertinent. Cette décision sémantique est inscrite dans
l’audit ; le rappel brut de la liste connue reste publié à côté du rappel ajusté.
Le corrigé n’est pas modifié. Pour MIL-034, seule l’affirmation du nombre de
logements active son groupe de preuves : les places et tarifs des crèches ne
sont pas artificiellement exigés. Ce cas est signalé comme limite à revoir.

Les valeurs complètes par défaut dans `audit-decisions.json` sont des jugements
du lecteur pour les éléments vérifiés, pas un test automatique d’appartenance
d’IDs. Elles sont développées pour chaque critère, bloc et passage dans
`audit.jsonl`. L’empreinte des sorties est liée aux décisions pour empêcher une
réutilisation accidentelle des notes sur d’autres réponses. Les calculs vérifient
aussi l’intégrité du corpus, des questions et du corrigé.

## Reproduction et suites

```bash
.venv/bin/python scripts/evaluate_benchmark.py \
  --output benchmarks/chati-v1/runs/2026-10-31-first
```

Conserver les réponses de cette exécution pour reproduire les **calculs**. Une
nouvelle génération est stochastique : utiliser un nouveau répertoire et comparer
les distributions sur plusieurs runs. Ne pas modifier les sorties brutes.
Faire relire les jugements, notamment échecs et erreurs critiques, par un humain
ou un juge indépendant ; enregistrer les désaccords et leurs arbitrages.

Ce lot est un benchmark de conception public, pas un test indépendant. Le nouveau
lot de sous-sections prévu dans `../NEXT-BENCHMARK.md` reste réservé. Le parcours
web demande en plus un protocole sur la fraîcheur et le droit effectivement
applicable. La validation visuelle de l’interface n’est pas mesurée ici.

La séparation des critères, la conservation des traces et la calibration ultérieure
avec des humains suivent les [recommandations d’évaluation OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
