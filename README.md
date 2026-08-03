# Domicile ↔ Travail — Val d'Oise

Carte interactive des flux domicile-travail dans le Val d'Oise (95), inspirée de [regio.toekom.st](https://regio.toekom.st/).

**[Voir la carte](https://ddt95.github.io/val-doise-domicile-travail/)**

## Données

Sources INSEE RP2022, Licence Ouverte / Open Licence (Etalab) :
- [base agrégée des flux domicile-travail](https://www.insee.fr/fr/statistiques/8582949), utilisée pour la carte ;
- [fichier détail Mobilités professionnelles](https://www.insee.fr/fr/statistiques/8589904), utilisé avec le poids individuel `IPONDI` pour les fiches communales et intercommunales.

Les contours communaux proviennent de [france-geojson](https://github.com/gregoiredavid/france-geojson) et les centroïdes de communes de [geo.api.gouv.fr](https://geo.api.gouv.fr/).

Voir l'onglet **Comprendre** de la carte pour la méthodologie complète et ses limites.

## Développement local

```
python3 -m http.server 8420
```

Puis ouvrir `http://localhost:8420`.

## Régénérer les données

Télécharger dans `data/raw/` :
- `base-flux-mobilite-domicile-lieu-travail-2022.csv` depuis la [page INSEE](https://www.insee.fr/fr/statistiques/8582949)
- `all_communes.json` : `curl "https://geo.api.gouv.fr/communes?fields=nom,code,centre,codeDepartement&format=json&geometry=centre" -o data/raw/all_communes.json`
- `RP2022_mobpro.parquet` et `varmod_mobpro_2022.csv` depuis la [page du fichier détail INSEE](https://www.insee.fr/fr/statistiques/8589904)

Puis :

```
pip install pandas
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
