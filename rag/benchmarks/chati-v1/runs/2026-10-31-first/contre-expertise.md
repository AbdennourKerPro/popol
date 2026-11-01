# Contre-expertise de la première évaluation de Chati

Relecture indépendante, le 31 octobre 2026, du run `2026-10-31-first` et de l'audit sémantique réalisé par Codex. Les fichiers du run n'ont pas été modifiés.

## 1. Conclusion

- **La lecture des textes faite par Codex est en grande majorité juste.** Je suis d'accord avec 36 de ses 40 décisions (validé ou non validé). Aucune réponse ne contient de contenu inventé qu'il aurait laissé passer.
- **Le score de 38/40 (95 %) surestime en revanche la qualité de Chati**, pour trois raisons.
  - **La règle de réussite est trop indulgente.** Une réponse notée 0 en exactitude atteint quand même 75/100 et est validée si ses trois autres notes valent 2. MIL-020 n'échoue que parce qu'il a reçu une note de clarté à 1, que la grille ne justifie pas.
  - **Certaines réponses disent à tort qu'un élément est absent, et ce n'est pas pénalisé.** Dans 5 cas, la question demande explicitement un élément, le résumé le contient, mais Chati répond que les passages fournis ne le contiennent pas. La grille récompense cette prudence (Limites à 2), alors que l'utilisateur repart avec une information fausse sur le programme.
  - **L'audit présenté comme détaillé « critère par critère » ne l'est pas.** Les notes non modifiées sont des valeurs par défaut. Chaque critère, bloc, passage et fiche reprend la note générale du cas comme justification. Les scores de 100 % sur les citations et les fiches ne sont donc pas étayés élément par élément.
- **Score que je propose de publier :**

| Lecture | Cas validés |
|---|---:|
| Règle actuelle, avec la note de clarté de MIL-020 corrigée | 39/40 |
| Codex, tel que publié | 38/40 |
| **Proposée : une fausse absence sur un élément demandé fait échouer le cas** | **34/40** |
| Réponses complètes, déjà publiées par Codex | 32/40 |

Je recommande de publier **34/40**, accompagné de **32/40 réponses complètes**. Le 95 % ne devrait pas apparaître en tête du rapport.

## 2. Ce que j'ai vérifié

- **Reproductibilité.** J'ai relancé `score_evaluation.py` sur une copie du run. `audit.jsonl`, `metrics.json` et `REPORT.md` sont identiques à l'octet près. Les empreintes du corpus, des questions et du corrigé correspondent à celles de `run.json`. Les 22 tests de `test_evaluation.py` et `test_benchmark.py` passent.
- **Réponses.** Pour chacun des 40 cas, j'ai lu les blocs, les fiches de mesures et les 8 passages de contexte, puis je les ai comparés au corrigé (`must_include`, `must_not_claim`, conditions) et au texte intégral des mesures dans `mesures.jsonl` et `annexes.jsonl`.
- **Cohérence entre code et rapport.** J'ai comparé `score_evaluation.py` et `benchmark_rules.py` à `EVALUATION.md` et au README du benchmark.
- **Limite de ma propre revue.** Je suis aussi un modèle, pas un humain. Ma relecture ne remplace pas la validation humaine prévue par le protocole.

## 3. Points d'accord avec Codex

- **Collecte.** Le protocole est sain : le corrigé n'est jamais envoyé à l'application, chaque cas n'a qu'une tentative, les sorties brutes sont archivées avec leurs empreintes et les décisions sont liées à ces sorties.
- **MIL-003, non validé.** « Le RIC permettrait de révoquer des élus » contredit la source, qui dit « révoquer, proposer ou abroger des lois ». Cette erreur était explicitement interdite par le corrigé.
- **MIL-029.** Accepter les droits de douane écologiques comme troisième exemple est cohérent avec le corrigé (« sans exiger les trois exemples du corrigé »), et la décision est documentée de façon transparente.
- **MIL-033, 035, 036, 037, 038, 039 et 040.** Les refus, les constats d'absence et les branches conditionnelles sont bien jugés.
  - MIL-035 : le barème à cinq paliers n'est pas utilisé pour le calcul.
  - MIL-039 : la date du 14 avril 2023 est correctement rattachée à la réforme abrogée.
  - MIL-040 : l'objectif 2027 de l'illettrisme n'est pas transféré à la fermeture des centrales.
- **Diagnostic général.** La recherche documentaire est le vrai point faible. Sur les 8 cas imparfaits, 6 viennent d'un passage attendu qui n'a pas été retrouvé (MIL-018, 020, 025, 027, 030 et 034). Les 2 autres (MIL-001 et 003) sont des défauts de rédaction.

## 4. Désaccords de fond

### 4.1 La règle des 75/100 peut valider une réponse notée 0 en exactitude

Une note de 0/2/2/2 donne `100 × 6 / 8 = 75`, ce qui suffit pour valider. La grille rejette les réponses sans sources, mais rien n'empêche de valider une réponse qui manque l'essentiel.

**MIL-020 en est l'illustration.** La réponse ne couvre aucun des trois critères attendus, mais elle est claire et répond directement que rien n'a été trouvé. Codex lui donne 0/2/2/1 = 62,5 sans expliquer cette note de clarté à 1. Or la grille définit la clarté 1 comme « compréhensible mais peu ciblée », ce qui ne décrit pas cette réponse. Avec une clarté à 2, la réponse obtiendrait 75 et serait validée. Le verdict est juste, mais il repose sur une note de clarté qui compense le défaut de la règle.

**Correction proposée :** exiger une exactitude ≥ 1, comme on exige déjà Sources ≥ 1, et justifier toute note inférieure à 2.

### 4.2 Une fausse absence est traitée comme une limite honnête

Dans les cas suivants, la question demande explicitement un élément, cet élément figure dans le résumé, mais la réponse affirme qu'il est absent des passages fournis.

| Cas | Élément demandé | Ce que dit la réponse | Ce que contient le corpus | Codex | Ma décision |
|---|---|---|---|---|---|
| MIL-020 | Proposition contre les débordements | « Aucune proposition … n'apparaît » | `s03-ss09-m001` | Non validé (62,5) | Non validé |
| MIL-025 | Levier « aide au paiement » | « aucun versement d'aide directe au locataire … n'est décrit » | `s01-ss08-m004` (APL +10 %) | Validé (87,5) | **Non validé** |
| MIL-027 | Santé mentale « des étudiants en particulier » | « Aucun dispositif spécifiquement destiné … n'est décrit » | `s06-ss09-m002` | Validé (87,5) | **Non validé** |
| MIL-030 | Traçabilité des contrôles policiers | « ne précisent pas de dispositif de traçabilité » | `s07-ss01-m004` (récépissé) | Validé (87,5) | **Non validé** |
| MIL-034 | « combien » pour les crèches | « Je ne trouve pas de chiffre concernant les crèches » | `s06-ss01-m001` (500 000 places) | Validé (75, cas limite) | **Non validé** |

**Pourquoi je compte ces réponses comme des échecs :**

- L'utilisateur ne choisit pas les passages retrouvés. « Pas dans ces passages » revient pour lui à « le programme ne prévoit rien ». Sur une question à plusieurs volets, il repart avec une information fausse sur le volet qu'il a explicitement demandé.
- Le benchmark distingue lui-même l'absence dans le corpus de l'absence dans les passages retrouvés (MIL-036 à 040). Une absence affirmée alors que le corpus contient l'élément devrait donc compter comme une erreur d'exactitude, et non comme une prudence notée 2 en Limites.
- MIL-018 n'entre pas dans cette catégorie. L'accueil physique y est simplement omis, sans fausse affirmation d'absence, et la question ne le demandait pas explicitement. Je maintiens sa validation.

**Correction proposée :**

- définir la note 0 en exactitude comme incluant « un élément explicitement demandé est absent ou déclaré absent alors que le corpus le contient » ;
- ajouter une métrique « fausses absences », c'est-à-dire le nombre d'affirmations d'absence contredites par le corpus. C'est le défaut le plus coûteux pour un RAG en corpus fermé, et il est aujourd'hui invisible.

### 4.3 L'audit détaillé hérite de la note générale du cas

`audit-decisions.json` applique des valeurs par défaut :

- notes à 2/2/2/2 ;
- critères, blocs et fiches entièrement couverts ;
- toutes les citations considérées comme contributives.

31 cas ne contiennent qu'une note générale. Dans `score_evaluation.py`, le champ `reason` de chaque critère, bloc, passage et fiche reçoit `decision['notes']` (lignes 100, 109, 124, 126 et 140). `EVALUATION.md` dit pourtant que les décisions sont « développées pour chaque critère, bloc et passage ». Il s'agit en réalité d'une seule appréciation par cas, recopiée sur chaque élément.

**Conséquence :** les taux de 100 % (citations, 108/108), 99 % (blocs) et 100 % (fiches, 70) mesurent surtout l'absence d'exception relevée, pas un contrôle élément par élément. J'ai trouvé au moins trois exceptions qui n'ont pas été relevées :

- **MIL-036, bloc 0.** Il cite les 8 passages fournis et les 8 liens sont comptés comme contributifs. Pourtant Codex juge ces mêmes 8 passages non pertinents (`relevant_ids` vide). Les deux jugements se contredisent, et ces 8 liens représentent 7 % du dénominateur de 108.
- **MIL-027, bloc 0.** « Réduction des risques » et « pilotage par le ministère » viennent de la sous-section « Santé mentale et addictions », mais la réponse les range sous la santé mentale. Ce bloc mériterait un soutien partiel.
- **MIL-032, fiche `s03-ss04-m001`.** La source dit « démantèlement et reconversion », sans préciser de qui. La fiche ajoute « des travailleurs » et classe l'avantage en `explicit_text`. C'est une interprétation, qui devrait être classée `analysis`.

Corriger ces trois points ne change aucune décision de validation. En revanche, on ne peut plus présenter ces métriques comme des scores parfaits établis.

### 4.4 Le juge n'est pas indépendant et ses précisions ont été fixées après lecture des réponses

L'évaluateur est l'agent de la session qui a exécuté le run. `EVALUATION.md` le reconnaît honnêtement. Plusieurs règles ont cependant été fixées après la lecture des sorties :

- le dénominateur de 37 cas pour la précision ;
- le sous-ensemble de critères factuels, défini en dur par numéro de cas (ligne 98) ;
- l'alternative acceptée pour MIL-029 ;
- les conditions activées pour MIL-034.

Chacune est défendable. Toutes vont dans le sens d'un meilleur score ou d'une non-pénalisation, et aucune n'a été relue par un second juge. Cela justifie de ne pas mettre en avant le meilleur des chiffres.

## 5. Points mineurs

- **Colonnes « avant expansion » et « contexte fourni ».** Elles sont identiques parce que l'expansion (`corpus.expand`) n'a été déclenchée dans aucun cas : `context_ids` est égal à `retrieved_ids` partout. Mieux vaut le dire, ou supprimer l'une des deux colonnes.
- **Précision micro et macro.** Elles sont nécessairement égales, puisque chaque cas compte exactement 8 passages.
- **MIL-003.** La même erreur est sanctionnée trois fois : exactitude 0, limites 0 et erreur critique. Le verdict ne change pas : 1/1/0/2 donnerait 50/100. En revanche, « attribuer un pouvoir juridique absent du texte » ne figure pas dans la liste des erreurs critiques du README. Il faudrait l'y ajouter plutôt que de s'appuyer seulement sur `must_not_claim`.
- **MIL-034.** Je suis d'accord avec la demi-couverture du premier critère : la réponse sépare bien les deux objets, sans signaler l'ambiguïté. Le cas échoue chez moi uniquement à cause de la fausse absence sur les crèches (section 4.2).

## 6. Décisions comparées

| Cas | Codex | Moi | Motif |
|---|---|---|---|
| MIL-003 | Non validé | Non validé | Accord. La notation sanctionne trois fois la même erreur (section 5). |
| MIL-020 | Non validé | Non validé | Accord sur le verdict, mais la note de clarté 1 n'est pas justifiée (section 4.1). |
| MIL-025 | Validé | **Non validé** | Fausse absence de l'aide au paiement |
| MIL-027 | Validé | **Non validé** | Fausse absence du volet étudiant |
| MIL-030 | Validé | **Non validé** | Fausse absence du récépissé |
| MIL-034 | Validé | **Non validé** | Fausse absence des chiffres sur les crèches |
| 34 autres cas | Validés | Validés | Accord |

## 7. Recommandations avant de publier un score

1. **Ajouter une condition sur l'exactitude.** Exiger une exactitude ≥ 1 et considérer qu'une fausse absence sur un élément demandé correspond à une exactitude de 0. Recalculer ensuite et publier **34/40**, à côté de **32/40 réponses complètes**.
2. **Rendre l'audit réellement détaillé.** Enregistrer une justification par dimension notée et par exception, sans valeur par défaut pour les notes. Rendre cohérents `relevant_ids` et la contribution des citations, ou exclure les blocs de refus du calcul de précision des citations.
3. **Faire relire par un second juge indépendant**, humain de préférence, au moins les 8 cas imparfaits et un échantillon des cas notés 2/2/2/2. Publier le taux d'accord par dimension et la manière dont les désaccords ont été tranchés.
4. **Agir d'abord sur la recherche documentaire.** Elle est en cause dans 6 cas sur 8. Pour les questions à plusieurs volets, il faut lancer une recherche par volet ou réserver des places dans les 8 passages à chaque volet. Ensuite, empêcher le générateur d'affirmer une absence sans dire que la recherche peut l'avoir manquée.
5. **Garder ce lot comme lot de conception.** Comme le prévoit déjà `NEXT-BENCHMARK.md`, aucune conclusion générale sur Chati ne doit être tirée avant un lot de questions inédit.
