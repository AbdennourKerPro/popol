# popol

Deux projets indépendants, partageant le même corpus (le programme de la France insoumise).

| Dossier | Rôle |
|---|---|
| [rag/](rag/README.md) | **Chati**, l'assistant RAG existant : corpus structuré du programme, recherche, génération sourcée, benchmarks, atelier de relecture. Autonome (Docker, tests, scripts). |
| [app/](app/README.md) | **Ça change quoi pour moi ?** Prototype d’appli web qui relie la situation d’une personne aux mesures du programme : un mode jeu et un mode militant. Site statique, sans IA ni serveur. |

Le corpus de référence (`mesures.jsonl`, `annexes.jsonl`, PDF source) vit dans `rag/data/` et
`rag/assets/`. L'appli le consomme sans le modifier ; toute évolution du corpus se fait côté `rag/`.

Toutes les commandes du RAG (Docker, pytest, scripts, npm) s'exécutent depuis `rag/`.
