# Passation complète — nouvelle page « Comment se loge-t-on dans le Val-d’Oise ? »

> Document de cadrage destiné à l’agent ou au développeur chargé de créer un nouveau site GitHub Pages DDT 95 sur le logement, relié à l’accueil de l’Atlas territorial.

## 1. Résultat attendu

Créer un **nouveau dépôt GitHub public autonome** sous l’organisation `DDT95`, sur le même modèle fonctionnel et graphique que la page Domicile ↔ Travail :

- titre : **Comment se loge-t-on dans le Val-d’Oise ?** ;
- sous-titre : **Parc social, vacance, construction et rénovation expliqués à hauteur de territoire.** ;
- dépôt recommandé : `val-doise-logement-habitat` ;
- URL cible : `https://ddt95.github.io/val-doise-logement-habitat/` ;
- hébergement : GitHub Pages, branche `main`, racine du dépôt ;
- raccordement : nouvelle carte dans la rubrique **Comprendre** du dépôt `atlas-territorial-95` ;
- granularités : **Commune / EPCI**, avec Argenteuil et Bezons traitées comme communes particulières dans le choix EPCI, comme sur Domicile ↔ Travail ;
- fiche territoriale exportable en PDF, ouverte sur le territoire sélectionné, **sans menu de sélection dans la fiche**.

Ce document prépare la création. Il ne remplace pas la validation visuelle ni la vérification des données avant publication.

## 2. Dépôts et pages de référence obligatoires

### Modèle fonctionnel principal

- dépôt : `https://github.com/DDT95/val-doise-domicile-travail`
- page : `https://ddt95.github.io/val-doise-domicile-travail/`
- fichiers à étudier avant toute modification :
  - `index.html` ;
  - `css/style.css` ;
  - `js/app.js` ;
  - `fiche.html` ;
  - `css/fiche.css` ;
  - `js/fiche.js` ;
  - `HANDOFF.md` ;
  - `design-qa.md`.

### Référence graphique historique

- dépôt : `https://github.com/DDT95/artificialisation-zan95`
- page : `https://ddt95.github.io/artificialisation-zan95/`

### Accueil à modifier

- dépôt : `https://github.com/DDT95/atlas-territorial-95`
- page : `https://ddt95.github.io/atlas-territorial-95/`

Ne pas réinventer une charte. Réutiliser Marianne, le logo Préfet du Val-d’Oise, les couleurs, rayons, espacements, ombres, panneaux et comportements responsives existants.

## 3. Expérience utilisateur à reprendre

### Ordre impératif du panneau gauche

1. Introduction courte ;
2. recherche du territoire ;
3. boutons `Recentrer` et `Données & évolutions` ;
4. choix visuel **Communes / EPCI** sous la recherche ;
5. couches thématiques sous forme de cartes avec interrupteurs ;
6. sources, millésimes et licences ;
7. statut de fraîcheur des données.

Ne pas placer le choix Commune/EPCI avant la recherche. Ne pas utiliser un menu déroulant générique pour ce choix : reprendre les cartes-interrupteurs du modèle.

### Carte

- Leaflet, fond cartographique réel désaturé ;
- contours communaux en mode Commune ;
- contours EPCI réellement agrégés ou couche EPCI dédiée en mode EPCI ;
- en mode EPCI, **aucun nom communal au survol** : une seule infobulle partagée affiche le nom de l’EPCI ;
- une seule entité sélectionnée à la fois ;
- panneau de détail flottant à droite ;
- la carte reste visible sur mobile ; le panneau gauche devient un tiroir.

### Fiche territoriale

- route conseillée : `fiche.html?type=commune&id=95018` ou `fiche.html?type=epci&id=...` ;
- pas de sélecteur Commune/EPCI dans la fiche ;
- titre uniquement sur la couverture du PDF ;
- sauts de page intelligents ;
- export déclenché uniquement par choix explicite de l’utilisateur ;
- variété de datavisualisations, sans sacrifier la lecture : KPI, donuts pour 2 à 4 catégories, barres pour les catégories nombreuses, courbes pour les séries temporelles, classements courts ;
- valeurs et libellés toujours visibles ; ne jamais dépendre uniquement de la couleur.

## 4. Proposition éditoriale

La page doit répondre à cinq questions simples.

1. **De quoi est composé le parc ?**
   - logements totaux ;
   - résidences principales, secondaires et logements vacants ;
   - maisons / appartements ;
   - ancienneté du parc ;
   - taille des logements ;
   - propriétaires / locataires privé / locataires HLM.

2. **Quelle place occupe le logement social ?**
   - nombre de logements sociaux ;
   - part du parc social ;
   - logements mis en service récemment ;
   - typologie et taille ;
   - vacance et mobilité dans le parc social ;
   - classes DPE du parc social ;
   - situation SRU lorsque la commune est dans le champ.

3. **Où la vacance est-elle durable ?**
   - vacance au recensement ;
   - vacance du parc privé ;
   - vacance privée depuis plus de deux ans ;
   - évolution pluriannuelle uniquement si la rupture de série est explicitement signalée.

4. **Où construit-on ?**
   - logements autorisés ;
   - logements commencés ;
   - individuel / collectif ;
   - série annuelle depuis 2013 ;
   - taux pour 1 000 habitants et pour 1 000 logements existants ;
   - cumul sur cinq ans, plus robuste qu’une seule année.

5. **Quel est le besoin de rénovation ?**
   - répartition DPE A à G sur les diagnostics observés ;
   - part F/G parmi les DPE valides ;
   - ancienneté du parc comme facteur de besoin ;
   - parc social énergivore via RPLS ;
   - présence d’une opération programmée Anah ;
   - ne pas présenter les DPE comme un recensement exhaustif du parc.

## 5. Jeux de données recommandés

### A. Socle principal — Insee, Recensement 2023 « Logement »

- producteur : Insee ;
- page : `https://www.insee.fr/fr/statistiques/9003154` ;
- millésime : 2023, géographie au 1er janvier 2026 ;
- accès : fichiers nationaux téléchargeables, à intégrer par pipeline ;
- granularité : commune ; agrégation EPCI à produire à partir des membres ;
- usages : ensemble des logements, catégories d’occupation, vacance RP, types, périodes de construction, pièces, statut d’occupation, taille des ménages ;
- fréquence : recensement diffusé annuellement ;
- prudence : les effectifs faibles issus du sondage sont fragiles. L’Insee indique que les effectifs inférieurs à 200 doivent être maniés avec précaution et que les comparaisons entre petits territoires sont déconseillées.

**Décision** : cette source forme le dénominateur principal du site. Elle doit être téléchargée et figée dans `data/raw/`, puis transformée en JSON léger dans `data/processed/`.

### B. Parc social — RPLS, SDES

- producteur : SDES, ministère de la Transition écologique ;
- catalogue : `https://www.data.gouv.fr/datasets/donnees-detaillees-au-logement-du-repertoire-des-logements-locatifs-des-bailleurs-sociaux-rpls` ;
- accès recommandé : catalogue DiDo / API DiDo ou ressource annuelle CSV ;
- granularité : logement puis agrégation commune/EPCI ;
- fréquence : annuelle, état au 1er janvier ;
- usages : stock social, année de construction, financement, conventionnement, typologie, première mise en location, vacance, mobilité, DPE ;
- licence : Licence Ouverte ;
- limites : le champ RPLS n’est pas strictement identique à l’inventaire SRU ; l’identité du bailleur propriétaire n’est pas diffusée dans le fichier détaillé public.

**Décision** : utiliser RPLS pour décrire le parc social, mais ne pas appeler automatiquement ce chiffre « logements SRU ».

### C. Inventaire SRU

- producteur : ministère chargé du Logement ;
- jeu : `https://www.data.gouv.fr/datasets/communes-et-inventaire-sru` ;
- fréquence : annuelle ;
- usages : commune soumise ou non, objectif, inventaire, taux, déficit éventuel ;
- limites : seules les communes du périmètre réglementaire figurent dans le jeu. Une absence ne signifie pas zéro logement social.

### D. Vacance privée — LOVAC open data

- producteur : ministère de la Transition écologique / Zéro Logement Vacant / Cerema ;
- jeu : `https://www.data.gouv.fr/datasets/logements-vacants-du-parc-prive-par-commune-departement-region-france-de-2020-a-2026` ;
- granularité : commune, département, région, France ;
- couverture actuelle : 2020 à 2026 ;
- usages : parc privé, vacance privée, vacance privée depuis plus de deux ans ;
- licence : Licence Ouverte 2.0 ;
- secret : valeurs inférieures à 11 logements secrétisées (`s`) ;
- rupture majeure : changement de collecte avec GMBI en 2023 puis rupture de production en 2025. Ne jamais tracer une tendance continue sans annotation visible.

**Décision** : utiliser la version agrégée open data. Ne pas incorporer de données LOVAC détaillées à l’adresse dans un site public.

### E. Construction — Sitadel3

- producteur : SDES ;
- présentation : `https://www.statistiques.developpement-durable.gouv.fr/construction-de-logements-resultats-fin-fevrier-2026-france-entiere` ;
- accès : explorateur DiDo et API DiDo ;
- séries annuelles : commune et EPCI ;
- couverture Sitadel3 annoncée : à partir de 2013 ;
- usages : logements autorisés et commencés, individuel/collectif, surface, cumul annuel ;
- fréquence : actualisation régulière ;
- limite : Sitadel mesure des événements administratifs. Une autorisation n’est pas un logement livré. Les données en date réelle et les listes open data ne doivent pas être mélangées sans méthode.

**Décision** : privilégier les séries annuelles officielles DiDo pour la carte et la fiche. Stocker un instantané local versionné pour ne pas dépendre de l’API au chargement de la page.

### F. Performance énergétique — ADEME, DPE v2

- producteur : ADEME ;
- jeu : `https://data.ademe.fr/datasets/dpe-v2-logements-existants` ;
- API Data Fair : `https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/` ;
- couverture : DPE postérieurs à la réforme de juillet 2021 ;
- usages : classes énergie et GES, consommation, année de construction, type de bâtiment ;
- fréquence : continue ;
- méthode : agréger hors navigateur, par code Insee, en conservant le nombre de DPE valides comme dénominateur ;
- limites : les DPE sont des observations, pas un recensement exhaustif. Risques de doublons, remplacements, adresses mal géocodées et biais de sélection.

**Décision** : afficher « parmi les DPE observés » et le nombre d’observations. Ne jamais écrire « part du parc » sans redressement documenté.

### G. Opérations programmées Anah

- producteur : Anah ;
- jeu : `https://www.data.gouv.fr/datasets/liste-des-communes-couvertes-par-une-operation-programmee` ;
- usages : signaler qu’un territoire est couvert par une OPAH, un PIG ou un dispositif comparable ;
- limite : mesure une politique ou un dispositif, pas le nombre de rénovations réalisées.

### H. Référentiels géographiques

- communes et EPCI : API Découpage administratif `https://geo.api.gouv.fr/` ;
- géométrie : utiliser une source publique stable, figée dans le dépôt ;
- jointure : code Insee commune sur 5 caractères ;
- EPCI : code SIREN sur 9 caractères ;
- conserver l’année du COG et une table de correspondance pour les communes nouvelles.

## 6. Ce qu’il ne faut pas promettre dans la V1

- **Nombre de rénovations MaPrimeRénov par commune** : pas de jeu national communal ouvert, stable et homogène identifié pour les réalisations récentes. L’API Mes Aides Réno calcule l’éligibilité ; elle ne fournit pas les travaux réalisés.
- **Vacance à l’adresse** : donnée restreinte et sensible. La publication doit rester agrégée.
- **Demande de logement social / délais d’attente** : ne l’intégrer que si une source SNE officielle, documentée et publiable est obtenue.
- **Prix et loyers** : hors périmètre initial. Une V2 pourrait mobiliser DVF et la carte des loyers, avec méthodologie dédiée.
- **DPE comme photographie exhaustive** : interdit éditorialement ; toujours afficher le dénominateur observé.

## 7. Indicateurs et calculs

Chaque indicateur doit avoir : `value`, `unit`, `year`, `source`, `denominator`, `quality_flag`.

### Indicateurs de base

- taux de vacance RP = logements vacants RP / ensemble des logements RP ;
- taux de vacance privée longue = vacants privés > 2 ans / parc privé LOVAC ;
- part sociale RPLS = logements RPLS / résidences principales Insee ;
- indice de construction = logements commencés sur 5 ans / population × 1 000 ;
- renouvellement du parc = logements commencés sur 5 ans / logements existants × 1 000 ;
- part F/G observée = DPE F + G / DPE valides A à G ;
- parc ancien = résidences principales construites avant 1971 / résidences principales avec période connue ;
- sous-occupation et suroccupation uniquement si les variables et dénominateurs Insee sont correctement maîtrisés.

### Gestion des valeurs absentes

- `null` = donnée absente ;
- `secret` = donnée secrétisée ;
- `not_applicable` = indicateur non applicable ;
- ne jamais transformer une absence ou `s` en zéro ;
- afficher « donnée secrétisée » ou « non disponible », pas `0`.

## 8. Architecture technique recommandée

```text
val-doise-logement-habitat/
├── index.html
├── fiche.html
├── css/
│   ├── style.css
│   └── fiche.css
├── js/
│   ├── app.js
│   └── fiche.js
├── assets/
│   ├── prefet-val-doise.svg
│   └── fonts/Marianne-*.woff2
├── data/
│   ├── raw/                 # fichiers sources ou manifestes de téléchargement
│   ├── processed/
│   │   ├── commune_profiles.json
│   │   ├── epci_profiles.json
│   │   ├── communes95.geojson
│   │   └── epcis95.geojson
│   └── sources.json         # URL, producteur, licence, millésime, date de récupération
├── scripts/
│   ├── fetch_sources.py
│   ├── build_profiles.py
│   ├── build_geographies.py
│   └── validate_data.py
├── tests/
│   └── expected_indicators.json
├── README.md
├── HANDOFF.md
└── design-qa.md
```

### Principe de robustesse

Le site GitHub Pages ne doit pas appeler les grosses API à chaque visite. Le pipeline récupère les sources, contrôle les schémas, agrège les données, puis écrit des JSON légers. Le navigateur ne charge que les fichiers `processed`.

### Commandes cibles

```bash
python3 scripts/fetch_sources.py
python3 scripts/build_geographies.py
python3 scripts/build_profiles.py
python3 scripts/validate_data.py
python3 -m http.server 8420
```

## 9. Contrôles qualité bloquants

1. Les 183 communes du Val-d’Oise sont présentes.
2. Chaque commune possède un code Insee unique sur 5 caractères.
3. Les EPCI sont agrégés sur leur **périmètre complet**, y compris les communes hors Val-d’Oise pour les EPCI interdépartementaux.
4. Argenteuil et Bezons restent sélectionnables en mode EPCI comme communes particulières.
5. Somme des catégories Insee proche de l’ensemble, avec tolérance documentée aux arrondis.
6. Aucun `s`, chaîne vide ou `NA` converti en zéro.
7. DPE : dédoublonnage des diagnostics remplacés et exclusion des étiquettes invalides.
8. LOVAC : rupture 2023/2025 visible dans la méthode et les graphiques.
9. Sitadel : ne pas confondre autorisé, commencé et achevé.
10. RPLS et SRU : libellés distincts.
11. Vérification manuelle d’au moins Argenteuil, Cergy, une petite commune rurale et un EPCI interdépartemental.
12. Test desktop, tablette, mobile et export PDF.

## 10. Proposition de couches cartographiques

Ordre recommandé dans le panneau :

### Structure du parc

- part d’appartements ;
- part de logements anciens ;
- part de locataires ;

### Parc social

- nombre de logements RPLS ;
- part RPLS des résidences principales ;
- situation SRU ;

### Vacance

- taux de vacance RP ;
- taux de vacance privée de plus de deux ans ;

### Construction

- logements commencés sur cinq ans ;
- construction pour 1 000 habitants ;

### Rénovation / énergie

- part F/G parmi les DPE observés ;
- nombre de DPE observés ;
- opération programmée Anah active.

Une seule couche choroplèthe active à la fois. Les couches de contexte peuvent rester cumulables si elles ne brouillent pas la lecture.

## 11. Fiche territoriale proposée

### Couverture

- nom du territoire ;
- commune ou EPCI ;
- millésimes ;
- phrase de lecture spécifique au territoire.

### 01 — Repères

- population ;
- logements ;
- résidences principales ;
- vacance ;
- logements sociaux ;
- construction récente.

### 02 — Habiter

- maisons / appartements ;
- propriétaires / locataires ;
- taille des logements ;
- ancienneté d’emménagement.

### 03 — Parc social

- stock RPLS ;
- typologie ;
- période de construction ;
- vacance/mobilité ;
- DPE social ;
- SRU si applicable.

### 04 — Vacance

- vacance RP ;
- vacance privée ;
- vacance privée longue ;
- série avec ruptures clairement annotées.

### 05 — Construire

- autorisés / commencés ;
- individuel / collectif ;
- série annuelle ;
- cumul cinq ans.

### 06 — Rénover

- DPE A-G observés ;
- F/G observés ;
- âge du parc ;
- dispositifs Anah présents ;
- encadré méthodologique sur la représentativité.

### 07 — Sources et méthode

- une ligne par source ;
- millésime et date de récupération ;
- définitions ;
- ruptures de série ;
- secret statistique ;
- licences.

## 12. Création du dépôt GitHub

À faire seulement après validation du nom :

```bash
gh repo create DDT95/val-doise-logement-habitat --public \
  --description "Comment se loge-t-on dans le Val-d’Oise ? Parc social, vacance, construction et rénovation à hauteur de territoire."
git init
git branch -M main
git remote add origin https://github.com/DDT95/val-doise-logement-habitat.git
git add .
git commit -m "Initialise l’atlas du logement"
git push -u origin main
```

Activer ensuite GitHub Pages sur `main` / `/ (root)` et vérifier le workflow `pages build and deployment` avant de modifier l’accueil.

## 13. Raccordement à la page d’accueil

Dans `atlas-territorial-95` :

1. ajouter une carte dans la rubrique **Comprendre** ;
2. titre : `Comment se loge-t-on dans le Val-d’Oise ?` ;
3. surtitre : `LOGEMENT · HABITAT` ;
4. description : `Parc social, vacance, construction et rénovation expliqués à hauteur de territoire.` ;
5. badge : `À explorer` uniquement lorsque le site est publié et testé ;
6. lien : `https://ddt95.github.io/val-doise-logement-habitat/` ;
7. conserver quatre blocs alignés et centrés sur la grille d’accueil ;
8. ne pas annoncer la page avant réussite du déploiement GitHub Pages.

## 14. Phasage conseillé

### V1 — socle fiable

- Insee logement 2023 ;
- RPLS ;
- LOVAC agrégé ;
- Sitadel3 annuel ;
- DPE v2 ;
- Commune/EPCI ;
- carte, panneau droit, fiche PDF ;
- raccordement à Comprendre.

### V1.1 — qualité et narration

- comparaisons départementales ;
- profils-types ;
- annotations automatiques sobres ;
- amélioration des séries ;
- audit accessibilité.

### V2 — données métier DDT/Anah

- réalisations de rénovation si extraction publiable ;
- demandes de logement social si source SNE autorisée ;
- loyers et prix avec méthodologie dédiée ;
- copropriétés et fragilité si droits et secret respectés.

## 15. Définition de « terminé »

Le travail n’est terminé que si :

- le dépôt autonome existe et est documenté ;
- la page est accessible sur GitHub Pages ;
- les sources sont récupérables par script ;
- les données sont datées et licenciées ;
- les modes Commune/EPCI fonctionnent sur la carte et dans les fiches ;
- les survols EPCI n’exposent pas les communes ;
- les fiches n’ont pas de menu de sélection ;
- les PDF sont propres, sans titre répété ni bloc coupé ;
- les valeurs secrétisées ou absentes sont correctement traitées ;
- la page d’accueil est reliée ;
- `design-qa.md` conclut `final result: passed` ;
- le site est vérifié visuellement après déploiement, pas seulement en local.

## 16. Prompt de reprise prêt à copier

```text
Crée un nouveau dépôt GitHub public DDT95 nommé val-doise-logement-habitat et construis la page « Comment se loge-t-on dans le Val-d’Oise ? » en suivant intégralement HANDOFF_NOUVELLE_PAGE_LOGEMENT.md du dépôt val-doise-domicile-travail.

La page doit reprendre fidèlement le modèle visuel et fonctionnel de Domicile ↔ Travail : recherche puis actions puis cartes-interrupteurs Commune/EPCI, carte Leaflet, panneau de détail à droite, fiches territoriales sans menu et export PDF à la demande. Utilise des données pérennes et sourcées : Insee Logement 2023, RPLS, inventaire SRU, LOVAC agrégé, Sitadel3, DPE v2 ADEME et opérations programmées Anah.

Commence par auditer les schémas et millésimes réels des sources. Construis un pipeline reproductible produisant des JSON légers. Ne transforme jamais les valeurs secrétisées en zéro. Vérifie visuellement la commune, l’EPCI, le mobile et le PDF. Publie sur GitHub Pages, puis ajoute la carte à la rubrique Comprendre de atlas-territorial-95 uniquement quand le déploiement est réussi.
```

---

Document préparé le 4 août 2026. Les URL, schémas et millésimes devront être revalidés au moment de l’implémentation, car les producteurs peuvent remplacer une ressource tout en conservant la page de catalogue.
