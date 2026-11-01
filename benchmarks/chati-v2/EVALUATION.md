# Protocole du second benchmark, avant exécution

1er novembre 2026, version **1.0.2 validée** après contre-vérification externe de
la version 1.0.1 et revue finale. Aucun résultat de Chati n’est disponible sur v2.

## Entrées et séparation

Fournir uniquement les `messages` de `questions.jsonl`, avec l’accès habituel de
Chati au corpus. Garder les historiques de CH2-031 à CH2-034 et évaluer seulement
le dernier tour. Ne transmettre ni corrigé, ni sous-sections cibles, ni critères,
ni réponses attendues. Utiliser `research=false` : l’évaluation porte sur le résumé,
pas sur le droit actuel ni la fiabilité des sources Internet.

Après validation externe du corrigé, enregistrer les paramètres effectifs, les
versions et empreintes du modèle/configuration, des prompts, de l’image Docker,
des données source, de l’enrichissement et de l’index. Vérifier les différences
avec `authorship-snapshot.json`. Une modification pour répondre spécifiquement
aux cas v2 annulerait son rôle de test réservé.

Une seule exécution par cas pour le premier score, sans sélectionner le meilleur
de plusieurs essais. Les retries/réparations internes habituels restent ceux du
produit et doivent être signalés. Archiver réponses brutes, messages, statut,
citations, mesures, contexte effectivement fourni, mode retrieval/full, latences
et usages retournés. Toute erreur technique vaut un cas non validé.

## Annotation, sans notes implicites

Le relecteur d’une réponse doit enregistrer explicitement :

- Une note 0, 1 ou 2 et une raison propre à chacune des dimensions exactitude,
  sources, limites et clarté.
- Pour chaque `criteria.id`, sa couverture 0, 0,5 ou 1, avec un extrait de la
  réponse et une justification spécifique. Ne pas recopier une note générale.
- Les erreurs critiques et les éléments de preuve correspondants.
- Les conditions activées, uniquement selon la branche réellement formulée.
- Les affirmations d’absence, leur portée (passages fournis / corpus entier),
  l’élément explicitement demandé et la preuve éventuellement manquée.
- Si les métriques de citations/fidélité sont calculées : un jugement propre à
  chaque lien affirmation–source, bloc et fiche, avec raison vérifiable.

Les critères `resolution` (référent d’un suivi) et `structure` (distinction des
volets) sont évalués séparément des faits. Les critères fusionnés de CH2-001 et
CH2-002 conservent leurs conditions et périmètres sans compter deux fois la même
preuve. Leurs paramètres restent à vérifier séparément dans la justification.
Un critère composite entièrement couvert vaut 1 ; une couverture correcte mais
incomplète vaut 0,5 ; absence ou contradiction vaut 0, avec indication des
composants concernés et signalement séparé des erreurs critiques. Ne pas attribuer
1 à CH2-002 si, par exemple, le taux zéro ou la perpétuité est omis.

Pour CH2-030, un complément fidèle sur une autre garantie d’autonomie est
recevable s’il ne lui attribue pas un seuil non écrit. Il ne remplace pas les deux
bornes comparées. L’absence d’un ID dans le corrigé ne rend pas une citation
vraie automatiquement fautive ; la disjonction décrit la sélection du benchmark.

Une pure clarification de CH2-034 ou un refus pur de CH2-040 peut avoir Sources
non applicable. Enregistrer `clarification` ou `refusal` avec justification. Toute
proposition de fond ajoutée rend ses références évaluables. Ne pas exiger tous
les passages facultatifs, toutes les alternatives ni les deux branches d’un suivi.

## Règle de validation principale

Noter les dimensions selon la grille sémantique 0–2 du premier lot. Le score
normalisé est `100 × somme(notes) / (2 × nombre de dimensions applicables)`.
Un cas est validé si toutes les conditions suivantes sont réunies :

1. Réponse exploitable, score au moins 75/100.
2. Exactitude au moins 1/2 ; Sources au moins 1/2 si applicable.
3. Aucune erreur critique : preuve ou citation fabriquée, chiffre inventé,
   inversion de proposition ou ajout de droit/pouvoir non étayé, résultat supposé
   certain sans preuve, proposition transformée en réalisation acquise.
4. Aucun volet explicitement demandé et disponible dans le corpus n’est rejeté
   par une affirmation d’absence ou une abstention injustifiée de recherche.

Cette dernière condition porte sur **le système complet** : « pas dans les
passages retrouvés » peut être littéralement exact et signaler néanmoins un échec
de recherche. Garder distincts le défaut de couverture et l’hallucination. Ne pas
pousser le générateur à deviner les preuves manquantes.

Les cinq cas partiels CH2-035 à CH2-039 demandent volontairement un paramètre
non fourni. Reconnaître correctement cette limite fait réussir ce volet ; une
absence réelle n’est pas une fausse absence. Omettre la proposition connue qui
est aussi demandée reste une incomplétude. CH2-034 peut réussir avec une clarification.

Publier **cas validés / 40**, les cas non validés avec leurs motifs, et **cas
entièrement complets / 40**. Signaler les omissions silencieuses même si la grille
les laisse passer. Pour la continuité avec les runs v1, on peut publier le score
de l’ancienne règle à côté, clairement nommé « règle historique », sans le
confondre avec la validation principale ci-dessus.

## Métriques et dénominateurs

- **Couverture des critères** : moyenne micro et macro de leurs couvertures.
  Le sous-ensemble factuel utilise `criteria.kind == fact`, sans règle codée par
  numéro de question. Rapporter séparément interprétations, structures, résolutions,
  limitations, refus et clarifications. Les critères peuvent être composites : ne pas prétendre mesurer
  tous les faits atomiques de la réponse.
- **Retrieval** : rappel des groupes de preuves actifs dans le contexte et dans
  les citations ; distinguer avant/après expansion. Les groupes inactifs ne sont
  pas des succès automatiques. Précision sémantique avec annotation de pertinence,
  pas seulement intersection des IDs du corrigé. Publier les dénominateurs.
- **Contexte intégral** : rappel dans le contexte structurellement saturé ou
  renseigné à part ; ne pas en faire une preuve de qualité du retrieval. La
  sélection des citations et la couverture de la réponse restent évaluables.
- **Absences** : distinguer absence exacte, fausse affirmation sur le corpus et
  abstention injustifiée après retrieval. Publier cas et volets touchés.
- **Fidélité et citations** : ne publier de taux sémantiques que si chaque unité
  comptée a sa propre annotation. Une référence existante n’est pas une preuve
  suffisante du contenu ; une référence contribuant partiellement ne justifie
  pas toutes les assertions d’un bloc.
- **Exploitation** : disponibilité, latences médiane/p95, tokens retournés et
  limites de comptabilisation. Ne pas assimiler tokens finaux et coût total.

Publier aussi les résultats par mesure et par sous-section : plusieurs cas
réutilisent la même preuve. Ces regroupements complètent le total sur 40 ; ils
ne transforment pas les cas corrélés en observations indépendantes.

Le premier run reste archivé séparément. Pour comparer des versions, effectuer
au moins trois runs par configuration lorsque c’est possible, avec le même
protocole, et publier la dispersion ainsi que les cas instables. Trois runs ne
garantissent pas à eux seuls la significativité d’un petit écart. Ne pas retenir
uniquement le meilleur run ni prétendre connaître à l’avance le bruit en cas/40.

Le script historique `score_evaluation.py` contient des choix propres à v1,
notamment un sous-ensemble factuel par numéro. Il ne doit pas être repris tel
quel pour cette métrique v2. Le collecteur accepte un dossier de benchmark ; les
outils de notation doivent respecter les annotations explicites ci-dessus.

## Passage à l’exécution

La version, les empreintes et le statut de revue sont mis à jour. Figer le système, puis
collecter les 40 réponses dans un nouveau dossier `benchmarks/chati-v2/runs/`.
La collecte n’a pas été lancée lors de la rédaction du présent lot.

Conserver tout désaccord entre juges avec son arbitrage. Faire confirmer les
cas limites et un échantillon de réponses excellentes par une personne. Si v2
sert ensuite à ajuster les données ou prompts, documenter sa conversion en lot
de développement et réserver un nouveau lot à l’évaluation indépendante.
