# À faire après la conception de Milit’IA : second benchmark inédit

**Exigence à conserver avant de conclure sur la qualité de l’assistant.**
Le benchmark `militia-v1` sert à concevoir et ajuster la recherche, les consignes et
la génération des réponses. Après cette phase, créer un nouveau benchmark portant
sur **un nouveau lot de sous-sections de mesures**, pour évaluer la généralisation.
Reformuler simplement les 40 questions actuelles ne suffit pas.

Ordre prévu :

1. Concevoir et ajuster l’assistant avec le lot actuel, puis figer la configuration
   évaluée et la version du corpus.
2. Recenser les sous-sections des mesures déjà utilisées dans `militia-v1`, en
   incluant les sources principales, alternatives et facultatives de
   `references.jsonl` (entrées `evidence` dont `type` vaut `mesure`).
3. Sélectionner des sous-sections absentes de cet ensemble, puis rédiger des
   questions inédites : questions précises, reformulations, synthèses entre
   nouvelles sous-sections, suivis et limites du corpus. Les références de lexique
   peuvent être réutilisées pour expliquer un terme ; les mesures évaluées doivent
   appartenir au nouveau lot.
4. Faire relire indépendamment le corrigé et ses références, avant l’exécution.
5. Exécuter l’assistant figé, sans utiliser le nouveau corrigé pour régler ses
   consignes ou sa recherche. Conserver les résultats séparément de `militia-v1`.

La sélection précise et les questions ne sont pas créées maintenant : ce document
est le rappel de l’étape à réaliser **après la conception**. Si le second lot sert
ensuite à des ajustements, il devient lui aussi un lot de développement ; une
évaluation indépendante ultérieure demandera un nouveau lot inédit.
