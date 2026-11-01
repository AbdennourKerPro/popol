# Extraction du résumé de programme

La source est la copie HTML déjà téléchargée dans cette session depuis la page
Google Docs publiée fournie par l’utilisateur. Cette copie est archivée dans
`source/programme-lfi.html` ; aucune nouvelle version n’est téléchargée par les
scripts. Son empreinte SHA-256 figure dans les résultats. Le PDF de référence est
`../assets/Programme-Mélenchon-LFI.pdf`.

## Résultats

- `structured/programme.json` : hiérarchie de 8 sections, 80 sous-sections et
  795 mesures, plus deux annexes conservées séparément (lexique et textes de loi).
- `structured/mesures.jsonl` : une mesure par ligne avec ses identifiants, son
  contexte, son texte d’indexation, sa provenance HTML et sa vérification PDF.
- `structured/annexes.jsonl` : 171 blocs d’annexe, avec identifiants
  `aXX-ssYY-bZZZ`, contexte, texte source, provenance et vérification PDF.
- `structured/annexes-pdf-verification.json` : comparaison des blocs d’annexe
  avec les pages 41 à 59 du PDF, distincte de celle des propositions.
- `structured/programme.md` : version de relecture comprenant aussi les annexes.
- `structured/extraction-report.json` : couverture des paragraphes, comptages,
  doublons textuels et écarts avec les nombres annoncés dans le document.
- `structured/pdf-verification.json` : résultat détaillé de la comparaison PDF,
  relié aux mesures par leur identifiant, avec les pages physiques (base 1).

## Règles

Les balises `h1` définissent les sections et `h2` les sous-sections. Chaque
paragraphe commençant par un tiret dans les huit sections devient une mesure.
Les bandeaux Google et le sommaire ne sont pas des mesures. Aucun modèle de
langage ne réécrit ou ne complète le contenu.

`texte_source` conserve le texte du paragraphe HTML après décodage des entités,
y compris le tiret et les espaces insécables. `texte` normalise les espaces et
retire uniquement le tiret initial. Les identifiants sont déterministes pour
cette copie ; insérer une mesure en amont dans une autre version les décalera.
Les ancres HTML et l’empreinte de source complètent leur traçabilité.

Les annexes restent des blocs ordonnés avec leur balise et, lorsqu’il existe,
leur niveau de liste dans le HTML. Elles ne sont pas ajoutées au JSONL des mesures.
Depuis le schéma 1.1, chaque bloc a un ID positionnel et une ancre de sous-section,
comme les mesures : ajouter un bloc dans une autre version peut décaler les IDs.
Ce contenu est un résumé fourni par l’utilisateur ; son statut officiel et ses
affirmations ne sont pas validés par cette extraction.

## Écarts de comptage dans la source

| Section | Annoncé | Paragraphes de mesures extraits |
| --- | ---: | ---: |
| Économie, travail et logement | 212 | 207 |
| Institutions, démocratie et société | 122 | 117 |
| Écologie et climat | 164 | 158 |
| Europe et international | 87 | 85 |
| Santé et social | 86 | 68 |
| Éducation, recherche et jeunesse | 94 | 91 |
| Sécurité, police et justice pénale | 44 | 44 |
| Immigration, droits et lutte contre les discriminations | 25 | 25 |
| **Total** | **834** | **795** |

Tous les paragraphes de mesures du HTML sont couverts. L’écart de 39 avec les
nombres annoncés n’est pas comblé artificiellement : une puce peut regrouper
plusieurs propositions, et les chiffres annoncés peuvent aussi être inexacts.
L’extraction ne tranche pas cette question.

## Vérification PDF

Les 795 mesures ont une correspondance dans l’ordre du PDF, y compris celles
réparties sur deux pages. Parmi elles, 702 correspondent après normalisation
des accents, de la ponctuation et des espaces ; 93 nécessitent également de
tolérer des glyphes indéterminés (`U+FFFD`) dans le texte du PDF. Ce contrôle
confirme la concordance du texte des mesures avec ces réserves ; il ne prouve
pas l’identité complète des deux documents. Un contrôle séparé couvre désormais
les 171 blocs d’annexe : 135 sans glyphe indéterminé et 36 avec tolérance. Leurs
pages sont dans le fichier `annexes.jsonl` et leur nature reste `annexe_bloc`.

Le vérificateur utilise les coordonnées des mots pour enlever les bandeaux
répétés et rétablir l’ordre de lecture des changements de police. Il est adapté
à cette impression Firefox sur 59 pages : sa géométrie ne doit pas être
réutilisée sans contrôle pour un PDF différent. Une mesure introuvable est
signalée, sans correction du texte HTML.

## Reproduire

Depuis la racine du dépôt, avec Python 3.9+ et `pdftotext` (Poppler) :

```bash
python scripts/extract_programme.py
python scripts/verify_programme_pdf.py
python scripts/verify_programme_pdf.py --measures data/structured/annexes.jsonl --output data/structured/annexes-pdf-verification.json --start-page 41
```

Aucune dépendance Python tierce ni clé d’API n’est nécessaire. Le premier script
régénère les fichiers structurés. Le second produit le rapport PDF et enrichit
le JSONL avec `verification_pdf` (pages, statut et nombre de glyphes indéterminés).
La troisième commande enrichit le JSONL des annexes. Exécuter les trois commandes
dans cet ordre avant de régénérer le benchmark.

Pour une future indexation RAG, `texte_indexation` inclut la section et la
sous-section. Les champs `source_url`, `source_sha256` et `verification_pdf`
permettent de restituer la provenance. L’index et les embeddings ne sont pas
créés à cette étape.

Pour les mesures anaphoriques comme « Cet argent » (s03-ss01-m015), conserver la
mesure précédente avec le passage retrouvé. Une définition du lexique peut aider
à expliquer une proposition mais n’en remplace pas la preuve. Les sauts de page
ne découpent pas les unités, et les éléments d’impression du PDF ne sont pas du
contenu à indexer.
