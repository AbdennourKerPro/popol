# Revue externe de Chati v2, version 1.0.1

Contre-vérification du 1er novembre 2026 de `benchmarks/chati-v2/` (version `1.0.1-external-review-applied`, schéma 2.2), selon `review-prompt.md`. Revue faite par Claude (Sonnet 5.5), en corpus fermé, sans exécuter Chati et sans modifier aucun fichier d'origine. La revue précédente (`benchmark_review-external.md`) n'est pas modifiée. **Aucun score de Chati n'est donné : aucune réponse de Chati sur ce lot n'existe.**

## Conclusion

**Aucun problème bloquant ne subsiste. Bilan des 40 lignes : 40 cohérents, 0 à corriger, 0 non vérifiable.** Les 3 corrections bloquantes (CH2-011, 018, 007) et les 7 mineures de ma première revue sont traitées, ou leur écartement est justifié de façon recevable. Restent quelques remarques facultatives (ci-dessous) et le gel de la configuration avant le premier run. Le statut du manifeste (`external_review_applied_pending_recheck`) est à mettre à jour par l'auteur après cette lecture.

## Erreurs de ma première revue, reconnues

- **« 41 sous-sections de v1 » était faux.** J'avais compté `s99-ss99`, l'identifiant fictif de MIL-040, comme une sous-section. Recalcul : 39 sous-sections dans les `evidence` de v1, plus `s01-ss11` (distracteur nommé) = **40 sous-sections réelles** exclues, comme l'écrit l'auteur dans `review-decisions.md`.
- **« Bruit d'environ deux cas sur 40 » n'était pas établi.** Je l'avais déduit d'un seul cas instable (MIL-003) sur v1. L'auteur a raison de ne pas fixer de chiffre ; le principe (plusieurs runs, dispersion publiée) est conservé dans `EVALUATION.md`.
- **« Les 16 cas précis demandent tous deux faits » était excessif** : CH2-001, 002 et 009 ne reposent que sur une seule mesure.

## Contrôles refaits sur la version 1.0.1

| Contrôle | Résultat |
|---|---|
| Archive de la version relue | `reviews/1.0.0-self-reviewed/` contient bien les entrées et le corrigé que j'ai relus (empreintes `1f1e1fa9…` et `3e0b4bb3…`, identiques à celles de ma revue). La traçabilité est assurée. |
| Empreintes actuelles | `input_sha256` et `gold_sha256` du manifeste correspondent aux fichiers ; les 5 empreintes du corpus aussi. |
| Cas modifiés | Comparaison champ par champ avec l'archive : **18 cas modifiés** (001, 002, 007, 011, 013, 015, 018, 021, 022, 023, 027, 028, 029, 030, 031, 032, 033, 036), **22 inchangés**. Les cinq cas d'absence 035 à 039 sont inchangés. Aucune modification en dehors de ce que `review-decisions.md` déclare. |
| Disjonction avec v1 | **30 sous-sections réelles** utilisées (29 cibles plus Francophonie en complément facultatif), **aucun chevauchement** avec les `evidence` de v1 ni avec `s01-ss11`, y compris dans les facultatifs, pièges, compléments et branches. |
| Textes, pages | 82 extraits (au lieu de 78) identiques au corpus ; pages déclarées identiques à `verification_pdf`. Contrôle indépendant dans le texte du PDF : 75 passent automatiquement, 7 sont coupés par les bandeaux Google intercalés (001, 006, 007 ×2, 011, 024 ×2) et sont confirmés à la main. Les trois ajouts (`s04-ss01-m002`, `s04-ss01-m003`, `s04-ss09-m007`) et `a02-ss02-b013` sont bien sur leurs pages. |
| Critères | **88 critères** : 67 faits, 5 interprétations, 4 structures, 3 résolutions, 5 limitations, 2 clarifications, 2 refus. Recompté depuis le fichier ; identique au décompte de l'auteur. |
| Entrées | `questions.jsonl` ne contient que `id` et `messages` ; identique aux `messages` du corrigé. |
| Tests | 29 passent (14 pour v2, 15 pour v1). |
| Absences 035 à 039 | Corrigé et fichiers inchangés ; les conclusions de ma première revue (recherche large sur les 966 passages) s'appliquent toujours. |
| Dérive du code | Le snapshot d'auteur concerne 17 fichiers ; aucun n'a changé depuis. Le snapshot ne gèle pas l'image, le modèle, l'index ni la configuration effective : ce gel reste à faire avant le premier run. |

## Traitement de ma première revue

| Remarque | Décision de l'auteur | Mon avis |
|---|---|---|
| B1, CH2-011 | La question demande « la durée associée » ; la reprise littérale et « cursus en quatre ans » sont acceptés ; piège contre un calendrier présenté sans réserve. | **Résolu.** Je proposais d'exiger une mention de l'ambiguïté ; l'auteur ne l'exige pas, ce qui est plus juste : la question ne la demande plus. |
| B2, CH2-018 | L'intérêt attendu est ajouté à la question. | **Résolu.** C02 et `benefits_requested` sont désormais demandés. |
| B3, CH2-007 | La question porte sur « le principe de primauté… pour les normes de climat et de travail » ; m002 et m003 en facultatifs et compléments ; piège sur la portée de « sans harmonisation ». | **Résolu**, par un autre moyen que le mien : la concurrence disparaît, car m003 ne répond plus à la question. |
| CH2-013 | « Quel juge est mentionné pour le contrôle ? » ; piège sur l'objet du contrôle. | **Résolu.** |
| CH2-021 | Question neutre sur la géographie ; piège contre une aire fixée. | **Résolu**, avec une remarque de catégorie (R1). |
| CH2-022 | Question reformulée en « propositions générales sur l'attribution des droits… et quel intérêt » ; pas d'ajout des mesures AAH/quotient/ASF. | **Résolu.** La question ne dépend plus du « foyer » ; l'ASF reste une prestation particulière. |
| CH2-023 | L'intérêt est demandé ; `s04-ss09-m007` ajoutée en complément. | **Résolu**, cohérent avec C03 et `benefits_requested`. |
| CH2-028 | `benefits_requested=false`, C04 en `structure`. | **Résolu.** |
| CH2-029 | « Le devenir du CIR » ; C04 en `structure`. | **Résolu.** |
| CH2-030 | Piège contre le transfert de seuil ; pas d'ajout de `s06-ss03-m003`. | **Écartement recevable** (R3). |
| P1, types de critères | `resolution` et `structure` créés, exclus du sous-ensemble factuel ; CH2-001 et 002 fusionnés. | **Résolu.** 67 faits sur 88 critères. |
| P2, concentration | Résultats par mesure et par sous-section exigés dans `EVALUATION.md`. | **Résolu**, et sans prétendre à l'indépendance. |
| Variance | Au moins trois runs « lorsque c'est possible », dispersion publiée, aucun chiffre de bruit. | **Résolu.** |
| CH2-036, CH2-015 | Piège sur les 200 € ; Concordat en facultatif. | **Résolu** (R4). |
| CH2-033 | Pas d'alternative générale (`s01-ss11-m003`). | **Accord.** |

## Remarques facultatives (aucune ne bloque)

- **R1. CH2-021 change de nature.** La question est devenue « Que propose le résumé au sujet des forages en Méditerranée et de l'extraction minière profonde ? », presque mot pour mot celle de la mesure. Elle figure toujours dans la catégorie « sémantique » (CH2-017 à 024), mais elle mesure maintenant une recherche littérale. Si la comparaison par catégorie avec v1 compte, la déplacer parmi les précises, ou la reformuler par une périphrase qui garde la neutralité géographique.
- **R2. CH2-007 donne les domaines.** La question cite « climat et travail », qui sont les termes de la réponse. Acceptable pour une question précise ; à garder en tête si on compare à v1.
- **R3. CH2-030, risque thématique résiduel.** `s06-ss03-m003` (sous-section de v1) mentionne une garantie d'autonomie à partir de 16 ans, sans seuil. La décision de ne pas l'ajouter est cohérente avec la règle de disjonction (le contrôle 1 du prompt interdit les sources de v1 dans le corrigé). Pour que le piège ne pénalise pas à tort : l'annotation doit considérer comme **recevable** qu'une réponse mentionne cette troisième garantie sans lui attribuer de seuil.
- **R4. CH2-015, politique d'annexes élargie.** Le README précédent limitait les annexes au lexique ; il accepte maintenant le Concordat (`a02-ss02-b013`) en complément facultatif. C'est cohérent avec `NEXT-BENCHMARK.md`, dont la disjonction porte sur les sous-sections de mesures. Remarque : la sous-section d'annexes « Lois, ordonnances et réformes » a déjà servi à v1 pour d'autres blocs ; le bloc lui-même est nouveau.
- **R5. Critères fusionnés (CH2-001, 002).** Un critère composite perd la granularité : une réponse qui omet « taux zéro » ou « dette perpétuelle » ne vaut plus un critère entier. `EVALUATION.md` demande déjà de vérifier les paramètres séparément dans la justification ; c'est à l'annotation de l'appliquer (couverture 0,5 explicitée).
- **R6. `benchmark_review.md`** est marquée historique dans son en-tête et ses comptages décrivent la version 1.0.0 ; sa phrase « La relecture externe … reste à effectuer » est périmée mais clairement qualifiée comme telle.

## Les 40 cas

« Passage » : extrait exact. « Critère » : numéro du contrôle du prompt (1 nouveauté, 2 question, 3 exactitude, 4 groupes, 5 absence, 6 avantages, 7 extraits, 8 protocole). « Inchangé » signifie que le cas est identique à l'archive 1.0.0 et que mon verdict de la première revue est maintenu.

| Cas | Verdict | Critère | Passage exact | Justification propre au cas | Correction minimale |
|---|---|---|---|---|---|
| CH2-001 | cohérent | 3, 4 | « ne seront possibles que si les salariés reprennent l'entreprise » | Critère unique fusionné, qui conserve la condition de reprise et le refus de l'interdiction sans exception. | Aucune (R5). |
| CH2-002 | cohérent | 3, 8 | « transformer la dette qu'elle détient en dette perpétuelle à taux zéro » | Critère unique « dette détenue par la BCE → dette perpétuelle à taux zéro » ; le piège sur la définition générale reste en place. | Aucune (R5). |
| CH2-003 | cohérent | 3, 4 | « Trois échelons clairs : communes, départements, régions. » / « Dotation des communes indexée sur l'inflation. » | Inchangé. | Aucune. |
| CH2-004 | cohérent | 3 | « Interdiction stricte du pantouflage (10 ans minimum) » | Inchangé. | Aucune. |
| CH2-005 | cohérent | 3 | « Rénovation obligatoire des passoires avant location. » | Inchangé. | Aucune. |
| CH2-006 | cohérent | 3, 7 | « Abolition de l'obsolescence programmée + garanties allongées. » | Inchangé ; extrait sur deux pages, retrouvé sur les deux. | Aucune. |
| CH2-007 | cohérent | 2, 3, 4 | « Primauté des normes les plus protectrices (climat, travail). » | La question vise le volet climat/travail, qui ne s'applique qu'à m009 ; m002 (« Non-application des normes européennes incompatibles avec nos engagements. ») et m003 (« Supériorité de la Constitution de la 6e République + principe de non-régression. ») sont facultatives et acceptées en compléments. Le piège sur « sans harmonisation » est ajouté. Pages 23-24 vérifiées. | Aucune (R2). |
| CH2-008 | cohérent | 3 | « 0,7 % du revenu national pour l'aide au développement. » | Inchangé. | Aucune. |
| CH2-009 | cohérent | 3 | « Droit de mourir dans la dignité (avec assistance) et accès aux soins palliatifs inscrits dans la Constitution. » | Inchangé. | Aucune. |
| CH2-010 | cohérent | 3 | « Remboursement du traitement de la ménopause. » | Inchangé. | Aucune. |
| CH2-011 | cohérent | 2, 3 | « Bac professionnel en 4 ans rétabli. » | La question demande « la durée associée » et la réponse de référence reprend le libellé ; « cursus en quatre ans » ou la reprise littérale sont acceptés, un calendrier de mise en œuvre présenté sans réserve est interdit. Internats : « sous condition de ressources ». | Aucune. |
| CH2-012 | cohérent | 3 | « 4 h d'EPS obligatoires + soutien aux STAPS. » | Inchangé. | Aucune. |
| CH2-013 | cohérent | 2, 3 | « Contrôle du juge judiciaire. » | La question dit « quel juge est mentionné pour le contrôle » dans la rubrique ; le piège interdit d'inventer l'objet du contrôle. | Aucune. |
| CH2-014 | cohérent | 3 | « Refus de toute alliance militaire permanente en Asie-Pacifique. » | Inchangé. | Aucune. |
| CH2-015 | cohérent | 3, 4 | « Interdiction aux élus d'assister à des cérémonies religieuses au titre de leurs fonctions. » | Ajout facultatif du Concordat (« régime local qui reconnaît et finance certains cultes en Alsace-Moselle. Le programme l'abroge. »), explicitement sans remplacer le refus général. | Aucune (R4). |
| CH2-016 | cohérent | 3 | « Protection des grands fonds marins et de la haute mer. » | Inchangé. | Aucune. |
| CH2-017 | cohérent | 3, 4 | « On arrête de laisser les entreprises négocier leur sanction en cas de fraude. » | Inchangé. | Aucune. |
| CH2-018 | cohérent | 2, 6 | « On aide les ménages surendettés et on garantit l'accès aux services bancaires de base. » | La question demande maintenant « quel intérêt peut-on en attendre » ; C02 interprétatif et `benefits_requested=true` sont cohérents avec elle. | Aucune. |
| CH2-019 | cohérent | 3, 4 | « Stop à l'étalement urbain. » | Inchangé. | Aucune. |
| CH2-020 | cohérent | 3 | « Interdiction des chasses cruelles, corridas, animaux sauvages dans les cirques. » | Inchangé. | Aucune. |
| CH2-021 | cohérent | 2, 3 | « Moratoire sur les forages en Méditerranée et l'extraction minière profonde. » | Question neutre sur la géographie de l'extraction ; piège contre une aire fixée sans réserve ; réserve verbale non obligatoire. Reprise quasi littérale de la mesure. | Aucune (R1). |
| CH2-022 | cohérent | 2, 4, 6 | « Individualisation et automatisation des droits. » / « Lutte contre le non-recours. » | La question vise les propositions générales sur l'attribution des droits et leur intérêt ; les mesures particulières (ASF, AAH, quotient) ne sont plus des alternatives plausibles. C03 est demandé. | Aucune. |
| CH2-023 | cohérent | 2, 4, 6 | « Revues scientifiques francophones en accès libre. » | « Explique aussi leur intérêt attendu » rend C03 demandé ; `s04-ss09-m007` (« Revue scientifique francophone de haut niveau. ») est un complément qui ne prouve pas l'accès libre. Francophonie est une sous-section nouvelle. | Aucune. |
| CH2-024 | cohérent | 3, 7 | « Aide juridictionnelle augmentée et tribunaux de proximité rétablis. » | Inchangé ; extrait coupé par un bandeau dans le PDF, vérifié. | Aucune. |
| CH2-025 | cohérent | 3, 6 | « Rénovation complète des réseaux d'eau. » / « Modernisation du réseau électrique. » | Inchangé. | Aucune. |
| CH2-026 | cohérent | 3, 6 | « Interdiction de la publicité pour les paris sportifs. » | Inchangé. | Aucune. |
| CH2-027 | cohérent | 3, 8 | « Baisse de la consommation des data centers + autorisation obligatoire. » | C03 « distinguer » est retypé `structure`, hors du sous-ensemble factuel. | Aucune. |
| CH2-028 | cohérent | 2, 6 | « Pêche artisanale et lutte contre la pêche illégale. » | `benefits_requested=false` et C04 en `structure` : la question demande de distinguer les champs, pas leur intérêt. | Aucune. |
| CH2-029 | cohérent | 2, 3 | « Suppression du Crédit d'impôt recherche au profit du public. » | La question demande « que deviendrait le CIR » : plus de mot absent de la source. C04 en `structure`. | Aucune. |
| CH2-030 | cohérent | 1, 3, 4 | « Garantie d'autonomie pour les jeunes (au-dessus du seuil de pauvreté). » / « Garantie d'autonomie (revenu au moins au seuil de pauvreté). » | Gold exact ; nouveau piège contre le transfert d'un seuil à une autre garantie ; C03 en `structure`. | Aucune (R3). |
| CH2-031 | cohérent | 3 | « Interdiction des voyages commerciaux privés. » | C01 retypé `resolution`. | Aucune. |
| CH2-032 | cohérent | 3 | « Refus des fusions forcées. » | C01 retypé `resolution`. | Aucune. |
| CH2-033 | cohérent | 3 | « Titularisation des contractuels + abrogation de la loi de programmation 2021-2030. » | C01 retypé `resolution` ; pas d'alternative générale, justifié. | Aucune. |
| CH2-034 | cohérent | 3, 4, 8 | « Suppression du HCERES + évaluation par les pairs élus. » / « Grands instituts renforcés + suppression de l'ANR. » | Inchangé ; clarification pure, deux branches conditionnelles séparées. | Aucune. |
| CH2-035 | cohérent | 5 | « Isolation de 700 000 logements par an. » | Inchangé ; absence établie. | Aucune. |
| CH2-036 | cohérent | 5 | « On plafonne les frais bancaires. » | Piège ajouté contre la confusion avec le plafond de 200 € ; absence établie. | Aucune. |
| CH2-037 | cohérent | 5 | « Service public de la publication scientifique. » | Inchangé ; absence établie. | Aucune. |
| CH2-038 | cohérent | 5 | « Traité contre l'appropriation des ressources spatiales. » | Inchangé ; absence établie. | Aucune. |
| CH2-039 | cohérent | 5 | « Transparence des sondages et interdiction les jours précédant les élections. » | Inchangé ; absence établie. | Aucune. |
| CH2-040 | cohérent | 3, 4, 8 | « Isolation de 700 000 logements par an. » | Inchangé ; la demande de fabrication est bien traitée comme une donnée à refuser. | Aucune. |

## Limites de ma revue

- **Indépendance partielle.** Je suis le même assistant que celui qui a conçu l'enrichissement d'index, les synonymes et les réglages du produit, et qui a jugé les runs de v1. Mon avis reste celui d'un modèle, sans relecture humaine.
- **Pas d'exécution.** Je n'ai pas exécuté Chati ni calibré les questions sur des réponses réelles. La difficulté et la sensibilité du protocole restent des hypothèses.
- **Absences.** Elles s'appuient sur des recherches par motifs sur les 966 passages, que j'ai complétées par la lecture des résultats. Une formulation sans les termes cherchés pourrait m'échapper.
- **PDF.** J'ai vérifié que le texte de chaque extrait figure sur les pages déclarées, dans le texte extrait du PDF ; je n'ai pas fait de contrôle visuel, et le PDF est une impression du HTML local.
- **Corrections non reportées dans le script.** J'ai comparé les fichiers générés, pas `scripts/build_benchmark_v2.py` ligne à ligne ; la régénération déterministe est vérifiée par les tests de l'auteur, que j'ai exécutés avec succès.
