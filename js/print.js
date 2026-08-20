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

  // Un premier cadrage synchrone est indispensable ici : Leaflet ne considère la carte comme
  // "chargée" (map.whenReady) qu'une fois qu'une vue lui a été donnée. Sans lui, whenReady
  // n'appelle jamais son callback et toute la suite (rendu des arcs, PDF) reste bloquée.
  map.invalidateSize();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], animate: false });
  else map.setView(liveMap.getCenter(), liveMap.getZoom(), { animate: false });

  // Arcs (surcouche SVG D3 reprenant le rendu de la carte principale)
  const overlaySvg = d3.select(map.getPanes().overlayPane).append("svg").attr("class", "flow-overlay");
  const overlayG = overlaySvg.append("g");
  const gArcs = overlayG.append("g");
  const gPoints = overlayG.append("g");
  function projectLatLon(lon, lat) { return map.latLngToLayerPoint([lat, lon]); }
  function updateOverlayFrame() {
    const b = map.getBounds().pad(0.3);
    const topLeft = map.latLngToLayerPoint(b.getNorthWest());
    const bottomRight = map.latLngToLayerPoint(b.getSouthEast());
    overlaySvg.attr("width", bottomRight.x - topLeft.x).attr("height", bottomRight.y - topLeft.y).style("left", topLeft.x + "px").style("top", topLeft.y + "px");
    overlayG.attr("transform", `translate(${-topLeft.x},${-topLeft.y})`);
  }
  function curvedPath(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, dist = Math.sqrt(dx * dx + dy * dy);
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, offset = dist * 0.18;
    const nx = -dy / (dist || 1), ny = dx / (dist || 1);
    const cx = mx + nx * offset, cy = my + ny * offset;
    return `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
  }
  function renderArcs() {
    updateOverlayFrame();
    const code = state.selected;
    const maxV = d3.max(rows, (d) => d.v) || 1;
    const widthScale = d3.scaleSqrt().domain([meta.threshold, Math.max(maxV, meta.threshold + 1)]).range([0.8, 7]);
    const opacityScale = d3.scaleSqrt().domain([meta.threshold, Math.max(maxV, meta.threshold + 1)]).range([0.4, 0.92]);
    const arcs = rows.map((f) => {
      const isOut = f.o === code;
      const s = projectLatLon(f.olon, f.olat);
      const t = projectLatLon(f.dlon, f.dlat);
      return { ...f, isOut, d: curvedPath(s.x, s.y, t.x, t.y), w: widthScale(f.v), op: opacityScale(f.v) };
    }).sort((a, b) => a.v - b.v);

    gArcs.selectAll("path")
      .data(arcs)
      .join("path")
      .attr("d", (d) => d.d)
      .attr("fill", "none")
      .attr("stroke", (d) => (d.isOut ? "#b8752a" : "#000091"))
      .attr("stroke-width", (d) => d.w)
      .attr("stroke-opacity", (d) => d.op)
      .attr("stroke-linecap", "round");

    const points = [];
    const seen = new Set();
    arcs.forEach((d) => {
      const otherKey = (d.isOut ? d.d : d.o) + (d.isOut ? "out" : "in");
      if (seen.has(otherKey)) return;
      seen.add(otherKey);
      const lon = d.isOut ? d.dlon : d.olon, lat = d.isOut ? d.dlat : d.olat;
      const p = projectLatLon(lon, lat);
      points.push({ x: p.x, y: p.y, isOut: d.isOut });
    });
    gPoints.selectAll("circle")
      .data(points)
      .join("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 3)
      .attr("fill", (d) => (d.isOut ? "#b8752a" : "#000091"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.8);
  }

  function niceScaleNumber(number) { const power = Math.pow(10, String(Math.floor(number)).length - 1); const digit = number / power; return power * (digit >= 10 ? 10 : digit >= 5 ? 5 : digit >= 3 ? 3 : digit >= 2 ? 2 : 1); }
  function renderScaleBar() {
    const targetPx = 190, size = map.getSize(), y = size.y / 2, maxMeters = map.distance(map.containerPointToLatLng([0, y]), map.containerPointToLatLng([targetPx, y])), meters = niceScaleNumber(maxMeters), fullPx = targetPx * meters / maxMeters, segments = 4, segmentPx = fullPx / segments, unit = meters >= 1000 ? meters / 1000 : meters, unitLabel = meters >= 1000 ? "km" : "m";
    const bars = Array.from({ length: segments }, (_, i) => `<div class="scale-seg ${i % 2 ? "off" : "on"}" style="width:${segmentPx}px"></div>`).join("");
    const ticks = Array.from({ length: segments + 1 }, (_, i) => `<span style="left:${i * segmentPx}px">${(unit / segments * i).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span>`).join("");
    document.getElementById("printScale").innerHTML = `<div class="scale-frame" style="width:${fullPx}px"><div class="scale-bar-row">${bars}</div><div class="scale-ticks" style="width:${fullPx}px">${ticks}<span class="scale-unit" style="left:${fullPx}px">${unitLabel}</span></div></div>`;
  }
  async function buildPdf() {
    const svgBefore = document.querySelector(".flow-overlay path") ? document.querySelector(".flow-overlay path").getAttribute("d") : null;
    const canvas = await html2canvas(document.getElementById("printPage"), { scale: 2.2, useCORS: true, backgroundColor: "#ffffff" });
    const svgAfter = document.querySelector(".flow-overlay path") ? document.querySelector(".flow-overlay path").getAttribute("d") : null;
    const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
    pdf.addImage(canvas.toDataURL("image/jpeg", .92), "JPEG", 0, 0, 420, 297, undefined, "FAST");
    window.__debugInfo = { svgBefore, svgAfter, mapPaneTransform: getComputedStyle(document.querySelector(".leaflet-map-pane")).transform };
    if (new URLSearchParams(location.search).get("debugHold") === "1") { statusEl.innerHTML = "DEBUG HOLD — voir window.__debugInfo"; return; }
    window.location.replace(URL.createObjectURL(pdf.output("blob")));
  }
  map.whenReady(() => setTimeout(() => {
    map.invalidateSize();
    // Les positions des arcs (surcouche D3, projetées via latLngToLayerPoint) ne doivent être
    // calculées qu'une fois la vue définitivement stabilisée : Leaflet ne remet à jour son
    // origine de pixels qu'à "moveend". Un seul fitBounds au total (rien avant celui-ci) pour
    // garantir que la vue change réellement et que "moveend" se déclenche bien — un filet de
    // sécurité déclenche quand même le rendu si l'événement ne survenait pas.
    let settled = false;
    function onSettled() {
      if (settled) return;
      settled = true;
      renderArcs();
      renderScaleBar();
      if (previewMode) { statusEl.classList.add("done"); return; }
      setTimeout(() => buildPdf().catch((error) => { console.error(error); statusEl.innerHTML = "La génération du PDF a échoué.<small>Ferme cette page et réessaie depuis la carte.</small>"; }), 900);
    }
    map.once("moveend", onSettled);
    setTimeout(onSettled, 400);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], animate: false });
    else map.setView(liveMap.getCenter(), liveMap.getZoom(), { animate: false });
  }, 500));
})();
