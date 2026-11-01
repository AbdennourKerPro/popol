# Auto-revue du benchmark Chati v2

> Document historique sur la version 1.0.0. Une première revue externe a ensuite
> été reçue ; les corrections de la version 1.0.1 sont détaillées dans
> [review-decisions.md](review-decisions.md). Les comptages ci-dessous décrivent
> la version initialement relue, pas la version courante.

**1er novembre 2026 — `1.0.0-self-reviewed`.** Revue documentaire par l’agent
Codex qui a rédigé ce lot, après une première génération des fichiers.
Il s’agit d’une **auto-revue**, sans second juge ni validation indépendante.
La relecture externe demandée par l’utilisateur reste à effectuer.

**Conclusion : 40 cas cohérents après les corrections ci-dessous et prêts pour
contre-lecture ; aucun cas de Chati exécuté. Ce n’est pas un score de l’assistant.**

## Contrôles de structure et de sélection

- Recalcul des exclusions depuis toutes les entrées `evidence` de l’ancien
  corrigé : **39 sous-sections exclues**. Ajout conservateur de `s01-ss11`, déjà
  citée comme distracteur, soit 40 sous-sections disponibles avant sélection.
- **29 sous-sections nouvelles**, zéro intersection pour les sources principales,
  facultatives, historiques et conditionnelles. Les six synthèses traversent
  chacune au moins deux nouvelles sous-sections.
- Les trois sous-sections de la section 8 sont toutes exclues. Le lot couvre
  donc sept grandes sections ; aucune couverture fictive de la huitième.
- 40 IDs `CH2-001` à `CH2-040`, 40 questions finales distinctes. Les fichiers
  d’entrée ne comportent que `id` et `messages`, sans corrigé ni catégories.
- Quatre historiques synthétiques de trois messages. Seule la réponse au dernier
  tour est à évaluer ; les sources d’historique restent facultatives.
- Extraits copiés du corpus source, empreintes et pages comparées aux métadonnées
  de vérification existantes. Le PDF n’a pas fait l’objet d’un nouveau contrôle
  visuel page par page dans cette auto-revue. Les réserves de glyphes de
  `data/README.md` restent applicables.
- Cinq dossiers de paramètres absents, vérifiés dans les passages candidats du
  corpus complet mesures + annexes. Les recherches lexicales sont archivées et
  explicitement présentées comme des aides, pas comme des preuves d’absence.
- Aucun alias d’enrichissement utilisé comme texte de référence ; aucune lecture
  de `.env`, aucun appel OpenAI et aucune modification du produit pour ce lot.

## Corrections effectuées pendant l’auto-revue

| Cas | Point détecté | Correction retenue |
| --- | --- | --- |
| CH2-027 | La source dit « consommation » des data centers sans détailler la ressource ou les unités. | La question conserve ce terme, sans restreindre artificiellement la réponse à une métrique énergétique. |
| CH2-030 | Une formulation différente ne prouve pas deux montants différents : « au moins » inclut aussi « au-dessus ». | Corrigé, troisième critère et pièges explicitent la compatibilité et refusent d’imposer une égalité ou une différence de montant. |
| CH2-034 | La réponse de clarification initiale ajoutait une appréciation sur le contenu des deux mesures. | Exemple réduit à une clarification fondée sur l’historique ; les affirmations sur ANR/HCERES restent des branches sourcées séparément. |
| CH2-039 | « Publication » pouvait imposer une distinction réalisation/publication des sondages absente de la mesure. | La question porte sur les sondages sans introduire cette précision. |

## Revue sémantique des 40 cas

Chaque ligne consigne le point propre au cas revu et la limite à conserver. Les
extraits exacts et les liens critère–preuve sont dans `references.md/jsonl`.
« Cohérent » signifie prêt à être relu indépendamment, pas une réussite de Chati.

| Cas | Auto-revue | Vérification et réserve propres au cas |
| --- | --- | --- |
| CH2-001 | Cohérent | La mesure autorise seulement le cas de reprise par les salariés ; le lexique peut définir le LBO mais ne prouve pas l’exception. Aucun ratio de dette exigé. |
| CH2-002 | Cohérent | La dette visée est celle détenue par la BCE et le taux proposé est zéro. La définition générale de dette perpétuelle ne doit pas réintroduire des intérêts dans ce cas. |
| CH2-003 | Cohérent | Les trois niveaux et l’indexation de la dotation sont sur deux mesures distinctes ; aucun montant de dotation exigé. |
| CH2-004 | Cohérent | 200 € pour les dons, dix ans minimum pour le pantouflage. Aucun point de départ ou caractère annuel du plafond ajouté. |
| CH2-005 | Cohérent | 700 000 est un objectif annuel ; la rénovation des passoires précède la location. Aucune grille DPE importée du droit actuel. |
| CH2-006 | Cohérent | Abolition de l’obsolescence, garanties allongées, réparation/réemploi publics ; aucune nouvelle durée ou gratuité universelle inventée. |
| CH2-007 | Cohérent | Veto et normes protectrices sont deux éléments distincts ; le corrigé reprend la portée prudente de la condition sans harmonisation. Pas de pouvoir européen actuel affirmé. |
| CH2-008 | Cohérent | 0,7 % porte sur le revenu national ; Sahel lié aux droits humains. Pas de substitution non sourcée par le PIB ni de conversion en euros. |
| CH2-009 | Cohérent | Les deux droits de fin de vie sont dans une seule mesure ; aucune procédure médicale ou date d’application ajoutée. |
| CH2-010 | Cohérent | Gratuité des protections et remboursement du traitement de la ménopause, sans taux ni restriction inventés. |
| CH2-011 | Cohérent | Bac professionnel quatre ans et internats sous ressources ; seuil absent, non exigé. |
| CH2-012 | Cohérent | Quatre heures et natation obligatoire seulement ; la périodicité des quatre heures n’est pas écrite et n’est pas une exigence cachée. |
| CH2-013 | Cohérent | Les moyens humains/infiltration et le juge judiciaire proviennent de deux mesures ; pas de procédure d’autorisation déduite. |
| CH2-014 | Cohérent | Dialogue mondial compatible avec non-alignement ; refus limité aux alliances militaires permanentes en Asie-Pacifique. |
| CH2-015 | Cohérent | La restriction des élus est exercée au titre de leurs fonctions ; aucune interdiction de pratique privée déduite. |
| CH2-016 | Cohérent | Pôles comme biens communs, grands fonds et haute mer protégés : deux mesures de la rubrique internationale, sans souveraineté française ajoutée. |
| CH2-017 | Cohérent | Fin de négociation des sanctions et publicité de toutes les aides ; transparence ne veut pas dire suppression des aides. |
| CH2-018 | Cohérent | La mesure mentionne aide au surendettement et accès aux services de base ; l’exclusion bancaire est un intérêt déduit, pas une remise de dette garantie. |
| CH2-019 | Cohérent | La paraphrase cible l’étalement urbain ; pas une interdiction de tous les logements neufs. |
| CH2-020 | Cohérent | Élevage/commerce de fourrure et animaux sauvages dans les cirques ; ne pas généraliser à tout animal domestique ou tout élevage. |
| CH2-021 | Cohérent | Moratoire, forages méditerranéens et extraction minière profonde ; aucune durée ou interdiction mondiale de tous les forages. |
| CH2-022 | Cohérent | Individualisation/automatisation et non-recours sont deux mesures ; bénéfices interprétés, pas suppression garantie du problème. |
| CH2-023 | Cohérent | Service public et revues francophones en accès libre ; la revue francophone de haut niveau mentionnée ailleurs ne suffit pas seule à prouver l’accès libre. |
| CH2-024 | Cohérent | Aide augmentée, proximité et procédures courantes gratuites ; aucune universalisation à tout avocat ou toute procédure. |
| CH2-025 | Cohérent | Trois volets doivent rester distincts ; 700 000 ne concerne que les logements. Aucun résultat chiffré sur factures ou fuites. |
| CH2-026 | Cohérent | Taxe pour sport amateur, interdiction publicitaire et associations au primaire ont chacun leur preuve ; financement explicite, autres avantages prudents. |
| CH2-027 | Cohérent après correction | Deux sous-sections, orbites et data centers ; autorisation obligatoire n’est pas une interdiction générale et la consommation n’est pas chiffrée. |
| CH2-028 | Cohérent | Contexte méditerranéen indispensable aux mesures courtes ; sécurité civile n’est pas une force militaire. Pêche, dépollution et secours sont séparés. |
| CH2-029 | Cohérent | Transparence des aides, CIR au profit du public, pairs élus pour l’évaluation ; définition HCERES facultative, pas preuve de sa suppression. |
| CH2-030 | Cohérent après correction | Les bornes « au-dessus » et « au moins » sont différentes mais compatibles ; aucun montant, cumul ou inégalité effective entre prestations déduit. |
| CH2-031 | Cohérent | Le contexte résout le voyage dans l’espace ; interdiction des voyages commerciaux privés, pas des missions publiques ni des vols aériens. |
| CH2-032 | Cohérent | L’historique pose la coopération des communes, le dernier tour teste le refus des fusions forcées ; pas de procédure juridique ajoutée. |
| CH2-033 | Cohérent | Le secteur est la recherche ; titularisation des contractuels requise. L’abrogation de la programmation est un complément, pas une obligation hors demande. |
| CH2-034 | Cohérent après correction | Clarification pure recevable sans mesure ; branches ANR et HCERES activées séparément. Le renforcement des grands instituts ne décrit pas un transfert exhaustif des missions de l’ANR. |
| CH2-035 | Cohérent | Objectif connu et économie individuelle non calculable : ni données énergétiques du ménage ni formule de calcul dans le corpus. Les 90 m² sont une donnée de la question. |
| CH2-036 | Cohérent | Plafonnement bancaire sans plafond mensuel chiffré ; les plafonds de dons et indemnités d’autres rubriques ne le définissent pas. |
| CH2-037 | Cohérent | Publication publique sans enveloppe spécifique. L’augmentation globale de l’investissement ou l’abrogation de la programmation ne fournit pas ce montant dédié. |
| CH2-038 | Cohérent | Traité spatial proposé sans signataires identifiés ; ni adoption ni non-signature mondiale prouvée par le résumé. |
| CH2-039 | Cohérent après correction | Le nombre de jours n’est pas donné ; ne pas importer une règle électorale actuelle ni imposer une distinction publication/réalisation. |
| CH2-040 | Cohérent | Refus d’une fausse réalisation et d’une citation fabriquée ; objectif réel facultatif si refus pur, sourcé s’il est développé. Réfuter les 1 200 € n’est pas les affirmer. |

## Évaluation et limites de cette revue

Le protocole v2 ajoute une condition d’exactitude et une condition contre les
abstentions injustifiées sur un volet demandé et présent, conformément à la
contre-expertise du premier run. Il demande des annotations explicites plutôt
que des notes parfaites par défaut. Les critères sont typés pour éviter de
sélectionner les faits d’après leurs numéros de cas.

Les contrôles automatiques portent sur séparation entrée/corrigé, provenance,
disjonction, branches, absence de citation forcée pour clarification/refus et
reproduction déterministe. Ils **ne prouvent pas** l’exactitude sémantique des
40 corrigés ni les absences globales. Ces points doivent être contre-vérifiés.
Commande exécutée : `.venv/bin/python -B -m pytest tests/test_benchmark_v2.py
tests/test_benchmark.py -q` — **26 contrôles réussis**, dont 11 pour le nouveau lot
et 15 pour les règles/provenances du premier. Aucun appel de modèle.

Le modèle a déjà accès au même corpus et ses enrichissements ont été préparés
pour tout le programme. Ce lot est inédit par ses questions et sous-sections
par rapport au **corrigé v1**, pas une preuve de non-exposition aux textes. La
publication et les revues du corrigé interdisent de le considérer comme encore
réservé si l’application est réglée dessus avant sa première exécution.
