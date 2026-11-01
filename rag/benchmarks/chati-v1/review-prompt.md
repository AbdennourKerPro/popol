# Prompt pour la vérification indépendante du benchmark

Tu vérifies un benchmark de 40 questions destiné à Chati, un assistant RAG
qui explique un résumé de programme politique. Tu dois auditer le benchmark,
pas répondre aux questions comme si tu étais l’assistant testé.

La version 0.2.1 contient les corrections des deux premières revues. Lis aussi
`benchmark_review-v0.2.md` et la section 0.2.1 de `review-decisions.md` pour
recontrôler les six ajustements mineurs, sans prendre leur justification pour
une preuve de validité.

Fichiers à consulter :

- `benchmarks/chati-v1/references.md` ou `references.jsonl` : corrigé proposé.
- `benchmarks/chati-v1/questions.jsonl` : véritables entrées du système testé.
- `benchmarks/chati-v1/README.md` : périmètre et grille de notation.
- `benchmarks/chati-v1/manifest.json` : version du corpus.
- `data/structured/mesures.jsonl` : toutes les mesures et leurs références.
- `data/structured/programme.json` : hiérarchie complète et annexes.
- `data/structured/annexes.jsonl` : blocs d’annexe citables avec leurs IDs et pages.
- Si disponible, `data/source/programme-lfi.html` et
  `assets/Programme-Mélenchon-LFI.pdf` pour contrôler l’extraction.

Travaille en corpus fermé. N’utilise pas le web ni tes connaissances politiques
ou juridiques pour compléter les réponses. Le statut officiel du résumé et la
vérité de ses affirmations ne sont pas établis ici : l’objet est la fidélité au
corpus fourni. Ne confonds pas une proposition avec le droit en vigueur.

Pour chacun des 40 cas :

1. Vérifie que la question est compréhensible et correspond à sa catégorie.
2. Vérifie l’existence et le contenu exact des mesures citées, leur section et
   les pages indiquées. Si tu ne peux pas consulter le PDF, indique « pages non
   vérifiées » ; ne prétends pas les avoir contrôlées.
3. Examine si les critères et la réponse de référence découlent des sources.
   Distingue une proposition explicite, un objectif attendu et une interprétation.
4. Détecte les hypothèses non sourcées, les glissements de sens, les montants ou
   délais inventés et les avantages présentés à tort comme démontrés.
5. Recherche les autres sources qui permettraient une réponse valide. Vérifie
   que la notation ne pénalise pas injustement une autre formulation ou sélection.
6. Pour les questions insuffisamment documentées, vérifie l’absence d’information
   dans le corpus complet, annexes comprises. Pour MIL-035, ne réutilise pas un
   barème fiscal à cinq tranches comme s’il était le barème proposé à 14 tranches.
7. Pour les conversations, lis l’historique fourni et contrôle les pronoms,
   les changements de sujet et les ambiguïtés.
8. Vérifie que les erreurs à éviter et la grille sont applicables sans exiger
   artificiellement une citation sur une clarification ou un simple refus.
9. En schéma 2.0, vérifie les alternatives de chaque groupe, leurs cardinalités
   et conditions : plusieurs IDs dans une alternative forment une preuve conjointe,
   pas plusieurs exemples. Les `reference_ids` ne sont pas tous obligatoires.
   Vérifie la séparation `must_include`, `accepted_additions` et
   `conditional_expectations`, ainsi que la condition de réussite sur les sources.

Ne te contente pas d’approuver le corrigé parce que ses extraits semblent
cohérents : confronte-le aux fichiers du corpus. Si une pièce n’est pas fournie,
précise les vérifications impossibles et les conclusions qui restent provisoires.

Rends :

- Un tableau de **40 lignes**, une par ID : verdict (`validé`, `à corriger`,
  `non vérifiable`), problème précis, références justificatives et correction.
- Une liste des cas trop proches ou trop ambigus et des domaines insuffisamment
  représentés.
- Les corrections proposées aux questions, critères et groupes de preuves,
  sans remplacer silencieusement le texte des mesures.
- Un avis sur la grille : sources alternatives, cas sans réponse, avantages
  attendus et erreurs critiques.

Une réponse de référence est un exemple, pas une chaîne exacte obligatoire.
N’accorde pas de validation indépendante à un point que tu n’as pas vérifié.
