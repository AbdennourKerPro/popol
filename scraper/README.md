# Extraction du programme L’Avenir en commun

Scraper autonome Python 3.10+ utilisant `requests` et `BeautifulSoup`, sans navigateur.
Aucune modification de `app` ou `rag`.

## Installation et lancement

Depuis la racine du dépôt :

```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scrape.py
```

Les fichiers sont écrits dans `scraper/outputs/`, quel que soit le répertoire courant.
Une extraction a déjà été réalisée et vérifiée le 8 novembre 2026.

```bash
# Refaire une extraction en ligne, sans réutiliser le cache HTML
python scrape.py --refresh

# Options réseau et destination
python scrape.py --refresh --delay 1 --timeout 30 --retries 4 --output outputs

# Tests, dont comparaison des exports aux sources archivées
python -m unittest discover -s . -v
```

Durée mesurée : environ **32 secondes** pour 31 pages avec une seconde de pause entre
requêtes ; prévoir **1 à 3 minutes** selon le réseau, davantage en cas de tentatives
répétées. Une exécution depuis le cache prend environ 2 secondes. L’installation de
la venv et des dépendances prend généralement moins d’une minute.

## Fichiers produits

- `outputs/programme_complet.json` : introduction, parties, chapitres, sous-sections,
  textes explicatifs, titres, mesures, texte intégral et HTML des contenus.
- `outputs/mesures.jsonl` : une mesure ou sous-mesure par ligne, contexte complet.
- `outputs/mesures.csv` : mêmes données, UTF-8 avec BOM, virgule comme séparateur ;
  les champs contenant des virgules ou retours à la ligne sont correctement cités.
- `outputs/rapport_exhaustivite.json` : couverture, décomptes, erreurs et doublons.
- `outputs/sources/*.html` et `manifest.json` : réponses HTML originales, URL et
  empreinte SHA-256 permettant de vérifier l’extraction ou de la rejouer hors ligne.

Les exports restent dans ce dossier pour leur intégration ultérieure dans `app` et `rag`.

## Structure réellement observée

Source : https://melenchon2027.fr/programme/livre/

Le HTML a été inspecté avant l’implémentation. Le sommaire est dans
`main nav.tdm > div.partie`. Chaque `h2 a` désigne une introduction ou une partie ;
les liens directs suivants désignent ses chapitres. Les pages de parties contiennent
un second sommaire `nav.tdm`, avec les chapitres et les ancres des sous-sections.
Les chapitres contiennent `.chapitre_sections > section` et des titres
`h3.section-title[id]`.

Trois types sont conservés :

| Type exporté | HTML source | Nombre observé |
| --- | --- | ---: |
| `cle` | `.mesure-cle`, sans le libellé « Mesure clé » dans le texte | 107 |
| `complementaire` | `li.mesure` | 881 |
| `sous_mesure` | `li.sous_mesure` | 81 |

**Total : 1 069 entrées, 6 parties, 23 chapitres, 111 sous-sections et 31 pages.**
Aucune page ni sous-section manquante ; aucun identifiant dupliqué ni texte de
mesure identique lors de cette extraction.

Le HTML place les sous-mesures dans un `li` conteneur frère de la mesure parente.
`parent_id` et `sous_mesures_ids` rétablissent explicitement cette relation.
Dans le JSON hiérarchique, toutes les entrées figurent dans `sous_sections[].mesures`
en ordre documentaire ; ces liens permettent de reconstruire l’arbre sans recopier
les sous-mesures. Dans le CSV, `sous_mesures_ids` est une liste sérialisée en JSON.
Chaque entrée a un ID SHA-256 tronqué à 24 caractères, dérivé de l’URL de la
sous-section et de son rang. Il est stable à contenu ordonné identique, mais une
insertion peut modifier les IDs suivants dans la sous-section.

## Fidélité et exhaustivité

Le texte provient du DOM sans reformulation, sans normalisation des espaces Unicode
ni ajout d’espaces entre balises inline. Les blancs de bord sont retirés ; les entités
HTML sont décodées. Le HTML conserve les italiques, exposants, liens, listes et
séparations de blocs ; les réponses originales sont également archivées.
Les champs `texte_integral` et `html` garantissent la conservation de tout le contenu
des chapitres, même au-delà des champs dédiés aux paragraphes explicatifs.

Les URLs et nombres attendus sont découverts, jamais imposés. Le rapport compare
les chapitres et ancres des sommaires avec les contenus extraits, les mesures DOM
avec les exports, détecte les listes non reconnues, les erreurs réseau, IDs dupliqués
et textes identiques. Les doublons éventuels sont signalés et **jamais supprimés**.
La référence de 1 069 est indicative : un écart déclenche un avertissement, sans
inventer de mesure ni retirer du contenu. `extraction_complete` concerne la
couverture du livre présent sur le site, pas les livrets ou plans thématiques externes.

Le programme retourne **0** si les contrôles de couverture passent, **1** en cas
 d’extraction incomplète. Après un échec sur une page, il continue et produit des
exports partiels ainsi qu’un rapport explicite. Si le sommaire initial est inaccessible,
l’exécution échoue avant de générer de nouveaux exports. Vérifier le code de retour
et le rapport avant d’intégrer les données.

Les réponses réussies sont mises en cache. Sans `--refresh`, seules les pages absentes
sont téléchargées : utile pour reprendre après une panne ; utiliser `--refresh` pour
obtenir une nouvelle version cohérente du site. Les erreurs de connexion et statuts
429/500/502/503/504 bénéficient de quatre nouvelles tentatives avec attente
exponentielle et respect de `Retry-After`. Les autres erreurs HTTP sont signalées.
La pause d’une seconde s’applique entre les requêtes applicatives ; les tentatives
internes suivent la temporisation de `urllib3`.
