(function () {
  "use strict";
  const openerWindow = window.opener;
  const app = openerWindow && openerWindow.mobiliteApp;
  const statusEl = document.getElementById("pdfStatus");
  const previewMode = new URLSearchParams(location.search).get("preview") === "1";
  if (!app) {
    document.body.innerHTML = '<p style="padding:40px;font:16px Marianne,Arial,sans-serif">Cette page s’ouvre depuis le bouton « Imprimer la carte » de Domicile ↔ Travail.</p>';
    return;
  }
  const meta = app.meta();
  if (!meta) {
    document.body.innerHTML = '<p style="padding:40px;font:16px Marianne,Arial,sans-serif">Sélectionnez une commune ou un EPCI sur la carte avant d’imprimer.</p>';
    return;
  }

  const { state, map: liveMap } = app;
  const territories = app.territories();
  const department = app.department();

  // La France métropolitaine (+ Corse) sert de cadre : quelques flux pointent vers l'outre-mer
  // (Martinique, Réunion, Guyane...), à des milliers de km. Un fitBounds naïf sur toutes les
  // extrémités de flux dézoomerait la carte jusqu'à l'hémisphère et rendrait le Val-d'Oise
  // invisible. Ces flux réels restent comptés mais sont exclus du cadrage et du tracé A3.
  const METRO_BOUNDS = { latMin: 41, latMax: 51.5, lonMin: -5.5, lonMax: 10 };
  const inMetro = (lat, lon) => lat >= METRO_BOUNDS.latMin && lat <= METRO_BOUNDS.latMax && lon >= METRO_BOUNDS.lonMin && lon <= METRO_BOUNDS.lonMax;
  const allRows = app.rows();
  const rows = allRows.filter((r) => inMetro(r.olat, r.olon) && inMetro(r.dlat, r.dlon));
  const distantCount = allRows.length - rows.length;

  const directionLabel = meta.showOut && meta.showIn
    ? "flux sortants et entrants"
    : meta.showOut ? "flux sortants uniquement" : meta.showIn ? "flux entrants uniquement" : "aucun flux affiché";
  document.getElementById("printTitle").textContent = `Domicile ↔ Travail · ${meta.name}`;
  document.getElementById("printSubtitle").textContent = `${meta.territoryType} · ${directionLabel} · seuil ≥ ${meta.threshold} actifs`;
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  document.getElementById("printSources").innerHTML = `<span class="src-line">Source : Insee, Mobilités professionnelles 2022 — déplacements domicile-lieu de travail (RP2022), Licence Ouverte</span><span class="src-line">Auteur : DDT 95</span><span class="src-line">Date : ${today}</span>`;

  document.getElementById("printLegend").innerHTML = `
    <strong class="legend-title">Flux domicile-travail</strong>
    <div class="flow-legend-rows">
      <span><i style="background:#b8752a"></i>Sortants — résidents travaillant ailleurs</span>
      <span><i style="background:#000091"></i>Entrants — actifs venant travailler ici</span>
    </div>
    <small class="legend-note">Épaisseur du trait proportionnelle au nombre d'actifs. Flux affichés : ${meta.threshold} actifs ou plus.${distantCount ? ` ${distantCount} flux vers l'outre-mer ou l'étranger non représentés sur ce cadrage.` : ""}</small>
  `;

  const map = L.map("printMapCanvas", { zoomControl: false, attributionControl: false, preferCanvas: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, tap: false });
  const NeutralTileLayer = L.TileLayer.extend({
    createTile(coords, done) {
      const tile = document.createElement("canvas");
      const size = this.getTileSize(); tile.width = size.x; tile.height = size.y;
      const context = tile.getContext("2d"); const image = new Image(); image.crossOrigin = "anonymous";
      image.onload = () => {
        context.drawImage(image, 0, 0, size.x, size.y); const pixels = context.getImageData(0, 0, size.x, size.y); const data = pixels.data;
        for (let i = 0; i < data.length; i += 4) { const gray = .2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]; data[i] = Math.min(255, gray * 1.08); data[i + 1] = Math.min(255, gray * 1.08); data[i + 2] = Math.min(255, gray * 1.08); }
        context.putImageData(pixels, 0, 0); done(null, tile);
      };
      image.onerror = (error) => done(error, tile); image.src = this.getTileUrl(coords); return tile;
    },
  });
  new NeutralTileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  const territoryLayer = L.geoJSON(territories, { style: (feature) => ({ ...feature.properties._printStyle, interactive: false }) }).addTo(map);
  if (department) L.geoJSON(department, { interactive: false, style: { color: "#000091", weight: 2.2, opacity: .9, fillOpacity: 0 } }).addTo(map);

  // Emprise : le territoire sélectionné + chaque extrémité de flux réellement affichée.
  // Les flux peuvent sortir très largement du Val-d'Oise (Paris, La Défense...) : un
  // cadrage fixe sur le département couperait les liaisons. Le zoom s'adapte donc au
  // territoire choisi ET à la portée réelle de ses flux — resserré pour une commune aux
  // flux locaux, élargi automatiquement dès qu'un flux sort du département.
  const coreLayers = [];
  territoryLayer.eachLayer((layer) => { if (layer.feature.properties._printCore) coreLayers.push(layer); });
  const bounds = coreLayers.length
    ? L.featureGroup(coreLayers).getBounds()
    : (department ? L.geoJSON(department).getBounds() : L.latLngBounds([liveMap.getCenter(), liveMap.getCenter()]));
  rows.forEach((r) => {
    bounds.extend([r.olat, r.olon]);
    bounds.extend([r.dlat, r.dlon]);
  });

  // Arcs : dessinés en L.polyline natif, positionné par Leaflet lui-même (comme le territoire
  // et le contour départemental), plutôt qu'une surcouche SVG D3 à repositionner manuellement.
  // Une surcouche manuelle (position CSS + transform recalculés à la main) s'est révélée
  // produire, dans ce contexte précis, des arcs visuellement décalés du reste de la carte alors
  // que tous les calculs de coordonnées vérifiaient juste à l'unité près — signe d'un problème
  // de peinture du navigateur sur cette combinaison précise (SVG positionné en CSS imbriqué
  // dans un panneau Leaflet), pas d'un bug de projection. Confier le tracé à Leaflet évite la
  // question entièrement : la même mécanique qui positionne déjà correctement les polygones.
  function quadraticPoint(p0, control, p2, t) {
    const mt = 1 - t;
    return { x: mt * mt * p0.x + 2 * mt * t * control.x + t * t * p2.x, y: mt * mt * p0.y + 2 * mt * t * control.y + t * t * p2.y };
  }
  function curvedLatLngs(s, t) {
    const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy);
    const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2, offset = dist * 0.18;
    const nx = -dy / (dist || 1), ny = dx / (dist || 1);
    const control = { x: mx + nx * offset, y: my + ny * offset };
    const STEPS = 24;
    const latlngs = [];
    for (let i = 0; i <= STEPS; i++) {
      const p = quadraticPoint(s, control, t, i / STEPS);
      latlngs.push(map.layerPointToLatLng([p.x, p.y]));
    }
    return latlngs;
  }
  const arcLayer = L.layerGroup().addTo(map);
  function renderArcs() {
    arcLayer.clearLayers();
    const code = state.selected;
    const maxV = d3.max(rows, (d) => d.v) || 1;
    const widthScale = d3.scaleSqrt().domain([meta.threshold, Math.max(maxV, meta.threshold + 1)]).range([0.8, 7]);
    const opacityScale = d3.scaleSqrt().domain([meta.threshold, Math.max(maxV, meta.threshold + 1)]).range([0.4, 0.92]);
    const arcs = rows.map((f) => {
      const isOut = f.o === code;
      const s = map.latLngToLayerPoint([f.olat, f.olon]);
      const t = map.latLngToLayerPoint([f.dlat, f.dlon]);
      return { ...f, isOut, latlngs: curvedLatLngs(s, t), w: widthScale(f.v), op: opacityScale(f.v) };
    }).sort((a, b) => a.v - b.v);

    arcs.forEach((d) => {
      L.polyline(d.latlngs, { color: d.isOut ? "#b8752a" : "#000091", weight: d.w, opacity: d.op, interactive: false, lineCap: "round" }).addTo(arcLayer);
    });

    const seen = new Set();
    arcs.forEach((d) => {
      const otherKey = (d.isOut ? d.d : d.o) + (d.isOut ? "out" : "in");
      if (seen.has(otherKey)) return;
      seen.add(otherKey);
      const latlng = d.isOut ? [d.dlat, d.dlon] : [d.olat, d.olon];
      L.circleMarker(latlng, { radius: 3, color: "#fff", weight: 0.8, fillColor: d.isOut ? "#b8752a" : "#000091", fillOpacity: 1, interactive: false }).addTo(arcLayer);
    });
  }

  function niceScaleNumber(number) { const power = Math.pow(10, String(Math.floor(number)).length - 1); const digit = number / power; return power * (digit >= 10 ? 10 : digit >= 5 ? 5 : digit >= 3 ? 3 : digit >= 2 ? 2 : 1); }
  function renderScaleBar() {
    const targetPx = 190, size = map.getSize(), y = size.y / 2, maxMeters = map.distance(map.containerPointToLatLng([0, y]), map.containerPointToLatLng([targetPx, y])), meters = niceScaleNumber(maxMeters), fullPx = targetPx * meters / maxMeters, segments = 4, segmentPx = fullPx / segments, unit = meters >= 1000 ? meters / 1000 : meters, unitLabel = meters >= 1000 ? "km" : "m";
    const bars = Array.from({ length: segments }, (_, i) => `<div class="scale-seg ${i % 2 ? "off" : "on"}" style="width:${segmentPx}px"></div>`).join("");
    const ticks = Array.from({ length: segments + 1 }, (_, i) => `<span style="left:${i * segmentPx}px">${(unit / segments * i).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span>`).join("");
    document.getElementById("printScale").innerHTML = `<div class="scale-frame" style="width:${fullPx}px"><div class="scale-bar-row">${bars}</div><div class="scale-ticks" style="width:${fullPx}px">${ticks}<span class="scale-unit" style="left:${fullPx}px">${unitLabel}</span></div></div>`;
  }
  async function buildPdf() {
    const canvas = await html2canvas(document.getElementById("printPage"), { scale: 2.2, useCORS: true, backgroundColor: "#ffffff" });
    const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
    pdf.addImage(canvas.toDataURL("image/jpeg", .92), "JPEG", 0, 0, 420, 297, undefined, "FAST");
    window.location.replace(URL.createObjectURL(pdf.output("blob")));
  }
  // map.whenReady()/"moveend" se sont révélés peu fiables ici : la carte n'a jamais reçu de vue
  // avant ce point (aucun setView/fitBounds initial), donc whenReady n'a rien de garanti à
  // attendre — parfois un mécanisme interne de Leaflet lui donne malgré tout une vue par défaut
  // (arcs rendus, mais depuis une origine de pixels non pertinente), parfois rien ne se
  // déclenche jamais (page bloquée indéfiniment sur "Préparation..."). Avec animate:false,
  // fitBounds/setView appellent _resetView de façon SYNCHRONE : la vue est donc déjà définitive
  // dès la ligne suivante, sans dépendre d'aucun événement.
  map.invalidateSize();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], animate: false });
  else map.setView(liveMap.getCenter(), liveMap.getZoom(), { animate: false });
  renderArcs();
  renderScaleBar();
  if (previewMode) {
    statusEl.classList.add("done");
  } else {
    setTimeout(() => buildPdf().catch((error) => { console.error(error); statusEl.innerHTML = "La génération du PDF a échoué.<small>Ferme cette page et réessaie depuis la carte.</small>"; }), 900);
  }
})();
