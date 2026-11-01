# Revue finale du benchmark Chati v0.2.1-reviewed (40 cas)

Troisième contrôle indépendant, réalisé le 31 octobre 2026 en corpus fermé, après
application des corrections de `benchmark_review-v0.2.md`.

**Verdict : 40 cas validés, 0 à corriger, 0 non vérifiable.** Le corrigé peut être
considéré comme relu. Une remarque facultative subsiste sur MIL-023 (voir plus bas).

## Ce qui a été vérifié

- **Corpus inchangé** : `mesures.jsonl`, `annexes.jsonl`, `programme.json`, le HTML et
  le PDF ont les mêmes empreintes que lors de la seconde revue.
- **Périmètre des changements** : comparaison complète du corrigé v0.2 avec la v0.2.1.
  Seuls 8 cas ont changé : les six corrections demandées (014, 020, 023, 029, 034, 035)
  et les deux remarques facultatives (018, 019). Les 32 autres cas sont identiques à
  la version validée lors de la seconde revue.
- **Cohérence du corrigé** : messages identiques entre `questions.jsonl` et
  `references.jsonl`, chaque ID cité a son extrait et chaque extrait est cité, chaque
  groupe conditionnel a sa branche dans `conditional_expectations`, les `minimum` sont
  valides. Aucune anomalie.
- **Pages** : les 131 extraits sont sur leurs pages annoncées. Il y en a un de moins
  qu'en v0.2, car s01-ss16-m005 a été retiré. 121 sont retrouvés automatiquement ; les
  10 autres sont exactement les extraits déjà confirmés à la main lors de la seconde
  revue (bandeaux Google intercalés), avec les mêmes IDs et les mêmes pages.
- **Tests** : `python -B -m unittest discover -s tests` passe (15 tests, dont 4
  nouveaux sur les corrections de la v0.2.1).

## Contrôle des corrections

| ID | Correction demandée | Constat |
|---|---|---|
| 014 | Ne plus exiger les missions d'utilité publique. | Fait : ce sont désormais un complément. Les critères obligatoires correspondent à la question. |
| 018 | (Facultatif) Parler d'intérêt possible plutôt que d'objectif. | Fait. |
| 019 | (Facultatif) Formulation de la réponse de référence ; s03-ss07-m002 ne porte pas sur le revenu. | Fait : « On peut y voir… ». m002 est retiré du groupe « Levier sur le revenu » et une note explique pourquoi. |
| 020 | Exiger le constat que le fonds n'est pas détaillé ; couvrir les distracteurs « cours d'eau » et « relocalisation ». | Fait : nouveau critère obligatoire et deux erreurs nommant s03-ss09-m011/m012 et s03-ss01-m010/s01-ss16-m001. |
| 023 | Reformuler sans le sigle et sans annoncer les rubriques ; corriger `benefits_requested`. | Fait. La nouvelle question (« structures protégées », « vrais salariés ») ne reprend plus le texte de la mesure. Elle exige le statut de salarié et la précision qu'il s'agit des ESAT, sans généraliser. SMIC et droits syndicaux deviennent des compléments, et `benefits_requested` vaut `false`. Le recoupement avec MIL-026 est assumé et justifié. |
| 029 | Retirer la commande publique. | Fait : s01-ss16-m005 est retiré des alternatives et des extraits. Le test `test_public_procurement_does_not_count_as_tax_or_aid` le vérifie. |
| 034 | Mesurer la recherche dans la réponse conditionnelle. | Fait, et mieux que ma suggestion. Trois groupes sont activés séparément selon ce que la réponse affirme (places en crèche, tarifs, logements étudiants), ce qui évite d'exiger les deux domaines quand un seul est développé. Ils restent inactifs pour une simple clarification. |
| 035 | N'exiger que les paliers utilisés dans l'illustration. | Fait. Le constat d'impossibilité du calcul avec les 14 tranches reste obligatoire. |

La recommandation sur la traçabilité de la non-applicabilité de « Sources » est
reprise dans le protocole d'enregistrement des résultats. C'est la bonne place : le
calculateur ne peut pas juger lui-même si une réponse affirme des faits.

## Remarque facultative

**MIL-023** : la formule « vrais salariés » peut aussi faire remonter s01-ss11-m002
(« Présomption de salariat pour les plateformes (Uber, etc.) »). C'est un bon
distracteur pour un cas sémantique. Une réponse qui s'en servirait échouerait déjà sur
l'exactitude, mais on peut l'ajouter explicitement aux erreurs à éviter pour faciliter
la notation. Cette remarque ne bloque pas la validation.

## Limites qui restent valables

- **Couverture partielle** : 33 sous-sections sur 80. Aucun cas sur l'Union européenne,
  l'école, le climat et la planification, l'outre-mer ou la vie politique. C'est une
  limite documentée : le second lot inédit reste nécessaire avant toute conclusion
  générale sur l'assistant.
- **Cas publics** : les 40 cas ont servi à la conception et à trois relectures. Ils ne
  constituent pas un jeu de test indépendant si les consignes de l'assistant sont
  ajustées dessus.
- **PDF** : c'est une impression de la copie HTML locale. Les pages sont vérifiées pour
  cette impression, pas par rapport au Google Doc d'origine.
- **Seuil de réussite** : 75/100, avec Sources ≥ 1 et sans erreur critique. Il reste à
  réviser après une première exécution, comme le prévoit le README.
