# Chati — validation

## Interface et ton des réponses — 1er novembre 2026

- Logo Chati encadré seul dans la barre latérale, bandeau supérieur retiré ;
  accès au menu conservé sur mobile.
- « Explorer le programme » ouvre la page officielle de découverte. Une section
  « Liens utiles » rassemble le Google Docs source et le site réseaux/programme/QCM.
- Consignes de génération : privilégier « Le programme propose » ou « La France
  insoumise propose », en conservant les limites du corpus réellement fourni.
  Ce changement concerne les nouvelles réponses ; les conversations archivées
  et les réponses des benchmarks ne sont pas réécrites.
- Compilation TypeScript/Vite, 5 tests front et 44 tests API/web réussis.
  Image Docker reconstruite, HTTP et bundle déployé vérifiés, index prêt.
- Image évaluée conservée sous `chati:evaluated-v2-20261101`. Les scores v2
  caractérisent cette configuration antérieure au changement de consigne.
- Navigateur de contrôle indisponible : vérification visuelle restant à faire.

31 octobre 2026. L’application est livrée avec son code, ses dépendances figées,
son image Docker reproductible et son protocole d’évaluation. Aucun secret n’a
été ajouté au dépôt.

## Questions de suivi et recherche web — 31 octobre 2026

- **52 tests Python réussis** et **5 tests TypeScript réussis** ; compilation
  TypeScript/Vite et construction Docker réussies.
- Vérification des URLs issues des annotations natives, des références partageant
  un même marqueur, des réponses incomplètes, de l’ancrage sur une mesure, de
  l’absence de recherche en mode programme et du refus d’inventer une comparaison
  si le web échoue. Les appels OpenAI de ces tests sont simulés.
- Essai **réel de bout en bout** dans le conteneur, avec l’index hybride existant,
  `gpt-6-luna` et son outil natif `web_search` : comparaison entre la gratuité des
  crèches proposée (`s06-ss01-m002`) et la situation actuelle en France.
- Réponse structurée reçue en **33,987 secondes**, avec la mesure, quatre références
  web issues de `caf.fr`, `service-public.fr` et `legifrance.gouv.fr`, leur date de
  consultation, ainsi que trois questions de suivi. Aucune clé n’a été lue ou
  affichée pour cet essai ; il utilise la configuration du serveur.
- Le service Compose de l’utilisateur est mis à jour et reste démarré.

Cet essai valide le parcours et le traitement des références. Il ne remplace pas
une évaluation sémantique, un contrôle systématique de fraîcheur des règles ni la
validation visuelle dans un navigateur. Le benchmark fermé au corpus reste séparé
du parcours web.

## Première évaluation des 40 questions — 31 octobre 2026

Le [rapport](../benchmarks/chati-v1/runs/2026-10-31-first/REPORT.md) archive une
exécution réelle unique, en mode hybride avec Luna et sans web : **38/40 cas
validés**, dont **32/40 entièrement complets**, aucune erreur technique, une
erreur critique (RIC, MIL-003) et un échec complet de recherche (MIL-020).
Les réponses, empreintes et annotations sont conservées ; le
[protocole](../benchmarks/chati-v1/EVALUATION.md) permet de recalculer les métriques
hors ligne. Le juge sémantique est l’agent Codex de cette session : la relecture
indépendante et humaine reste à faire. Aucun réglage du produit n’a été modifié
durant cette première évaluation.
Les 7 nouveaux tests du collecteur/calculateur et les 15 tests des règles du
benchmark passent (**22 contrôles**), sans appel API : flux incomplet, refus d’un
audit absent, distinction contribution d’une citation/fidélité du bloc, groupes
vides, références non observées et comptage des échecs techniques.

## Vérifications de la première livraison

- **32 tests Python réussis** : règles du benchmark, provenance, routes HTTP,
  recherche, version de l’index, contexte anaphorique, contrôle des citations,
  réparation bornée, génération simulée, création d’index et préservation de
  l’index précédent si les embeddings sont incomplets.
- **4 tests TypeScript réussis** : lecture d’un flux SSE fragmenté, gestion des
  états, refus d’un flux incomplet et message de configuration absent.
- Construction TypeScript/Vite réussie.
- Construction Docker finale réussie : `chati:local`, identifiant
  `sha256:69291d4447ebb629fab7fa60d3e635b5ae2d6dba47b92b45fd271bb0f207885d`.
- Le conteneur a servi son front, ses assets et les licences des polices. Une
  demande réelle en mode consultation a parcouru l’API, le flux SSE, les fiches
  sources et le PDF avec succès.
- L’utilisateur d’exécution est non privilégié (UID 10001), le répertoire de
  l’index est inscriptible et les corrigés ne sont pas présents dans l’image.
- Configuration Compose vérifiée. Le conteneur temporaire de QA est arrêté après
  les contrôles ; l’image demeure disponible pour le lancement par Compose.
- Empreintes des mesures et des annexes inchangées par rapport au manifeste du
  benchmark relu.

## Diagnostic de recherche

Les 40 entrées ont été exécutées en mode lexical avec le même constructeur de
requête que l’API. Le diagnostic est dans
[`retrieval-baseline.json`](../benchmarks/chati-v1/retrieval-baseline.json).

La moyenne par cas de couverture des groupes de preuves connus est **69,05 %**
sur les **35 cas** possédant des groupes inconditionnels. Les groupes conditionnels
restent exclus sans examen de la branche de réponse ; les exemples ouverts
acceptent éventuellement d’autres sources pertinentes. Ce chiffre n’est ni un
taux de réponses correctes, ni une note de fidélité des citations, ni une mesure
indépendante de généralisation.

Le mode lexical est une référence initiale. Les formulations sémantiques doivent
être évaluées avec l’index hybride et des réponses réelles avant de figer les
réglages de l’assistant.

## Vérifications restantes

- **Évaluation des réponses réelles** : la première exécution des 40 cas est
  archivée. Les jugements sémantiques, notamment MIL-003 et le cas limite MIL-034,
  doivent être revus indépendamment ; le parcours web reste à évaluer sur un lot dédié.
- **Rendu et interactions dans un navigateur** : le service de prévisualisation
  est indisponible (`browser access host unavailable`). La compilation et les
  contrôles HTTP ne remplacent pas une QA visuelle desktop/mobile et une vérification
  des interactions de l’historique dans un navigateur.
- **Évaluation sémantique** : le contrôle technique des références ne prouve pas
  que chaque explication est soutenue par le texte. Le premier audit est disponible ;
  ses annotations et la stabilité des résultats sur plusieurs runs restent à vérifier.
- **Généralisation** : après la conception, créer le nouveau lot de sous-sections
  prévu dans [NEXT-BENCHMARK.md](../benchmarks/NEXT-BENCHMARK.md).

Les commandes de lancement et de configuration sont dans le [README](../README.md).
