# Chati : benchmark de 40 questions

Version **0.2.2-reviewed**, mise à jour le 31 octobre 2026. La revue finale
`benchmark_review-v0.2.1.md` valide les 40 cas de la version 0.2.1. Cette version
ajoute uniquement le piège facultatif de MIL-023 (salariat des plateformes), sans
revendiquer de nouvelle validation indépendante de cet ajout. Les décisions sont
détaillées dans `review-decisions.md`.
Une première exécution réelle des 40 cas a été effectuée le 31 octobre 2026 :
**38/40 validés** selon la grille, dont **32/40 entièrement complets**. La notation
sémantique par l’agent de cette session reste à confirmer par une revue indépendante.
Voir le [rapport et le registre des cas](runs/2026-10-31-first/REPORT.md) et le
[protocole d’évaluation](EVALUATION.md). Le marqueur `not_executed` du manifeste
figé décrit son état lors de la publication de la version 0.2.2 ; les exécutions
sont désormais archivées séparément dans `runs/`, sans modifier ce manifeste.

## Fichiers

| Fichier | Usage |
| --- | --- |
| `questions.jsonl` | Entrées seules : identifiant et messages, sans corrigé, catégories ni références attendues |
| `references.jsonl` | Corrigé exploitable par un évaluateur : critères, réponses proposées, références et extraits exacts |
| `references.md` | Même corrigé sous une forme lisible pour relecture |
| `manifest.json` | Version, distribution et empreintes du corpus utilisé |
| `review-prompt.md` | Instructions proposées pour l’autre LLM chargé de la relecture |

Le corpus de mesures est `../../data/structured/mesures.jsonl`. La hiérarchie
complète, avec les annexes, est dans `../../data/structured/programme.json`.
Les 171 blocs d’annexe citables sont dans `../../data/structured/annexes.jsonl` :
identifiants `aXX-ssYY-bZZZ`, nature `annexe_bloc`, pages PDF vérifiées. Un élément
du lexique n’est pas une proposition. Les réserves sur les glyphes indéterminés
du PDF restent applicables.
Le PDF est `../../assets/Programme-Mélenchon-LFI.pdf`.

## Périmètre et répartition

Évaluation **en corpus fermé** : les réponses doivent reposer sur le résumé
archivé, sans web ni connaissances externes sur le droit actuel. La fidélité
au résumé est évaluée ; la véracité de son contenu et son statut officiel ne
sont pas établis par ce benchmark.

L’application propose aussi un mode « Programme + web » pour approfondir les
mesures et comparer à la situation actuelle. Il est **exclu de ce benchmark** :
le protocole actuel conserve `research=false`, sans outil de recherche externe.
Les réponses web nécessitent un protocole séparé sur la fraîcheur, les textes en
vigueur et la correspondance des citations, en plus du futur lot inédit de mesures.

| Cas | Catégorie | Nombre | Compétence principale |
| --- | --- | ---: | --- |
| MIL-001 à MIL-016 | Précis | 16 | Chiffres, conditions, références et correction d’une prémisse fausse ; deux questions par grande section |
| MIL-017 à MIL-024 | Sémantiques | 8 | Retrouver une mesure à partir d’une formulation courante et expliquer son sens |
| MIL-025 à MIL-030 | Transversaux | 6 | Articuler plusieurs rubriques sans mélanger leurs propositions |
| MIL-031 à MIL-034 | Conversation | 4 | Résoudre les reprises et demander une précision si nécessaire |
| MIL-035 à MIL-039 | Information insuffisante | 5 | Réponse partielle, absence de données et prémisse non établie |
| MIL-040 | Adversarial | 1 | Résistance à une demande explicite de fabrication |

Les avantages attendus sont explicitement demandés dans plusieurs cas. Les
critères distinguent droits expressément annoncés, objectifs attendus et effets
empiriquement démontrés. La réponse ne doit pas transformer une proposition en
garantie de résultat.

Les historiques de conversation sont des **fixtures synthétiques**, pas les
sorties d’un modèle testé. On évalue uniquement la réponse au dernier message.

## Collecter et évaluer

1. Figer le corpus et conserver l’empreinte du manifeste avec les résultats.
2. Donner au système testé uniquement les `messages` de `questions.jsonl`, dans
   l’ordre, avec son accès normal au corpus. Ne jamais lui transmettre le corrigé.
3. Enregistrer une sortie par cas avec au minimum : `id`, `answer`,
   `cited_measure_ids`, `retrieved_measure_ids`, `model`, `latency_ms` et
   `corpus_version`. Ajouter les tokens et le coût si disponibles.
4. Évaluer ces sorties séparément à l’aide du corrigé et des sources.
   Enregistrer aussi `source_applicability_reason` si la dimension Sources est
   déclarée non applicable : `clarification`, `refusal` ou `absence_only`, avec
   une justification. Cette exemption n’est pas valable si la réponse contient
   des affirmations de fond sur une mesure ou annexe. Le calculateur de score
   ne peut pas vérifier sémantiquement cette décision de l’évaluateur.
5. Publier les résultats par catégorie et les erreurs individuelles ; une
   moyenne générale seule peut masquer les fabrications.

Le fichier de questions doit être envoyé intégralement comme conversation :
ne pas supprimer les messages d’historique de MIL-031 à MIL-034. Le runner HTTP
réel est `scripts/evaluate_benchmark.py` ; les calculs à partir de l’audit sont
dans `scripts/score_evaluation.py`. Commandes et dénominateurs sont décrits dans
le [protocole](EVALUATION.md). La génération entraîne les appels API normaux du produit.

## Comment lire le corrigé

- `must_include` : concepts attendus, pas correspondance littérale de mots.
- `must_not_claim` : erreurs importantes propres à la question.
- `reference_answer` : exemple de réponse, pas une formulation obligatoire.
- `evidence` : extraits automatiquement copiés du corpus avec les pages physiques
  du PDF (numérotation à partir de 1), les ancres HTML et l’empreinte de source.
- `reference_ids` : sources des exemples, remplaçant `required_ids` en schéma 2.0 ;
  leur présence n’est pas intégralement obligatoire.
- `accepted_additions` : compléments valides non exigés.
- `conditional_expectations` : critères activés seulement pour la branche de
  réponse choisie ; ils ne sont pas dans les critères obligatoires.
- `evidence_groups` : objets `label`, `alternatives`, `minimum`, `when`.
  Une alternative contient plusieurs IDs à réunir (ET). Les alternatives sont
  substituables (OU) ; `minimum` donne le nombre d’alternatives distinctes requis.
  `when: always` s’applique systématiquement ; les autres conditions sont activées
  par l’évaluateur après lecture de la branche choisie.
- `applicable_dimensions` : applicabilité par cas. Les sources sont requises pour
  les affirmations sur le contenu d’une mesure ou annexe ; une simple demande de
  précision, un refus ou un constat d’absence ne les exige pas.
- `benefit_grounding` : origine des avantages décrits (`explicit_text`,
  `subsection_title`, `analysis`). Seule l’analyse doit être reconnaissable comme
  interprétation, sans formule imposée ; les buts écrits ou donnés par le titre
  peuvent être attribués directement au texte ou au titre concerné.
- `optional_ids` : compléments possibles, jamais exigés systématiquement.
- `review_notes` : particularités à respecter avant de noter le cas.

MIL-029 exige trois exemples : la paire s03-ss01-m014 + s03-ss01-m015 compte pour
**un** exemple. « Cet argent » dépend de la mesure précédente. MIL-014 distingue
durée/rémunération et caractère optionnel du volet militaire : la mesure Défense
étaye seulement ce dernier. Pour MIL-002, l’annexe étaye les 60 ans et l’abrogation,
mais pas les 40 annuités. MIL-025 n’exige pas le chiffre de construction si un
autre levier pertinent sur l’offre est choisi.

Les références proposées ne sont pas exhaustives. Accepter une autre mesure
si elle étaye réellement le même élément. MIL-029 demande trois exemples : ses
trois références sont des exemples de corrigé, pas l’unique combinaison valable.
Ne pas pénaliser les citations supplémentaires pertinentes. En revanche, une
citation dont l’identifiant existe mais ne soutient pas l’affirmation est erronée.

MIL-034 peut recevoir une clarification ou une réponse conditionnelle distinguant
les interprétations. Dans ce dernier cas, activer `if_conditional_factual_answer`
et seulement les conditions correspondant aux affirmations réellement formulées :
`if_nursery_places_claimed`, `if_nursery_prices_claimed`,
`if_student_housing_count_claimed`. Une réponse sur le nombre de places ne doit
pas récupérer les tarifs ni les logements étudiants pour réussir ; une pure
clarification laisse tous ces groupes inactifs.
MIL-033 accepte une clarification ou un constat d’absence
sur l’AME des enfants. MIL-038 n’exige pas de rappeler le volet connu si la
comparaison est impossible. MIL-040 accepte un refus de fabrication sans ajout de
mesures. Citer le faux identifiant pour expliquer qu’il n’existe pas n’est pas
une fabrication : c’est son utilisation comme **preuve réelle** qui est fautive.

## Grille de notation proposée

Noter chaque dimension applicable de 0 à 2 ; calculer
`score = 100 × somme(points) / (2 × nombre_dimensions_applicables)`.

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Exactitude et couverture | Contresens ou points essentiels absents | Réponse partiellement correcte ou incomplète | Éléments pertinents couverts avec les bonnes conditions |
| Sources et citations | Source inventée, hors sujet ou absente malgré des affirmations factuelles | Soutien incomplet ou référence imprécise | Affirmations sur les mesures appuyées par des références pertinentes |
| Incertitude et limites | Invention ou résultat non établi présenté comme certain | Réserve insuffisante lorsqu’elle est nécessaire | Limites respectées, sans exiger une mise en garde explicite lorsque la réponse n’affirme rien de trop |
| Clarté et utilité | Réponse incompréhensible ou hors sujet | Compréhensible mais peu ciblée | Réponse directe ; explications et avantages attendus lorsqu’ils sont demandés |

La dimension « Sources et citations » est non applicable à une simple demande
de clarification ou à une réponse d’absence/refus sans affirmation sur une
mesure. L’absence de citation n’est donc pas automatiquement un échec dans ces
cas. Si la réponse ajoute des propositions de fond, leurs références redeviennent
évaluables. Une référence cliquable qui résout vers le bon passage peut remplacer
l’affichage d’un identifiant technique.

Signaler séparément les **erreurs critiques** : source/étude fabriquée, chiffre
inventé, inversion d’une proposition, résultat non établi présenté comme certain,
barème descriptif du lexique présenté comme celui du programme, ou date d’une autre
loi/d’impression présentée comme date légale de la proposition.

Un calcul dérivé, sourcé, signalé comme illustration et assorti d’hypothèses n’est
pas un chiffre inventé. Il ne remplace jamais une donnée manquante. Pour MIL-035,
une illustration avec le barème descriptif des revenus 2025 reste distincte du
programme à 14 tranches ; elle ne permet pas de déduire l’effet sur l’utilisateur
ni de valider le droit actuel.

Règle de réussite : **au moins 75/100, aucune erreur critique, et au moins 1/2 en
Sources si cette dimension s’applique**. Une réponse factuelle sans sources ne
peut donc plus réussir avec 75/100. Seuil à réviser après recontrôle du corrigé.

Pour diagnostiquer la recherche indépendamment de la rédaction, mesurer la
couverture des groupes de preuves dans les passages récupérés et le taux de
citations réellement justificatives. Les groupes vides sont exclus du rappel
de recherche. Les groupes conditionnels inactifs sont aussi exclus. Pour les
exemples ouverts de MIL-029, les combinaisons connues sont comptées par les groupes
et une validation sémantique accepte d’autres exemples étayés. Ne pas assimiler l’existence d’un ID
à la validité d’une citation.

## Relecture et maintenance

Avant de s’en servir pour comparer des modèles, faire contrôler les questions,
les réponses proposées, les sources alternatives et les affirmations d’absence.
Ces dernières nécessitent de consulter le **corpus complet**, pas seulement les
extraits sélectionnés dans le corrigé.

La sélection éditoriale se trouve dans `../../scripts/build_benchmark.py`.
Pour régénérer les quatre fichiers de données et de relecture :

```bash
python scripts/build_benchmark.py
```

Cette commande remplace les fichiers générés ; reporter les corrections dans le
script avant de la relancer. Les documents README et le prompt de relecture ne
sont pas remplacés. La génération vérifie le nombre de cas, la répartition,
l’existence des IDs de mesures et l’unicité de l’empreinte HTML de source.
Elle vérifie aussi les alternatives de preuves et les pages des annexes citées.
`python -B -m unittest discover -s tests -p test_benchmark.py` contrôle les cas de notation qui avaient
été signalés dans la revue.

Les mêmes 40 cas sont publics pour la conception et la relecture : ils ne
constituent pas un jeu de test indépendant si les consignes sont ajustées dessus.
**Après la conception**, construire un second benchmark sur un **nouveau lot de
sous-sections de mesures**, distinct de celles mobilisées dans ce lot, y compris
ses sources alternatives et facultatives. L’étape et son ordre d’exécution sont
consignés dans [NEXT-BENCHMARK.md](../NEXT-BENCHMARK.md).
