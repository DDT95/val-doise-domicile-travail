# Domicile ↔ Travail — Val d'Oise

Carte interactive des flux domicile-travail dans le Val d'Oise (95), inspirée de [regio.toekom.st](https://regio.toekom.st/).

**[Voir la carte](https://ddt95.github.io/val-doise-domicile-travail/)**

## Préparer la future page Logement

Le cadrage complet de la page **« Comment se loge-t-on dans le Val-d’Oise ? »** est disponible dans [`HANDOFF_NOUVELLE_PAGE_LOGEMENT.md`](HANDOFF_NOUVELLE_PAGE_LOGEMENT.md) : sources pérennes, indicateurs, architecture, règles UX, pipeline de données, dépôt GitHub et raccordement à l’Atlas.

## Données

Source [INSEE RP2023 — fichier détail Mobilités professionnelles](https://www.insee.fr/fr/statistiques/9004795), Licence Ouverte / Open Licence (Etalab). Le poids individuel `IPONDI` est agrégé pour construire la carte et les fiches communales et intercommunales.

Les contours communaux proviennent de [france-geojson](https://github.com/gregoiredavid/france-geojson) et les centroïdes de communes de [geo.api.gouv.fr](https://geo.api.gouv.fr/).

Voir l'onglet **Comprendre** de la carte pour la méthodologie complète et ses limites.

## Développement local

```
python3 -m http.server 8420
```

Puis ouvrir `http://localhost:8420`.

## Régénérer les données

Télécharger dans `data/raw/` :
- `all_communes.json` : `curl "https://geo.api.gouv.fr/communes?fields=nom,code,centre,codeDepartement&format=json&geometry=centre" -o data/raw/all_communes.json`
- `RP2023_mobpro.parquet` et `varmod_mobpro_2023.csv` depuis la [page du fichier détail INSEE](https://www.insee.fr/fr/statistiques/9004795)

Puis :

```
pip install pandas pyarrow
python3 scripts/build_data.py
python3 scripts/build_profiles.py
```

## Structure

```
index.html              page principale (carte + onglet Comprendre)
fiche.html              explorateur commune/EPCI et export PDF à la demande
css/style.css
css/fiche.css
js/app.js                logique D3 (projection, arcs courbes, interactions)
js/fiche.js              navigation et rendu des profils commune/EPCI, options d’export
data/processed/          jeux de données utilisés par la carte
data/raw/                sources brutes (partiellement gitignorées, voir README)
scripts/build_data.py    reconstruction des jeux de données
scripts/build_profiles.py agrégation pondérée aux échelles commune et EPCI
```
