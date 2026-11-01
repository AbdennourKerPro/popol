# À faire après la conception de Chati : second benchmark inédit

**Exigence à conserver avant de conclure sur la qualité de l’assistant.**
Le benchmark `chati-v1` sert à concevoir et ajuster la recherche, les consignes et
la génération des réponses. Après cette phase, créer un nouveau benchmark portant
sur **un nouveau lot de sous-sections de mesures**, pour évaluer la généralisation.
Reformuler simplement les 40 questions actuelles ne suffit pas.

Ordre prévu :

1. Concevoir et ajuster l’assistant avec le lot actuel, puis figer la configuration
   évaluée et la version du corpus.
2. Recenser les sous-sections des mesures déjà utilisées dans `chati-v1`, en
   incluant les sources principales, alternatives et facultatives de
   `references.jsonl` (entrées `evidence` dont `type` vaut `mesure`).
3. Sélectionner des sous-sections absentes de cet ensemble, puis rédiger des
   questions inédites : questions précises, reformulations, synthèses entre
   nouvelles sous-sections, suivis et limites du corpus. Les références de lexique
   peuvent être réutilisées pour expliquer un terme ; les mesures évaluées doivent
   appartenir au nouveau lot.
4. Faire relire indépendamment le corrigé et ses références, avant l’exécution.
5. Exécuter l’assistant figé, sans utiliser le nouveau corrigé pour régler ses
   consignes ou sa recherche. Conserver les résultats séparément de `chati-v1`.

Le **1er novembre 2026**, le second lot a été créé dans
[chati-v2](chati-v2/README.md) : 40 cas sur 29 sous-sections cibles disjointes. Une
[auto-revue documentaire](chati-v2/benchmark_review.md), deux revues externes et
une [revue finale](chati-v2/benchmark_review-final.md) ont été faites.
La version **1.0.2 est validée pour exécution** : 30 sous-sections avec le
complément facultatif ajouté, zéro chevauchement avec v1. Le gel de la
configuration effectivement évaluée a ensuite été enregistrée dans les runs.
Deux exécutions ont depuis été réalisées le 1er novembre : le second passage
obtient **40/40 validés et 40/40 complets**, selon un audit machine distinct du
premier. Le [rapport de répétition](chati-v2/runs/2026-11-01-repeat-01/REPORT.md)
et le [registre](chati-v2/executions.json) conservent les résultats et leurs limites.
Une [interface de relecture humaine](../review/README.md) est disponible.

Si le second lot sert ensuite à des ajustements, il devient lui aussi un lot de
développement ; une évaluation indépendante ultérieure demandera un nouveau lot inédit.
