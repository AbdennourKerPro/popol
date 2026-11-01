# popol

Deux projets indépendants, partageant le même corpus (le programme de la France insoumise).

| Dossier | Rôle |
|---|---|
| [rag/](rag/README.md) | **Chati**, l'assistant RAG existant : corpus structuré du programme, recherche, génération sourcée, benchmarks, atelier de relecture. Autonome (Docker, tests, scripts). |
| [app/](app/README.md) | Future petite appli web pour aider à convaincre de voter LFI à partir des mesures du programme. À construire. |

Le corpus de référence (`mesures.jsonl`, `annexes.jsonl`, PDF source) vit dans `rag/data/` et
`rag/assets/`. L'appli le consomme sans le modifier ; toute évolution du corpus se fait côté `rag/`.

Toutes les commandes du RAG (Docker, pytest, scripts, npm) s'exécutent depuis `rag/`.
