> Amendement postérieur aux runs, 1er novembre 2026 — version 1.0.3-user-amended.
> L’utilisateur précise que « sans harmonisation » concerne uniquement les
> élargissements. Cette instruction remplace la réserve grammaticale antérieure
> de CH2-007. Le corrigé, son piège et ses consignes sont rectifiés ; la citation
> source et les questions restent inchangées. Premier passage : 1/2 en exactitude
> et C01 à 0,5 maintenus ; second : 2/2 et C01 à 1. Voir
> [amendement et empreinte approuvée](amendment-CH2-007.json). Les anciennes
> versions sont archivées ; cette correction ciblée ne vaut pas nouvelle revue
> humaine des 40 réponses. Les décisions historiques ci-dessous sont conservées.

# Traitement de la première revue externe

> Historique du traitement en version 1.0.1. La seconde revue externe a depuis
> confirmé les corrections ; la [revue finale](benchmark_review-final.md) valide
> la publication 1.0.2 sans changement sémantique du corrigé.

1er novembre 2026. Version relue : `1.0.0-self-reviewed`. Version corrigée :
**`1.0.1-external-review-applied`**, schéma 2.2.

La [revue externe](benchmark_review-external.md) est conservée intacte. Les entrées,
le corrigé, le manifeste et les rapports générés initiaux sont archivés dans
[reviews/1.0.0-self-reviewed/](reviews/1.0.0-self-reviewed/manifest.json).
Les corrections sont reportées dans `scripts/build_benchmark_v2.py` et les fichiers
ont été régénérés. Aucun cas n’a été exécuté sur Chati. La version corrigée doit
encore être contre-vérifiée ; elle n’est pas déclarée approuvée par le relecteur.

## Décisions sur les remarques bloquantes et les dix cas signalés

| Référence | Décision | Correction ou justification |
| --- | --- | --- |
| B1 / CH2-011 | Acceptée avec nuance | La question demande désormais la durée associée au bac professionnel, sans suggérer un délai de mise en œuvre. Réponse littérale et piège sur le calendrier. La lecture usuelle « cursus en quatre ans » reste recevable : imposer une déclaration d’ambiguïté non demandée ajouterait une exigence inutile. |
| B2 / CH2-018 | Acceptée | L’intérêt attendu est maintenant explicitement demandé ; le critère interprétatif et `benefits_requested=true` deviennent cohérents avec la question. |
| B3 / CH2-007 | Acceptée avec précision de la question | Le volet normes porte désormais spécifiquement sur climat et travail. Les mesures m002/m003 sont ajoutées en facultatif et compléments acceptés, mais ne remplacent pas la preuve m009 de ce volet précis. Un piège interdit de trancher excessivement la portée de « sans harmonisation ». La suggestion seule « au moins m009 » n’aurait pas résolu l’ambiguïté de la question initiale. |
| CH2-013 | Acceptée | La question demande quel juge est mentionné dans la rubrique. Le corrigé n’attribue pas un objet précis au contrôle et le piège sans objet est remplacé par une interdiction d’inventer procédure ou actes contrôlés. |
| CH2-021 | Acceptée | Question géographiquement neutre pour l’extraction profonde ; un piège interdit d’en affirmer une aire méditerranéenne ou mondiale non précisée. Pas d’obligation de réserve verbale si la réponse reprend simplement le libellé sans extension. |
| CH2-022 | Problème accepté, ajout de sources anciennes écarté | La question ne demande plus des droits « moins dépendants du foyer » mais les changements généraux de l’attribution des droits et leur intérêt. Les mesures propres à l’AAH ou au quotient conjugal ne prouvent pas l’automatisation générale et appartiennent aux sous-sections exclues. L’ASF est également un cas de prestation particulière, non une alternative au dispositif général. Les compléments vrais ne deviennent pas des erreurs ; ils ne remplacent pas les éléments demandés. |
| CH2-023 | Acceptée, autre option retenue | L’intérêt est explicitement demandé plutôt que supprimé des critères. La revue francophone de haut niveau (`s04-ss09-m007`) est ajoutée en complément ; elle ne prouve pas l’accès libre. Cet ajout porte à 30 le nombre total de sous-sections, dont 29 cibles et une uniquement facultative. |
| CH2-028 | Acceptée | `benefits_requested=false` ; le critère de distinction des trois champs est de type `structure`, et non un avantage à expliquer obligatoirement. |
| CH2-029 | Acceptée | La question parle du « devenir » du CIR et demande ce qu’il deviendrait, plutôt que d’annoncer une réorientation. Le critère conserve la suppression au profit du public, sans accepter une simple modification non définie comme équivalent. La distinction des registres est de type `structure`. |
| CH2-030 | Piège accepté, ajout ancien écarté | Ajout d’un piège contre le transfert de seuil entre garanties. La mesure dès 16 ans ne donne pas de seuil, n’est pas une alternative aux deux bornes précisément comparées et appartient à une sous-section v1 exclue. L’ajouter en facultatif violerait la règle de disjonction sans améliorer la preuve. Le critère de comparaison est retypé `structure`. |

## Protocole, métriques et remarques facultatives

| Référence | Décision | Suite |
| --- | --- | --- |
| P1 — doublons CH2-001/002 | Acceptée | Un seul critère factuel dans chaque cas, avec conservation de l’exception LBO et du périmètre BCE, de la perpétuité et du taux zéro. Fusionner ne dispense pas de vérifier les paramètres dans l’annotation. |
| P1 — structure et résolution | Acceptée | Types `resolution` pour le premier critère de CH2-031/032/033 ; `structure` pour le dernier de CH2-027/028/029/030. Ils restent évalués mais sont exclus du sous-ensemble factuel. |
| P2 — répétition des preuves | Acceptée | Le protocole exige des résultats par mesure et par sous-section en complément du total. Les cas ne sont pas présentés comme indépendants. Les répétitions testent différents comportements ; elles restent visibles. |
| Variance | Principe accepté, quantité non établie écartée | Prévoir au moins trois runs par configuration pour les comparaisons lorsque possible et publier la dispersion. Aucun « bruit d’environ deux cas » n’est établi par une estimation documentée ici ; trois runs ne garantissent pas la significativité d’un petit écart. Le premier run restera archivé séparément. |
| Difficulté des questions précises | Limite documentée, pas de durcissement arbitraire | Les catégories sont conservées pour une comparaison descriptive avec v1. L’affirmation selon laquelle tous les cas précis demandent exactement deux faits n’est pas littérale : notamment CH2-001 et 002 ont désormais chacun un critère composite. La difficulté n’a pas été calibrée sur des réponses ; aucun réglage ni essai n’est effectué à partir de cette critique. |
| CH2-036 — plafond de 200 € | Acceptée | Piège explicite contre la confusion avec les dons aux partis. |
| CH2-015 — Concordat | Acceptée en contexte facultatif | Ajout de `a02-ss02-b013`. L’ancienne politique locale du lot « lexique seulement » est élargie aux annexes non lexicales uniquement facultatives ; la disjonction de NEXT-BENCHMARK porte sur les sous-sections des mesures, qui reste intacte. Le cas local ne remplace pas le refus général du financement public des cultes. |
| CH2-033 — secteur et titularisation générale | Pas d’ajout de l’alternative générale | L’historique et le corrigé visent la recherche. Une mesure générale de fonction publique ne précise pas ce secteur et se trouve dans une sous-section conservatoirement exclue. La résolution est désormais typée séparément. |
| CH2-034 — clarification | Accord, inchangé | Aucun groupe obligatoire dans une clarification pure ; branches ANR et HCERES séparées. |
| Gel de configuration | Accord, inchangé | Le snapshot d’auteur ne remplace pas le gel du modèle/image/index/configuration effectifs avant le premier run. |
| Total de 41 sous-sections exclues annoncé dans la revue | Non reproduit pour les sous-sections réelles | Les entrées `evidence` excluent 39 sous-sections ; les autres mentions d’IDs réels ajoutent seulement `s01-ss11`, soit 40. Le seul ID nommé absent du corpus est `s99-ss99-m999`, exemple fictif : sa pseudo-sous-section ne compte pas parmi les 80 sous-sections existantes. La liste explicite et les tests font foi. |

## Vérifications après corrections

- Toujours **40 entrées**, répartition 16/8/6/4/5/1 inchangée, sources canoniques
  et corpus non modifiés. V1 et la revue externe ne sont pas réécrits.
- **30 sous-sections réelles**, zéro chevauchement avec les sources v1 ou la
  sous-section conservatoirement exclue. Sept grandes sections couvertes.
- **88 critères** : 67 faits, 5 interprétations, 4 structures, 3 résolutions,
  2 clarifications, 5 limitations et 2 refus. Ce sont des critères, pas 88 faits
  atomiques indépendants. Aucune métrique de réponse n’est calculée ici.
- **82 occurrences d’extraits** copiés du corpus et liées à leurs pages déclarées.
  Les trois nouvelles preuves de mesures sont de sous-sections déjà nouvelles,
  dont Francophonie ajoutée ; le Concordat est une annexe facultative.
- **29 tests réussis** : 14 sur le nouveau lot et 15 sur les règles/provenances v1.
  Ils vérifient aussi que les compléments ne remplacent pas une preuve plus
  spécifique, que les nouveaux types ne gonflent pas les faits, que les entrées
  relues sont archivées et que la régénération est déterministe.

Commande : `.venv/bin/python -B -m pytest tests/test_benchmark_v2.py tests/test_benchmark.py -q`.

Les documents de présentation, protocole, prompt de relecture et manifeste
désignent maintenant la version corrigée. La contre-vérification des choix
sémantiques et des corrections reste à faire avant l’exécution.
