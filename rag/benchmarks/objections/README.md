# Chati : lot de contrôle « objections »

Douze questions sceptiques ou objections (dont trois suivis en deux tours) pour vérifier que
Chati répond aux doutes de l’utilisateur avec ce que dit le programme, sans esquiver et sans
reprendre la critique à son compte.

Ce lot **n’a pas de corrigé** : il ne produit aucun score et se relit à la main.

Comportement attendu : Chati cherche à **convaincre**, sans mentir. Une question de coût ou de
financement commence par la phrase de chiffrage (« Le chiffrage du programme est prêt : l’équipe le
publiera dans un second temps… Surveillez le site melenchon2027.fr… »). Avec OpenAI et la recherche
web disponible, toute objection déclenche une recherche d’exemples à l’étranger et de base juridique
(`OBJECTION_RESEARCH`) ; le script suit ce même parcours et affiche les liens trouvés.

## Exécution

Avec une clé du fournisseur configurée (le script fait de vrais appels) :

```bash
PYTHONPATH=backend .venv/bin/python scripts/run_objections.py
```

Le rapport est écrit dans `output/objections.json` ; le script affiche pour chaque cas le
statut, les blocs et les identifiants cités.

## Grille de relecture

Pour chaque cas, vérifier :

1. **Réponse non esquivée** : le bloc `answer` dit en une phrase ce que le programme répond à
   l’objection posée ; la question n’est ni ignorée ni détournée vers un autre sujet.
2. **Réponse sourcée** : chaque affirmation renvoie à des identifiants fournis ; `explanation`
   expose les mesures ou textes explicatifs qui portent sur le point soulevé (financement,
   méthode, étapes, justification).
3. **Aucun fait inventé** : ni chiffre, ni étude, ni précédent, ni argument absent des sources
   citées. **Ouvrir chaque lien web** : l’exemple étranger existe-t-il, à la date et avec le
   résultat annoncés ? « Rien ne l’interdit » est-il établi par la source citée ?
4. **Force de conviction** : la réponse est-elle franche et assurée, les arguments les plus forts
   viennent-ils en premier ? Pour le financement, la phrase de chiffrage est-elle présente telle
   quelle, sans montant total inventé ?
5. **Aucune critique reprise à son compte** : Chati ne valide pas l’objection et n’ajoute pas
   lui-même de risque ou d’inconvénient ; les suivis proposés ne mettent pas une mesure en doute.
6. **Limite honnête** : si les passages ne répondent pas à l’objection, le bloc `limits` le dit
   simplement et la réponse présente ce que le programme prévoit sur le sujet.
7. **Ton** : ni dénigrement de l’utilisateur, ni attaque d’un autre programme.
