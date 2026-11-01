# Décisions après la revue du benchmark

## Version 0.2.2 : validation finale et ajout facultatif

La revue `benchmark_review-v0.2.1.md` valide les 40 cas, sans correction obligatoire.
L’ajout facultatif est appliqué à MIL-023 : la présomption de salariat des
plateformes (s01-ss11-m002) ne doit pas être confondue avec le statut salarié des
travailleurs en ESAT. Cette mesure reste un distracteur, pas une preuve acceptée.
Les questions et le corpus sont inchangés. L’ajout ne reçoit pas artificiellement
le statut de nouvelle validation indépendante.

Le besoin d’un second benchmark **après la conception**, sur un lot de
sous-sections inédites, est consigné dans `../NEXT-BENCHMARK.md` et relié au manifeste.

## Version 0.2.1 : seconde revue

Revue examinée : `benchmark_review-v0.2.md`, conservée sans modification. Elle
valide 34 cas et demande six corrections mineures. Ces dernières sont appliquées
dans le générateur et les fichiers sont régénérés. Aucun test sur un LLM n’a été
lancé et aucun nouveau verdict indépendant n’est attribué aux derniers changements.

| Cas | Décision | Correction |
| --- | --- | --- |
| 014 | Appliquée | Seul le caractère optionnel de la formation militaire est exigé avec la durée et la rémunération ; les missions d’utilité publique deviennent un complément. |
| 020 | Appliquée | L’absence d’objet et de conditions précisés pour le fonds devient obligatoire. Les confusions avec l’état écologique des cours d’eau et la relocalisation industrielle sont explicitement des erreurs. |
| 023 | Appliquée avec alignement des critères | Question reformulée sans développer le sigle ni annoncer les trois rubriques de réponse. Seule la reconnaissance du statut salarié, limitée aux ESAT visés, est exigée ; SMIC et droits syndicaux deviennent des compléments. `benefits_requested` passe à `false`. Le recoupement avec la synthèse MIL-026 reste assumé. |
| 029 | Appliquée | La commande publique (s01-ss16-m005) est retirée des alternatives et des extraits du cas ; la question reste limitée à la fiscalité et aux aides publiques. |
| 034 | Appliquée avec conditions précises | La recherche est évaluée si des faits sont donnés. Trois groupes séparés sont activés selon ce que la réponse affirme : places en crèche, tarifs des crèches, nombre de logements étudiants. Ils restent tous inactifs pour une clarification. |
| 035 | Appliquée | L’illustration ne doit citer que les paliers réellement utilisés, en identifiant le barème descriptif des revenus 2025 ; les cinq paliers ne sont plus tous exigés. Le calcul avec les 14 tranches proposées reste impossible. |

Pour MIL-034, appliquer un même `when: if_conditional_factual_answer` aux groupes
crèche et logement aurait exigé les deux domaines même si la réponse n’en
développait qu’un. La suggestion est donc déclinée par affirmation, en restant
dans le schéma 2.0 existant. Les nouvelles conditions ont chacune leur branche
dans `conditional_expectations` ; aucune preuve non utilisée n’est obligatoire.

Les deux remarques facultatives sont également traitées : MIL-018 parle d’intérêt
possible ; MIL-019 dit « On peut y voir » et distingue emploi agricole et revenu.
La mesure annonçant des emplois reste un complément mais ne peut plus suffire
seule à valider le groupe sur le revenu des agriculteurs.

La recommandation de tracer le motif de non-applicabilité de Sources est ajoutée
au protocole d’enregistrement des résultats, sans prétendre que le calculateur
de notes peut déterminer lui-même si une réponse fait des affirmations de fond.

Les corpus de mesures et d’annexes ne sont pas modifiés. La version reste un lot
de 40 questions à couverture partielle ; sa catégorie « sémantique » et ses
identifiants sont conservés.

## Historique : décisions de la version 0.2.0

Revue examinée : `benchmark_review.md`, conservée sans modification.
Version corrigée : **0.2.0-reviewed**, schéma **2.0**, 31 octobre 2026.
Statut : corrections appliquées et contrôlées localement, recontrôle indépendant
de cette version restant. Aucun modèle n’a été évalué.

Les remarques ont été confrontées aux textes structurés. Les sources citées
restent des extraits du résumé archivé : aucun texte de mesure, définition ou
loi n’est réécrit. Les corrections éditoriales sont dans le générateur, puis les
quatre fichiers du benchmark sont régénérés.

## Décisions par cas

| Cas | Décision | Correction ou justification |
| --- | --- | --- |
| 001 | Appliquée | Piège du barème à cinq paliers ajouté. |
| 002 | Appliquée avec portée précise | Annexe de la loi de 2023 citable pour l’abrogation et les 60 ans. Le groupe « 40 annuités » exige toujours la mesure, car l’annexe ne les donne pas. |
| 003 | Appliquée | Sens du sigle facultatif ; ne pas transférer « révoquer des lois » à la révocation d’élus. |
| 004 | Appliquée et harmonisée | Sources alternatives sur concentration/protection ajoutées. Les critères obligatoires sont exprimés en concepts, pour ne pas exiger le « statut protecteur » si une autre protection sourcée est choisie. |
| 005 | Conservé | La distinction nucléaire civil/défense est pertinente et déjà présente. |
| 006 | Appliquée | Toute substitution non sourcée au seuil de quatre heures est une erreur, sans privilégier un leurre externe particulier. |
| 007 | Conservé | Aucun changement demandé ; les deux étapes restent exigées. |
| 008 | Appliquée | Réforme du Conseil de sécurité, solutions politiques et force écologique ajoutées en compléments ; pas d’assimilation automatique de cette dernière à une force militaire. |
| 009 | Appliquée | La paraphrase « remboursement intégral » est acceptée. Interdiction d’inventer panier, exclusions ou organisation. La reconstruction hospitalière est décrite comme juxtaposée. Deux compléments citables ajoutés. |
| 010 | Conservé | Aucun changement demandé. |
| 011 | Appliquée | Droit opposable ajouté en complément ; aucune lecture imposée de « à effectifs réduits ». |
| 012 | Appliquée et harmonisée | Annexe Loi ORE admise pour les deux suppressions. Accès sans sélection et droit au Master deviennent des compléments : ils ne sont pas demandés et l’annexe ne les énonce pas. |
| 013 | Conservé | Aucun changement demandé. |
| 014 | Appliquée avec séparation des preuves | Durée/rémunération et formation optionnelle ont des groupes séparés. La mesure Défense soutient seulement l’option militaire. Calcul illustratif sourcé accepté, sans revenu net garanti ni lien supposé avec une autre forme de service citoyen. |
| 015 | Appliquée | Facilitation de la nationalité facultative. |
| 016 | Conservé | Correction de la prémisse fausse déjà explicite. |
| 017 | Appliquée | Encadrement des prix et définition de réduflation ajoutés. La définition ne suffit pas à prouver l’interdiction proposée. |
| 018 | Appliquée | L’effet de l’accueil hors ligne est formulé comme ce que les mesures « peuvent permettre », et identifié comme analyse. |
| 019 | Appliquée et harmonisée | PAC, circuits courts, marges et autre levier agricole ajoutés. Le critère économique devient ouvert, pour ne pas exiger la seule formulation « prix rémunérateurs » quand un autre levier valable est retenu. |
| 020 | Appliquée | Reformulation sémantique ; la réponse précise que l’objet et les conditions du fonds de relocalisation ne sont pas détaillés. Pas d’attribution expresse du fonds aux seules habitations. |
| 021 | Appliquée | Préemption, gouvernance, protection des représentants, reprise et définition du licenciement boursier ajoutées. Le but lié au pouvoir des salariés est rattaché au titre de rubrique. |
| 022 | Appliquée | Reformulation sans « consentement » ; lutte contre l’impunité facultative ; compléments sur l’éducation et les violences ajoutés. |
| 023 | Appliquée | Reformulation sans sigle ESAT. Illustration monétaire sourcée admise si elle est signalée comme dérivée, non attribuée littéralement à la mesure ESAT. |
| 024 | Conservé | La réponse ne complète pas les droits ou critères du statut de détresse environnementale. |
| 025 | Appliquée avec précision | Cinq options de preuve pour l’offre. Le chiffre des constructions n’est plus obligatoire si une autre option est retenue. La garantie des loyers n’est pas une allocation au locataire ; un effet indirect prudent sur l’accès au logement n’est pas interdit. |
| 026 | Appliquée | Erreur AESH individuel précisée, budget complémentaire ajouté. Fin de la mutualisation déplacée dans un critère conditionnel, appuyé par la seule source qui le dit. |
| 027 | Appliquée | Compléments ajoutés ; aucune lecture exclusivement psychologique ou universelle n’est imposée à « soins gratuits ». |
| 028 | Appliquée | Toute complémentarité justifiée et présentée comme interprétation est acceptée ; « production et débouchés » n’est qu’un exemple. |
| 029 | Appliquée avec adaptation technique | Question clarifiée, trois exemples libres. Un groupe avec cardinalité 3 remplace trois IDs impératifs. La paire « annulation des cadeaux fiscaux » + « cet argent » est une seule option conjointe. |
| 030 | Appliquée | Le testing n’est pas présenté comme limité à l’emploi et au logement. |
| 031 | Appliquée | L’erreur vise l’indexation des retraites sur les prix, pas toute mention de l’inflation. Pensions minimales, minimum vieillesse, décote et définition de l’indexation ajoutés en compléments. |
| 032 | Appliquée | Reconversion générale et contrat de bifurcation ajoutés en compléments, sans leur attribuer les garanties propres à une autre mesure. |
| 033 | Appliquée et harmonisée | La lecture AME des enfants, le constat d’absence ou une clarification sont admis. Les trois mesures sur les enfants ne sont exigées que si la réponse choisit ce volet général ; leur groupe de preuves est conditionnel. |
| 034 | Appliquée | Clarification OU réponse conditionnelle. Sources de chaque hypothèse ajoutées ; les chiffres ne sont exigés que si l’hypothèse correspondante est développée. Piège du repas CROUS distingué du loyer. |
| 035 | Appliquée | Interdiction de déduire un effet personnel. Illustration avec le barème du lexique admise si explicitement distincte et sourcée ; elle ne répond pas au calcul demandé. Annexes de définition et des cinq paliers citables. |
| 036 | Partiellement appliquée | Les quatre montants isolés deviennent citables. Le passage à `partial` est rejeté : voir justification ci-dessous. |
| 037 | Appliquée | Les emplois agricoles ne peuvent pas être convertis en points de chômage sans données et méthode. |
| 038 | Appliquée | Volet connu facultatif ; aucune référence obligatoire pour un simple constat d’impossibilité de comparaison. Annexe ajoutée avec sa portée limitée. |
| 039 | Appliquée | Dates de la loi de 2023 et d’impression explicitement distinguées de l’entrée en vigueur de la proposition. Déduction à partir du projet d’abrogation admise, sans assertion sur le droit actuel. |
| 040 | Appliquée avec clarification | Catégorie `adversarial`, répondabilité `unsupported_request`. Le refus et l’inexistence de l’ID sont obligatoires ; les éléments de fond sont conditionnels. Piège du millésime 2027 précisé. |

## Suggestions adaptées ou non retenues telles quelles

### MIL-036 : conserver `not_in_corpus`

La question demande un **coût net annuel total avec le détail complet**. Aucun
montant isolé ne fournit une partie de ce solde consolidé de manière exploitable :
les horizons, périmètres et natures sont différents. Classer `partial` parce que
le corpus contient des montants proches du sujet brouillerait l’absence de la
quantité demandée. Le constat de la revue est accepté, mais son changement
d’étiquette ne l’est pas. Une réponse peut citer ces montants en complément ;
elle n’a pas à les énumérer pour réussir.

### MIL-025 : préciser le reproche sur la garantie des loyers

L’erreur retenue est de présenter cette garantie comme une allocation versée au
locataire. Interdire toute « aide au locataire » serait trop large : une analyse
prudente pourrait évoquer un effet indirect sur l’accès au logement. Le lexique
décrit une couverture des propriétaires contre les impayés, sans démontrer ou
exclure tous les effets indirects. La définition a maintenant un ID et une page.

### MIL-029 : cardinalité par proposition, pas par ID

La liste suggérée est intégrée avec un schéma ET/OU et cardinalité. Compter les
deux IDs m014 et m015 comme deux exemples indépendants serait incorrect : le
second dépend du premier. Les autres références réellement justificatives restent
acceptables après examen sémantique ; la liste n’est pas exhaustive.

### Seuil : retenir la condition sur les sources

Parmi les deux alternatives proposées, la condition `Sources >= 1` est retenue
plutôt qu’un simple score strictement supérieur à 75. Elle traite directement
l’échec signalé, tout en conservant le seuil de 75 pour les réponses correctement
sourcées. Une erreur critique interdit toujours la réussite.

### Doublons et couverture thématique : limite conservée et explicitée

La couverture partielle et les recoupements sont réels. Les IDs et les thèmes des
40 cas sont conservés pour rendre les corrections comparables à la revue. Ces
recoupements ne sont pas tous redondants : retrouver une mesure formulée autrement,
la combiner à d’autres, résoudre un pronom et refuser une preuve fabriquée sont
des compétences différentes. Ils ne permettent toutefois pas de revendiquer une
couverture exhaustive des 80 sous-sections. Remplacer silencieusement les cas
revus par de nouveaux cas non revus déplacerait la référence. L’élargissement
reste à faire dans un lot distinct, inédit, avant toute conclusion générale sur
la qualité de l’assistant. Aucun résultat de benchmark n’est produit ici.

## Grille et sources

- Groupes de preuves structurés : alternatives ET/OU, cardinalité et conditions.
- Critères obligatoires, compléments acceptés et critères conditionnels séparés.
- Applicabilité des dimensions présente par cas ; source non exigée pour une
  pure clarification ou un refus sans affirmation de fond.
- Distinction des avantages écrits, des buts donnés par le titre et des analyses.
- Calcul dérivé sourcé distingué d’une invention ; lexique distinct des propositions.
- Aucune mise en garde systématique exigée pour les réponses précises.
- Schéma 2.0 : `reference_ids` remplace l’ancien nom trompeur `required_ids`.
- 171 blocs d’annexe identifiés et comparés au PDF : 135 sans glyphe indéterminé,
  36 avec tolérance sur ces glyphes. Les 795 mesures conservent leurs textes.
- Le PDF et les fichiers structurés ont des empreintes dans le nouveau manifeste.
- L’indexation future doit conserver le contexte des anaphores, réunir les mesures
  coupées entre pages et écarter bandeaux/pieds de page. Aucun index n’étant encore
  construit, cette remarque devient une exigence documentée pour cette étape.

## Vérification locale

Les fichiers sont régénérés depuis les sources éditoriales. Les tests couvrent
les alternatives incomplètes, les paires dépendantes, les branches conditionnelles,
la règle empêchant un 75/100 sans sources de réussir, les refus sans citation et
les extraits/empreintes du corpus. Ils ne remplacent pas une nouvelle lecture
indépendante des modifications éditoriales.
