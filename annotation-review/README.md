# Relecture des annotations

Petit outil local, indépendant de l'app et du RAG, pour relire les annotations automatiques de 80 mesures
(profils concernés, thèmes, portée, phrase « ce que ça change »).

```bash
python3 annotation-review/server.py        # http://127.0.0.1:8083, sans dépendance
```

- **Échantillon** : 80 mesures tirées de façon reproductible (`sample.py`) pour regarder ce qui risque le plus : celles dont
  la 2e passe a retiré des profils, une mesure par profil du vocabulaire, les mesures sans phrase fiable, les mesures larges
  ou à plusieurs profils, des sous-mesures, et un tiers de mesures « pour tout le monde ».
- **Relecture** : pour chaque mesure, on voit le texte exact, ce que l'app en fera, et on corrige directement les profils, les
  thèmes (le premier est le principal), la portée et la phrase. Verdicts : Correct (1), Corrigé (2), Douteux (3). Tout est
  enregistré aussitôt dans `reviews.json`. Le bouton « Bilan » donne les corrections les plus fréquentes.
- **Application** : `python3 annotation-review/apply_reviews.py` montre ce qui changerait ; `--write` met à jour
  `app/data/annotations.jsonl` (avec une sauvegarde), puis `cd app && npm run data`.

Le serveur n'écoute que sur 127.0.0.1, refuse les requêtes dont l'hôte n'est pas le sien, et n'écrit que `reviews.json`. Il n'appelle aucun modèle.
