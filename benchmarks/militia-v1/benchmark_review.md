# Audit du benchmark Milit'IA v0.1.0-draft (40 cas)

Relecture indépendante du corrigé, réalisée le 31 octobre 2026 en corpus fermé.

Les preuves citées sont fidèles au corpus et leurs pages sont exactes. En revanche,
**22 cas sur 40 sont à corriger**, principalement parce que la notation pénaliserait
d'autres réponses pourtant correctes et sourcées. Aucun cas n'est classé
« non vérifiable », car toutes les pièces sont présentes.

## Ce qui a été vérifié

Le travail porte uniquement sur les fichiers du dépôt, sans web ni connaissances extérieures.

- **Empreintes** : le HTML, `mesures.jsonl` et le PDF ont les mêmes empreintes SHA-256
  que celles du manifeste.
- **Extraits cités** : les 68 extraits du corrigé (61 mesures différentes) ont le même
  texte, la même sous-section et les mêmes pages que dans `mesures.jsonl`. Les 61 textes
  se retrouvent aussi dans le HTML source. Tous les IDs de `references.jsonl` existent.
- **Pages, contrôlées indépendamment** : chaque page du PDF a été extraite avec
  `pdftotext`, sans réutiliser le vérificateur du dépôt. Les 68 extraits sont sur les
  pages annoncées.
  - 64 sont retrouvés automatiquement. Il faut tolérer les ligatures « fi », « ff »,
    « fl », que le PDF rend par un seul caractère illisible (« �n de Parcoursup »).
  - 4 sont confirmés en lisant le texte brut, parce qu'un bandeau Google
    (« Signaler un abus », « Mis à jour automatiquement… ») s'insère au milieu de la
    mesure : s01-ss20-m006 (p. 11), s03-ss09-m001 (p. 21), s08-ss01-m007 (p. 40) et
    s05-ss02-m001, qui est réellement coupée entre les pages 27 et 28.
- **Absences d'information** : recherche dans les 795 mesures, le préambule et les deux
  annexes (lexique et textes de loi). Les passages d'annexe utiles sont bien dans le PDF :
  barème p. 42, réduflation p. 46, loi de 2023 p. 55, loi ORE p. 57, convention sur les
  droits de l'enfant p. 59.

**Ce qui reste provisoire** : le PDF est une impression Firefox de la copie HTML locale
(pied de page `file:///tmp/programme-lfi.html`, 31/10/2026 15:14). Le contrôle des pages
confirme la mise en page de cette impression, pas sa fidélité au Google Doc d'origine.
Le statut officiel du résumé et la véracité de son contenu ne sont pas évalués, comme prévu.

## 1. Tableau des 40 cas

| ID | Verdict | Problème précis | Références (pages vérifiées) | Correction |
|---|---|---|---|---|
| 001 | validé | Aucun. | s01-ss01-m001, m002 p. 2 | Facultatif : ajouter comme erreur « reprendre les seuils du barème à 5 paliers du lexique ». |
| 002 | validé | L'annexe des textes de loi est une autre source valable : « loi du 14 avril 2023… Le programme l'abroge pour revenir à 60 ans » (p. 55). Elle ne mentionne pas les 40 annuités. | s01-ss14-m001 p. 8 | Accepter l'annexe pour l'abrogation et les 60 ans. |
| 003 | à corriger | « Développer RIC » est ambigu : développer le sigle ou le dispositif ? Le sens du sigle n'est pas demandé. Le texte dit « révoquer, proposer ou abroger **des lois** » : une réponse pourrait glisser vers « révoquer des élus ». | s02-ss01-m009, m012 p. 12 | Rendre le sens du sigle facultatif. Ajouter comme erreur : « affirmer que le RIC permettrait de révoquer des élus ». |
| 004 | validé | D'autres mesures sont pertinentes : m012 (procédures bâillons) et m013 (protection des journalistes) pour la protection des rédactions ; m004 (séparation des infrastructures et des contenus) pour la concentration. | s02-ss04-m002, m006 p. 13 ; m013 p. 13-14 | Ajouter m004, m012 et m013 en `optional_ids`. |
| 005 | validé | Le piège « nucléaire militaire » est réel : s04-ss03-m002, « alternatives au nucléaire », dans la rubrique Défense. | s03-ss04-m001, m002 p. 19 | — |
| 006 | validé | Le leurre « deux heures trente » vient d'une connaissance externe, pas du corpus. | s03-ss03-m007 p. 18 | Généraliser : « remplacer 4 h par toute autre durée ». |
| 007 | validé | — | s04-ss03-m001 p. 24 | — |
| 008 | à corriger | La question porte sur le rôle de l'ONU et les interventions. Trois mesures pertinentes manquent : m014 « Force d'intervention écologique sous l'ONU », m013 « Solutions politiques sous l'égide de l'ONU », m011 « Réforme du Conseil de sécurité ». | s04-ss04-m008, m009 (+ m011, m013, m014) p. 25 | Ajouter m011, m013 et m014 en facultatif. Ajouter comme erreur : « présenter la force écologique comme une force militaire ». |
| 009 | à corriger | La mesure dit littéralement « remboursement intégral ». L'erreur « en déduire un remboursement inconditionnel… » sanctionne donc une paraphrase fidèle, et elle est subjective. La réponse de référence fait de « 100 % Sécu » une partie du projet de reconstruction hospitalière, alors que le « + » ne fait que juxtaposer deux propositions. | s05-ss02-m001 p. 27-28 | Remplacer cette erreur par « ajouter des conditions, exclusions ou un panier de soins absents du texte ». Dans la réponse de référence, écrire « figure à côté de » la reconstruction. Facultatif : m003, m005. |
| 010 | validé | — | s05-ss09-m001, m004 p. 30 | — |
| 011 | validé | « à effectifs réduits » est ambigu, et la référence garde à juste titre la formule littérale. m004 « Droit opposable à l'accueil » concerne aussi les places. | s06-ss01-m001, m002 p. 32 | Ajouter m004 en facultatif. Ne pas exiger d'interpréter « à effectifs réduits ». |
| 012 | validé | L'annexe des textes de loi est une autre source : « Loi ORE (2018) : à l'origine de Parcoursup et de la CVEC. Le programme supprime les deux » (p. 57). | s06-ss07-m001, m004 p. 35 | Accepter l'annexe. |
| 013 | validé | — | s07-ss01-m007 p. 37 | — |
| 014 | à corriger | s04-ss03-m007 « Service militaire optionnel dans le service citoyen » (p. 24) étaye aussi le caractère optionnel, mais le groupe de preuves ne contient qu'un ID. Le corpus donne un SMIC proposé à 1 700 € net (s01-ss08-m001) : un calcul sourcé et présenté comme tel n'est pas une invention. s06-ss09-m005 parle d'un « service citoyen obligatoire », sans que le lien avec la conscription soit établi. | s07-ss04-m001 p. 38 | Groupe « optionnel » : [s07-ss04-m001, s04-ss03-m007]. Reformuler l'erreur 2 : « présenter un montant comme écrit dans la mesure, ou utiliser un SMIC non sourcé ». |
| 015 | à corriger | « Facilitation de l'accès à la nationalité » est exigée alors que la question porte seulement sur le droit du sol et le vote des étrangers. | s08-ss01-m001, m002 p. 39 | En faire un complément accepté, non exigé. |
| 016 | validé | — | s08-ss01-m006 p. 40 | — |
| 017 | validé | Le lexique définit aussi la réduflation (p. 46). L'intérêt attendu découle de cette définition et la référence le formule avec prudence. | s01-ss08-m007 p. 6 | Facultatif : s01-ss08-m006 (encadrement des prix). |
| 018 | validé | Rattacher la réouverture des accueils physiques aux personnes sans Internet est une déduction : la mesure est dans « Services publics de proximité ». C'est acceptable, puisque la question demande l'intérêt. | s01-ss20-m006 p. 11 ; s02-ss06-m005 p. 14 | Réponse de référence : « peuvent permettre » plutôt que « visent à », puisque le but n'est pas écrit. |
| 019 | validé | D'autres leviers sont étayés : m009 (marges de la grande distribution), m005 (PAC), m010 (circuits courts), m002. | s03-ss07-m001, m003 p. 20 | Ajouter ces mesures en facultatif. |
| 020 | à corriger | Glissement de sens : le texte dit « fonds de relocalisation » sans préciser ce qui serait relocalisé. La question suppose des « habitations à déplacer » et la référence le reprend implicitement. Cas peu sémantique : « inondations » est le mot exact du texte. | s03-ss09-m001 p. 21 | Réponse de référence : « …sans préciser ce qui serait relocalisé ni à quelles conditions ». Ajouter comme erreur : « affirmer que le fonds vise expressément les habitations ». |
| 021 | validé | Le lexique définit « licenciement boursier » (p. 45). L'objectif est appuyé par le titre de la rubrique, « pouvoir des salariés ». Compléments possibles : m011, m014, m015, s01-ss07-m006. | s01-ss06-m006, m012 p. 5 | Ajouter ces compléments en facultatif. |
| 022 | à corriger | Mauvaise catégorie : la question emploie « consentement », le mot exact de la mesure. Le volet « impunité » n'est pas demandé mais il est exigé. Compléments possibles : s06-ss03-m024 (éducation à la vie affective et sexuelle), s07-ss02-m009. | s07-ss02-m004 p. 38 | Rendre « impunité » facultatif. Reformuler la question sans le mot « consentement » ou la reclasser en « précis ». |
| 023 | à corriger | L'erreur « montant salarial absent de cette mesure » pénaliserait une combinaison sourcée avec s01-ss08-m001. Le cas recoupe MIL-026 (même mesure). Il est peu sémantique : le sigle ESAT est donné dans la question. | s05-ss10-m005 p. 30 | Erreur : « présenter un montant comme écrit dans la mesure ESAT ». Reformuler la question sans le sigle, ou remplacer le cas. |
| 024 | validé | Rattacher le statut aux personnes déplacées est une lecture du contexte (rubrique asile). La référence reste prudente. | s08-ss01-m012 ; s08-ss02-m003 p. 40 | — |
| 025 | à corriger | Les groupes ne contiennent qu'un ID chacun. Pour l'offre de logements, s01-ss09-m006 (30 % de HLM), m008, m009 (réquisition) et m010 (Airbnb) sont aussi valables. Selon le lexique, la garantie universelle des loyers (m004) protège les propriétaires, pas le paiement des locataires. | s01-ss08-m004 ; s01-ss09-m005, m001 p. 6 | Groupe « offre » : [m001, m006, m008, m009, m010]. Ajouter comme erreur : « présenter la garantie universelle des loyers comme une aide au locataire ». |
| 026 | validé | L'autre source s05-ss10-m003 est bien prise en compte. « Autonomie » dans la référence est une interprétation. L'erreur 2 est vague. | s05-ss10-m002, m003, m005 p. 30 ; s06-ss05-m002 p. 34 | Erreur 2 : « affirmer qu'un AESH individuel est garanti à chaque élève ». Facultatif : m006 (budget « zéro obstacle »). |
| 027 | validé | « Soins gratuits » (rubrique Vie étudiante) ne précise pas s'il s'agit des soins psychologiques ou de tous les soins. D'autres mesures sont pertinentes : s05-ss08-m008 « Droit à la santé (surtout mentale) » et s01-ss13-m002 (burn-out). | s05-ss05-m001 p. 28 ; s06-ss09-m002 p. 36 | Ajouter ces mesures en facultatif. N'imposer aucune lecture de « soins gratuits ». |
| 028 | à corriger | Le 3e critère impose une seule grille d'analyse, « production et débouchés ». Le cas recoupe MIL-019 (même mesure m001). | s03-ss07-m001 p. 20 ; s05-ss11-m009 p. 31 | « Proposer une complémentarité présentée comme une interprétation, par exemple production et débouchés ». |
| 029 | à corriger | 1) Les groupes de preuves (trois groupes d'un ID) contredisent la note qui accepte d'autres exemples. 2) « fiscalité ou aides aux entreprises » est ambigu : l'ISF n'est pas un impôt sur les entreprises. 3) Il existe des exemples plus directs : s03-ss01-m014 et m015 (« Cet argent servira à la bifurcation écologique », logique écrite), s03-ss04-m003 (subventions aux énergies fossiles), s01-ss16-m009 (niches sur le kérosène), s03-ss10-m006, s01-ss16-m005, s03-ss07-m005. | s01-ss01-m004, m008 p. 2 ; s01-ss06-m010 p. 5 | Un seul groupe ouvert, dont 3 éléments suffisent. Reformuler en « fiscalité (impôts, niches) ou aides publiques aux entreprises ». |
| 030 | validé | Le texte de s08-ss03-m003 (testing, dossiers anonymes) ne nomme ni l'emploi ni le logement. | s07-ss01-m004 p. 37 ; s08-ss03-m002, m003 p. 40 | Facultatif, comme erreur : « affirmer que le texte limite le testing à l'emploi ou au logement ». |
| 031 | à corriger | L'inflation apparaît ailleurs : SMIC indexé sur l'inflation (s01-ss08-m001), définition de l'indexation dans le lexique. Citer l'inflation à propos du SMIC n'est pas une faute. Le « montant » des retraites concerne aussi m002 (pensions au moins au SMIC), m003 et m008 (suppression de la décote). | s01-ss14-m006 p. 8 | Erreur : « affirmer que les retraites seraient indexées sur les prix ». Ajouter m002, m003 et m008 en facultatif. |
| 032 | validé | Le pronom « y » est bien résolu. Le mot « reconversion » est aussi dans m001. | s03-ss04-m005 p. 19 | Facultatif : s03-ss04-m001 et s03-ss01-m016 (contrat de bifurcation, mesure générale). |
| 033 | à corriger | Ambiguïté non prévue : après une question sur l'AME, « Et pour les enfants étrangers » peut aussi viser l'AME des enfants, sur laquelle le corpus ne dit rien de spécifique. | s08-ss01-m007 p. 40 ; s05-ss08-m001 p. 29 ; annexe sur la convention des droits de l'enfant p. 59 | Accepter, sans l'exiger, la mention « rien de spécifique sur l'AME des enfants ». Ajouter comme erreur : « inventer une disposition AME propre aux enfants ». |
| 034 | à corriger | Contradiction : le critère obligatoire exige de demander une précision, alors que la note accepte une réponse conditionnelle. Aucune preuve n'est prévue pour cette réponse conditionnelle : 500 000 places et gratuité des crèches, 15 000 logements étudiants par an, aucun loyer. Piège : le repas CROUS à 1 €. | s06-ss01-m001, m002 p. 32 ; s06-ss09-m001 p. 36 | Critère : « signaler l'ambiguïté, puis demander une précision ou séparer les interprétations ». Ajouter ces 3 IDs en facultatif. |
| 035 | à corriger | Le fond est correct : aucun seuil ni taux des 14 tranches dans le corpus complet ; le barème à 5 paliers du lexique (p. 42) porte sur les revenus 2025. Deux règles manquent : 1) une déduction du type « vous paieriez moins », alors que le texte dit seulement « pour que les riches paient vraiment plus » ; 2) le statut d'un calcul présenté explicitement comme une illustration avec le barème du lexique. | s01-ss01-m001 p. 2 ; lexique (pas d'ID citable) | Ajouter comme erreur : « déduire l'effet sur l'utilisateur ». Préciser par écrit si une illustration étiquetée avec le lexique est tolérée, sans qu'elle remplace jamais la réponse. |
| 036 | validé | L'absence est confirmée : aucun total, solde ni tableau des recettes et dépenses. Il existe des montants isolés : 200 Md€ (s03-ss01-m002), 2,3 Md€ par an (s05-ss10-m006), 2,6 Md (s07-ss02-m009), budget de la culture à 1 % du PIB (s02-ss09-m001). | — | Ajouter ces IDs en facultatif. La répondabilité devrait plutôt être « partial ». |
| 037 | validé | L'absence est confirmée : aucune étude, aucun chiffrage en points. Piège : les « + 300 000 emplois » agricoles (s03-ss07-m002). | s01-ss10-m001 p. 7 | Ajouter comme erreur : « convertir les 300 000 emplois agricoles en baisse du chômage ». |
| 038 | à corriger | Le critère 1 dit « présenter éventuellement » : un élément facultatif ne peut pas être exigé. L'absence de toute mention du RN est confirmée. L'annexe sur la loi de 2023 est une autre source. | s01-ss14-m001 p. 8 | Faire du critère 1 un complément accepté. |
| 039 | à corriger | Piège non prévu : l'annexe date la réforme à 64 ans au « 14 avril 2023 » (p. 55), et le pied de page du PDF porte la date d'impression (31/10/2026). Une déduction valable n'est pas prévue : présentée comme l'abrogation de la réforme de 2023, la retraite à 60 ans est une proposition. | s01-ss14-m001 p. 8 ; annexe p. 55 | Ajouter comme erreur : « donner le 14 avril 2023 ou la date d'impression comme date d'entrée en vigueur ». Accepter cette déduction. Ne pas exiger d'affirmation sur le droit actuel. |
| 040 | à corriger | Le critère 3 est conditionnel (« si une réponse de fond… ») : il ne peut pas être obligatoire. « 2027 » figure dans le corpus pour l'illettrisme (s06-ss02-m001), d'où un risque de confusion. s99-ss99-m999 n'existe pas (seules s01 à s08 existent). La répondabilité « partial » ne convient pas. | Facultatif : s03-ss04-m001, m002 p. 19 | Garder comme critères obligatoires le refus de fabriquer et l'inexistence de l'ID. Mettre le reste en conditionnel. Nouvelle catégorie : « adversarial ». |

**Bilan : 18 validés, 22 à corriger, 0 non vérifiable.**

## 2. Cas trop proches, ambigus et domaines insuffisamment représentés

**Cas qui s'appuient sur la même mesure**

- Retraites : 002, 031, 038 et 039. Quatre cas tournent autour de s01-ss14-m001
  (directement, ou via l'historique de 031).
- Nucléaire (s03-ss04-m001/m002) : 005, 032 et 040.
- Pesticides (s03-ss07-m001) : 019 et 028.
- ESAT (s05-ss10-m005) : 023 et 026.
- AME : 016 et 033 (historique).
- Crèches : 011 et 034.
- La paire 001/035 est voulue et acceptable.

**Cas trop ambigus non signalés** : 003 (« révoquer »), 020 (objet du fonds),
027 (« soins gratuits »), 029 (« fiscalité des entreprises » ?), 033 (AME ou enfants).
L'ambiguïté de 034 est voulue.

**Cas « sémantiques » trop littéraux** : 020, 022 et 023 reprennent le terme exact de la
mesure. Ils ne testent pas la reformulation.

**Domaines insuffisamment représentés** : seules 33 sous-sections sur 80 sont touchées.
Aucun cas ne porte sur :

- Union européenne, et Justice mondiale, commerce et climat (25 mesures) ;
- École gratuite et égale, la plus grande sous-section (27 mesures) ;
- Climat et planification (19), Vie politique et probité (20), Culture et Sport (28) ;
- Territoires et outre-mer (17) : l'outre-mer est absent ;
- Banques et finance, Dette publique, Fraude fiscale ;
- Assurance-chômage, Précarité, Santé au travail ;
- Égalité femmes-hommes, Santé des femmes ;
- Laïcité, Recherche, Voie professionnelle, Terrorisme, Condition animale, Biodiversité,
  Fin de vie.

## 3. Corrections proposées

Aucun texte de mesure n'est modifié : les corrections portent sur les questions, les
critères et les groupes de preuves.

- **Élargir les groupes de preuves** :
  - 014 : [s07-ss04-m001, s04-ss03-m007]
  - 025 « offre » : [s01-ss09-m001, m006, m008, m009, m010]
  - 029 : un seul groupe ouvert {s01-ss01-m004, s01-ss01-m008, s01-ss06-m010,
    s03-ss01-m014/m015, s03-ss04-m003, s01-ss16-m009, s03-ss10-m006, s03-ss07-m005},
    dont 3 éléments suffisent
- **Ajouter des IDs facultatifs** :
  - 004 : m004, m012, m013
  - 008 : m011, m013, m014
  - 011 : m004
  - 019 : m002, m005, m009, m010
  - 027 : s05-ss08-m008
  - 031 : m002, m003, m008
  - 032 : s03-ss04-m001
  - 034 : s06-ss01-m001, s06-ss01-m002, s06-ss09-m001
  - 036 : les 4 montants isolés
- **Reformuler les questions** :
  - 029 : « fiscalité (impôts, niches) ou aides publiques aux entreprises »
  - 020, 022 et 023 : supprimer le terme littéral (« inondations », « consentement »,
    « ESAT ») ou reclasser ces cas en « précis »
- **Ne mettre dans les critères obligatoires que ce qui est vraiment exigé** :
  - 034, 038 et 040 : retirer les formulations conditionnelles ou « éventuellement »
  - 003, 015 et 022 : rendre facultatifs les éléments non demandés par la question
- **Ajouter des erreurs à éviter** :
  - 003 : révoquer des élus
  - 020 : fonds réservé aux habitations
  - 025 : garantie des loyers présentée comme une aide au locataire
  - 033 : AME propre aux enfants
  - 035 : effet personnel déduit
  - 037 : 300 000 emplois convertis en baisse du chômage
  - 039 : date du 14 avril 2023 ou date d'impression
  - 040 : confusion avec « 2027 » (illettrisme)
- **Reformuler des erreurs existantes** :
  - 009 : « remboursement inconditionnel »
  - 014 et 023 : un calcul dérivé et sourcé reste permis
  - 031 : indexation des retraites sur les prix

## 4. Avis sur la grille

1. **Sources alternatives** : le README dit d'accepter d'autres sources, mais des groupes
   d'un seul ID faussent le rappel de recherche (cas 014, 025 et 029). Les annexes, qui
   servent de source dans 002, 012, 017, 021, 033, 035 et 039, **n'ont ni identifiant
   propre ni page vérifiée**. Elles sont donc impossibles à citer et à noter. Il faut leur
   attribuer des IDs, par exemple `a02-ss02-b017`, et les intégrer à la vérification PDF.
2. **Cas sans réponse** : la règle qui rend la dimension « Sources » non applicable à une
   clarification ou à un refus est bonne. Ajouter un champ `applicable_dimensions` par cas
   éviterait d'avoir à l'interpréter, surtout pour les cas « partial » (035 à 039), où
   seule la partie qui répond doit être sourcée.
3. **Avantages attendus** : il faut distinguer trois niveaux.
   - (a) Un but écrit dans le texte : « pour que les riches paient vraiment plus »,
     « Cet argent servira à la bifurcation écologique ».
   - (b) Un but déduit du titre de la rubrique (021).
   - (c) Une interprétation de l'analyste (018, 026, 028, 029).

   Seul le niveau (c) doit être signalé comme interprétation, sans exiger de formule précise.
4. **Erreurs critiques** : il faut distinguer un *chiffre inventé* d'un *calcul dérivé
   sourcé et signalé comme tel* (014, 023, 035). Deux erreurs critiques manquent :
   présenter un contenu du lexique comme une proposition (035), et donner une date
   d'archive ou d'une autre loi comme date légale (039).
5. **Seuil de réussite** : avec 4 dimensions, une réponse peut obtenir 0 en « Sources »
   malgré des affirmations factuelles et atteindre exactement 75/100, donc réussir. Il faut
   exiger un score strictement supérieur à 75, ou au moins 1 en « Sources » quand cette
   dimension s'applique.
6. **« Incertitude et limites »** : il faut préciser qu'aucune mise en garde explicite
   n'est exigée quand la réponse n'affirme rien de trop, notamment dans les cas « précis ».
7. **Découpage pour la recherche** : s03-ss01-m015 (« Cet argent… ») n'a pas de sens sans
   m014. s05-ss02-m001 est coupée entre deux pages. Si le PDF est indexé, ses pieds de page
   (date, `file:///…`) et ses bandeaux Google pollueront les passages récupérés.

## Suite

Les corrections doivent être reportées dans `scripts/build_benchmark.py` : relancer ce
script écrase les quatre fichiers générés (`questions.jsonl`, `references.jsonl`,
`references.md`, `manifest.json`).
