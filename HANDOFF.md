# Contexte pour reprise par une autre IA (ChatGPT) — Atlas territorial DDT 95

## Qui est l'utilisateur / quel est le projet

L'utilisateur (Wilfried Koba, géomaticien) construit un **écosystème de pages cartographiques** pour la **DDT du Val-d'Oise (95)** — Direction Départementale des Territoires, service de l'État français. Toutes les pages sont des **sites statiques hébergés sur GitHub Pages**, sous le compte GitHub **`DDT95`**, dans des repos publics séparés (un repo = une thématique = une page).

Il existe un **hub central** : [`atlas-territorial-95`](https://ddt95.github.io/atlas-territorial-95/) — page d'accueil "Atlas territorial du Val-d'Oise" qui liste "10 lectures territoriales" (thématiques), chacune étant un repo/site séparé :

| # | Thématique | Repo (probable) |
|---|---|---|
| 01 | Portail communal (en construction) | `portail-communal95` |
| 02 | Urbanisme à la parcelle | `urbanisme95` |
| 03 | Artificialisation & ZAN | `artificialisation-zan95` ⭐ **repo de référence design** |
| 04 | Agriculture | `agriculture95` |
| 05 | Eau | `eau95` |
| 06 | Risques majeurs | `observatoire_risques_95` |
| 07 | Logement & Habitat | `observatoire_bati` |
| 08 | Biodiversité | `biodiversite95` |
| 09 | Mobilités & transports | `transport95` |
| 10 | Transition énergétique | `transition-energetique95` |

Autres repos DDT95 existants : `valdoise95` (portrait cartographique généraliste), `observatoire_meteo`, `valdoise_bus_trains`, etc.

**Nouveau projet en cours** (celui sur lequel on vient de travailler) : [`val-doise-domicile-travail`](https://github.com/DDT95/val-doise-domicile-travail) — carte des flux domicile-travail (déplacements pendulaires) du Val-d'Oise, avec des **arcs courbes** façon [regio.toekom.st](https://regio.toekom.st/) (carte allemande de référence citée par l'utilisateur), mais habillée avec le design system de l'atlas DDT95. **Ce repo n'est PAS encore listé/lié depuis le hub `atlas-territorial-95`** — question ouverte avec l'utilisateur : faut-il l'ajouter comme 11e lecture, ou l'intégrer plutôt dans `transport95` (section "Mobilités & transports" qui semble être son foyer naturel) ? Il n'a pas encore tranché.

## Repo de référence design : `artificialisation-zan95`

**Avant toute chose, cloner/lire ce repo pour calibrer le design** :
`https://github.com/DDT95/artificialisation-zan95` — page live : https://ddt95.github.io/artificialisation-zan95/

C'est LE gabarit visuel à reproduire pour toute nouvelle page de l'atlas. Fichiers clés à récupérer/dupliquer :
- `styles.css` — feuille de style complète du design system (voir résumé ci-dessous)
- `prefet-val-doise.svg` — logo officiel Préfet du Val-d'Oise (à réutiliser tel quel)
- `fonts/Marianne-Regular.woff2` et `fonts/Marianne-Bold.woff2` — police officielle de l'État français
- `app.js` — logique Leaflet + recherche + panneau détail + dialogs (structure à imiter)

Autres pages utiles à consulter pour variantes : `transport95` (thème mobilités, Leaflet + GTFS IDFM), `atlas-territorial-95` (le hub lui-même, page d'accueil).

## Le design system (résumé exhaustif)

### Identité
- Police : **Marianne** (police officielle de l'État), fallback `Arial, sans-serif`. Fichiers woff2 à héberger localement dans `assets/fonts/`.
- Logo : Marianne + "PRÉFET DU VAL-D'OISE" + "Liberté Égalité Fraternité", fichier `prefet-val-doise.svg`, cliquable vers `https://ddt95.github.io/atlas-territorial-95/` ("Retour à l'Atlas territorial").

### Palette CSS (variables `:root`)
```css
--navy:#070047;   /* titres, texte fort */
--blue:#000091;   /* accent principal, liens, boutons pleins */
--cyan:#00a7b5;   /* accent secondaire, badges */
--pale:#eef7f8;   /* fond hover clair */
--ink:#17202a;    /* texte courant */
--muted:#647381;  /* texte secondaire */
--line:#dce4e8;   /* bordures */
--paper:#fff;
--orange:#b8752a; /* accent tertiaire (ex : flux "sortants") */
--shadow:0 18px 50px rgba(0,31,63,.16);
```

### Structure de page type
```
<header class="topbar">          <!-- 111px de haut, grid: logo(104px) | titre | action -->
  logo (brand-logo-link → hub)
  title-block : eyebrow (majuscules, bleu, letter-spacing) + h1 (navy, gras) + p (muted, sous-titre)
  action à droite : bouton "livebox" (pilule blanche, statut/action) OU bouton mobile "Données"
</header>

<main class="workspace">          <!-- grid: sidebar(390px) | reste, gap 16px, padding 16px -->
  <aside class="sidebar">          <!-- carte blanche, radius 23px, shadow, colonne flex -->
    sidebar-intro (rond numéroté cyan "01" + eyebrow + h2 + description)
    search-box (label + input + bouton flèche navy)
    search-results (dropdown position:absolute)
    quick-actions (2 boutons : "Recentrer" outline + action principale pleine navy)
    theme-heading (bandeau "SECTION EN MAJUSCULES")
    ... contrôles spécifiques (toggles, sliders) ...
    sources-inline (bouton texte discret "Sources, millésimes et licences")
    sidebar-footer (fond gris clair, pastille verte "fresh-dot" + statut)
  </aside>

  <section class="map-shell">      <!-- carte Leaflet, radius 25px, shadow -->
    #map (Leaflet + fond OSM ou CARTO, filtré grayscale(.75) saturate(.4) brightness(1.08))
    map-legend (carte flottante top-right)
    map-note (statut flottant bottom-left, pastille verte pulse)
  </section>

  <aside class="detail-panel">     <!-- IMPORTANT : panneau flottant à DROITE, PAS dans la sidebar -->
    <!-- position:absolute; right:16px; top/bottom:16px; width:390px; -->
    <!-- transform:translateX(calc(105% + 16px)) par défaut, .open → translateX(0) -->
    close-btn (rond, ×)
    detail-tag (eyebrow) + h2 (nom entité sélectionnée) + subtitle
    property-grid (2 colonnes de KPI : bordure top colorée, petit label + gros chiffre)
    trajectory-card / listes classées (lignes "label — valeur")
  </aside>
</main>

<dialog class="dialog">           <!-- modales natives <dialog>, ouvertes via .showModal() -->
  dialog-close (rond, ×, position absolute)
  dialog-header (eyebrow + h2 + description)
  contenu (source-cards en grid 2 colonnes, dashboard-kpis, canvas Chart.js si besoin)
</dialog>
```

### Point le plus important, à ne PAS rater (erreur commise puis corrigée sur ce projet)

**Le "panneau latéral" avec la dataviz par entité (ville/commune) N'EST PAS dans la sidebar de gauche.** C'est un **second panneau flottant à droite** (`.detail-panel`), qui glisse depuis le bord droit quand on sélectionne une commune (recherche ou clic sur la carte). La sidebar de gauche reste réservée aux **contrôles** (recherche, filtres, couches). Confondre les deux a été une erreur corrigée en cours de route — c'est LE pattern signature de ces pages, à respecter strictement dès la première itération.

### Comportement responsive
- `<980px` : livebox masquée, sidebar réduite à 330px, topbar compacte.
- `<700px` : sidebar devient un **tiroir off-canvas** (`transform:translateX(calc(-100% - 16px))`, classe `.open` pour l'afficher), déclenché par un bouton `.mobile-layers` ("Données") qui apparaît dans le topbar. **La carte (`.map-shell`) doit rester visible en plein écran par défaut** — ne jamais faire `display:none` dessus (bug commis et corrigé : sur mobile, l'utilisateur ne voyait plus rien du tout car la carte entière était masquée).
- Le detail-panel passe en `width:calc(100% - 32px)` sur mobile.

### Composants réutilisables identifiés
- `.dialog` (natif `<dialog>`) pour "Comprendre la carte" / "Sources & données" / "Données & évolutions" (dashboard avec Chart.js si graphiques).
- `.source-cards` (grid 2 col) pour lister les jeux de données sources avec lien externe.
- Recherche avec autocomplete maison (pas de lib) : `<input>` + `<div id="searchResults">` rempli dynamiquement, boutons cliquables, fermeture au clic extérieur.

## Ce projet précis : `val-doise-domicile-travail`

### Objectif
Carte interactive des flux domicile-travail (navettes pendulaires) du Val-d'Oise, sur le modèle d'interaction de **regio.toekom.st** : on sélectionne UNE commune, on voit tous ses flux (arcs courbes vers les communes de travail pour les résidents, et depuis les communes de résidence pour les actifs qui viennent y travailler), avec un curseur de seuil minimal et un choix de sens (sortant/entrant).

### Données
- Source : **INSEE**, base *« Mobilités professionnelles en 2022 : déplacements domicile — lieu de travail »* (RP2022, la plus récente), page : https://www.insee.fr/fr/statistiques/8582949
- Fichier utilisé : `base-flux-mobilite-domicile-lieu-travail-2022_csv.zip` — déjà agrégé par paire (commune résidence × commune travail × effectif estimé), pas besoin de repartir de la microdonnée pondérée (`RP2022_mobpro`, plus complexe).
- Licence Ouverte / Open Licence (Etalab), réutilisation libre avec attribution.
- Colonnes du CSV source : `CODGEO;LIBGEO;DCLT;L_DCLT;NBFLUX_C22_ACTOCC15P` (commune résidence, nom, commune travail, nom, effectif estimé décimal).
- Contours communaux Val-d'Oise + départements limitrophes IDF : repo GitHub `gregoiredavid/france-geojson` (dossier `departements/95-val-d-oise/`, etc.).
- Centroïdes de toutes les communes de France : API `https://geo.api.gouv.fr/communes?fields=nom,code,centre,codeDepartement&format=json&geometry=centre`.

### Traitement des données (`scripts/build_data.py`)
- Filtre les flux touchant au moins une commune du 95 (résidence OU travail), seuil minimum conservé = 1 actif estimé.
- **Paris/Lyon/Marseille sont publiés par arrondissement** dans le fichier INSEE (codes `751xx`, `691xx`, `132xx`) → regroupés ici au code commune parent (`75056`, `69123`, `13055`) et fusionnés (sinon doublons d'arcs).
- **Flux transfrontaliers exclus** (codes spéciaux type `BE540`, `SU112`, `AL157`, `LU320`, `ZZZZZ` pour Belgique/Suisse/Allemagne/Luxembourg/non-déterminé) — pas de centroïde disponible, ~150 lignes de faible volume, à noter comme limite dans "Comprendre la carte" si repris ailleurs.
- Sortie : `data/processed/flows.json` (liste de `{o, oname, olon, olat, o95, d, dname, dlon, dlat, d95, v}`) et `data/processed/communes95.json` (183 communes avec total de flux, pour peupler la recherche).

### Architecture technique — le point technique le plus délicat

**Carte Leaflet (fond OSM réel) + overlay SVG D3 pour les arcs courbes**, PAS une projection D3 statique plaquée sur un fond sombre (première itération jetée, corrigée après retour utilisateur). Technique :

```js
const map = L.map("map", {...}).setView(VDO_CENTER, 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {...}).addTo(map);

const overlaySvg = d3.select(map.getPanes().overlayPane).append("svg").attr("class", "flow-overlay");
const overlayG = overlaySvg.append("g").attr("class", "leaflet-zoom-hide");
// gArcs, gPoints à l'intérieur de overlayG

function updateOverlayFrame() {
  const bounds = map.getBounds().pad(0.3);
  const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
  const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());
  overlaySvg.attr("width", ...).attr("height", ...).style("left", topLeft.x+"px").style("top", topLeft.y+"px");
  overlayG.attr("transform", `translate(${-topLeft.x},${-topLeft.y})`);
}
map.on("zoom viewreset move moveend zoomend", () => { updateOverlayFrame(); render(); });
```
Les coordonnées des arcs sont recalculées à chaque pan/zoom via `map.latLngToLayerPoint([lat, lon])`, et les courbes sont des quadratiques `M x0,y0 Q cx,cy x1,y1` avec un point de contrôle décalé perpendiculairement (18% de la distance) pour la courbure façon regio.toekom.st.

**Piège rencontré et corrigé** : `map.setView(latlng, zoom)` est **animé par défaut**, donc si on appelle `render()` juste après (synchrone), les `latLngToLayerPoint` utilisés sont ceux d'AVANT la transition → arcs mal placés/invisibles au premier chargement. Fix : toujours utiliser `{ animate: false }` sur les `setView` programmatiques (sélection de commune, recentrage), et écouter aussi `moveend`/`zoomend` en plus de `move`/`zoom`/`viewreset`.

### Couleurs spécifiques à ce projet (dans la palette DDT95)
- Flux **sortants** (résident travaillant ailleurs) : `--orange` (#b8752a)
- Flux **entrants** (actif venant travailler ici) : `--blue` (#000091)
- Commune sélectionnée sur la carte : `--cyan` (#00a7b5) en surbrillance

### Structure du repo
```
index.html                        page principale
css/style.css                     design system (dérivé de artificialisation-zan95/styles.css)
js/app.js                         logique Leaflet + D3 overlay + recherche + panneau détail + dialog
assets/prefet-val-doise.svg       logo officiel (copié depuis artificialisation-zan95)
assets/fonts/Marianne-*.woff2     police officielle (copiée depuis artificialisation-zan95)
data/raw/                         sources brutes (CSV INSEE volumineux gitignoré, geojson bruts conservés)
data/processed/flows.json         flux traités (~5 Mo)
data/processed/communes95.json    communes du 95 avec totaux
data/processed/*.geojson          contours (dept 95, communes 95, IDF contexte)
scripts/build_data.py             pipeline de reconstruction des données
README.md
HANDOFF.md                        ce fichier
```

### État actuel / déployé
- Live : https://ddt95.github.io/val-doise-domicile-travail/
- GitHub Pages activé, build via branche `main`, dossier racine.
- Toutes les corrections ci-dessus sont poussées et déployées (dernier commit : panneau détail à droite).

### Questions encore ouvertes avec l'utilisateur (à lui reposer si besoin)
1. Faut-il ajouter cette carte comme 11e lecture sur le hub `atlas-territorial-95` (page d'accueil, section "Les dix lectures"), ou l'intégrer plutôt dans `transport95` ("Mobilités & transports"), ou la laisser en repo autonome pour l'instant ?
2. Faut-il traiter les flux transfrontaliers exclus (Belgique/Suisse/Allemagne/Luxembourg) dans une v2 ?
3. L'utilisateur a mentionné avoir "d'autres idées" pour l'onglet "Comprendre" / la page d'accueil de l'atlas — pas encore détaillées, à lui demander.

## Consignes générales pour la suite (déduites de l'échange)
- **Toujours regarder le rendu réel** d'une page de référence existante avant de coder une nouvelle page ou une nouvelle fonctionnalité — ne pas improviser un design "dans l'esprit" sans l'avoir vérifié pixel par pixel contre `artificialisation-zan95`.
- L'utilisateur est **exigeant sur la fidélité visuelle** à son système existant (a réagi fermement à un premier essai hors-charte : "t'es pas sérieux").
- Compte GitHub `DDT95` : accès complet en écriture/push disponible pour l'IA qui reprend le projet (l'utilisateur l'a explicitement autorisé, "avec tous les droits").
- Toujours **tester visuellement** (desktop + mobile ≤700px) avant de considérer une page terminée — plusieurs bugs de rendu (carte invisible, arcs mal positionnés) n'ont été détectés qu'en testant réellement dans un navigateur, pas en relisant le code.
