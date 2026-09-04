(function () {
  "use strict";

  const state = {
    communes: [],
    communesByCode: new Map(),
    communesByName: new Map(),
    epcis: [],
    epcisByCode: new Map(),
    epciColors: new Map(),
    flows: [],
    visibleRows: [],
    selected: null,
    scale: "commune",
    showOut: true,
    showIn: true,
    threshold: 10,
    deptSynthese: null,
  };

  // ---------- Map ----------
  const VDO_CENTER = [49.05, 2.15];
  const EPCI_COLORS = ["#18753c", "#6f4c9b", "#009099", "#c76524", "#d64d70", "#477a3c", "#ce0500", "#b88a16", "#45556c", "#3978b8", "#e45756", "#168b87"];
  const map = L.map("map", { zoomControl: true, minZoom: 7, maxZoom: 15 }).setView(VDO_CENTER, 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  let communesLayer, deptLayer;
  const territoryTooltip = L.tooltip({ sticky: true, className: "commune-tip", direction: "top", offset: [0, -8] });

  const overlaySvg = d3.select(map.getPanes().overlayPane).append("svg").attr("class", "flow-overlay");
  const overlayG = overlaySvg.append("g").attr("class", "leaflet-zoom-hide");
  const gArcs = overlayG.append("g").attr("class", "layer-arcs");
  const gPoints = overlayG.append("g").attr("class", "layer-points");

  function projectLatLon(lon, lat) {
    return map.latLngToLayerPoint([lat, lon]);
  }

  function updateOverlayFrame() {
    const bounds = map.getBounds().pad(0.3);
    const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
    const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());
    overlaySvg
      .attr("width", bottomRight.x - topLeft.x)
      .attr("height", bottomRight.y - topLeft.y)
      .style("left", topLeft.x + "px")
      .style("top", topLeft.y + "px");
    overlayG.attr("transform", `translate(${-topLeft.x},${-topLeft.y})`);
  }

  map.on("zoom viewreset move moveend zoomend", () => {
    updateOverlayFrame();
    render();
  });

  // ---------- Load data ----------
  Promise.all([
    d3.json("data/processed/departement95.geojson"),
    d3.json("data/processed/communes95.geojson"),
    d3.json("data/processed/communes95.json"),
    d3.json("data/processed/flows.json"),
    d3.json("data/processed/epci_profiles.json"),
  ]).then(([dept95, communes95Geo, communes95, flows, epciProfiles]) => {
    deptLayer = L.geoJSON(dept95, {
      style: { color: "#000091", weight: 2, fill: false, opacity: 0.55 },
    }).addTo(map);

    communesLayer = L.geoJSON(communes95Geo, {
      style: () => ({ color: "#8a9bb0", weight: 0.6, fillColor: "#000091", fillOpacity: 0.03 }),
      onEachFeature: (feature, layer) => {
        layer.on("click", () => selectFromMap(feature.properties.code));
        layer.on("mouseover", (event) => {
          highlightFromMap(feature.properties.code);
          territoryTooltip.setContent(territoryNameFromMap(feature.properties.code)).setLatLng(event.latlng).openOn(map);
        });
        layer.on("mousemove", (event) => territoryTooltip.setLatLng(event.latlng));
        layer.on("mouseout", () => {
          map.closeTooltip(territoryTooltip);
          styleTerritories(state.selected);
        });
      },
    }).addTo(map);

    state.communes = communes95;
    state.communesByCode = new Map(communes95.map((c) => [c.code, c]));
    state.communesByName = new Map(communes95.map((c) => [c.name.toLowerCase(), c]));
    state.flows = flows;
    state.epcis = Object.values(epciProfiles);
    state.epcisByCode = new Map(state.epcis.map((epci) => [epci.code, epci]));
    prepareEpciColors();
    state.deptSynthese = computeDepartementSynthese(flows, communes95);

    document.getElementById("mapStatus").textContent = `${flows.length.toLocaleString("fr-FR")} liaisons chargées`;
    updateOverlayFrame();
    if (deptLayer) map.fitBounds(deptLayer.getBounds(), { padding: [24, 24], animate: false });
    renderEmptyState();
    const initialParams = new URLSearchParams(location.search);
    if (initialParams.get("type") === "epci" && state.epcisByCode.has(initialParams.get("id"))) {
      setMapScale("epci");
      selectEpci(initialParams.get("id"));
    } else if (initialParams.get("scale") === "epci") {
      setMapScale("epci");
    } else if (initialParams.get("type") === "commune" && state.communesByCode.has(initialParams.get("id"))) {
      selectCommune(initialParams.get("id"));
    }
  });

  // ---------- Search ----------
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const searchResults = document.getElementById("searchResults");
  const territorySearchLabel = document.getElementById("territorySearchLabel");

  function prepareEpciColors() {
    const regular = state.epcis.filter((item) => !item.special).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const special = state.epcis.filter((item) => item.special).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    [...regular, ...special].forEach((item, index) => state.epciColors.set(item.code, EPCI_COLORS[index % EPCI_COLORS.length]));
  }

  function epciForCommune(code) {
    return state.epcis.find((item) => item.members.includes(code));
  }

  function territoryNameFromMap(code) {
    if (state.scale === "commune") return state.communesByCode.get(code)?.name || code;
    return epciForCommune(code)?.name || "Territoire hors EPCI affiché";
  }

  function highlightFromMap(code) {
    if (!communesLayer) return;
    if (state.scale === "commune") {
      communesLayer.eachLayer((layer) => {
        if (layer.feature.properties.code === code) {
          layer.setStyle({ fillOpacity: 0.5, weight: 2, color: "#007f8b" });
        }
      });
      return;
    }
    const hoveredEpci = epciForCommune(code);
    if (!hoveredEpci) return;
    const color = state.epciColors.get(hoveredEpci.code) || "#009099";
    const members = new Set(hoveredEpci.members);
    communesLayer.eachLayer((layer) => {
      if (members.has(layer.feature.properties.code)) {
        layer.setStyle({ fillColor: color, fillOpacity: 0.58, weight: 0.9, color, opacity: 0.75 });
      }
    });
  }

  function styleTerritories(selectedCode = null) {
    if (!communesLayer) return;
    communesLayer.eachLayer((layer) => {
      const communeCode = layer.feature.properties.code;
      if (state.scale === "commune") {
        const selected = communeCode === selectedCode;
        layer.setStyle({ fillColor: selected ? "#00a7b5" : "#dce8f1", fillOpacity: selected ? 0.42 : 0.28, weight: selected ? 2.2 : 0.85, color: selected ? "#007f8b" : "#71869a", opacity: 1 });
        layer.bringToFront();
        return;
      }
      const epci = epciForCommune(communeCode);
      const color = epci ? state.epciColors.get(epci.code) : "#8a9bb0";
      const selected = epci?.code === selectedCode;
      layer.setStyle({ fillColor: color, fillOpacity: selected ? 0.52 : 0.3, weight: selected ? 0.9 : 0.55, color: selected ? color : "#ffffff", opacity: selected ? 0.72 : 0.85 });
    });
  }

  function setMapScale(scale) {
    state.scale = scale;
    state.selected = null;
    searchInput.value = "";
    territorySearchLabel.textContent = scale === "epci" ? "Rechercher un EPCI" : "Rechercher une commune";
    searchInput.placeholder = scale === "epci" ? "Ex. Cergy-Pontoise" : "Ex. Pontoise";
    document.querySelectorAll("[data-map-scale]").forEach((button) => {
      const active = button.dataset.mapScale === scale;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    resetMapSelection();
  }

  document.querySelectorAll("[data-map-scale]").forEach((button) => button.addEventListener("click", () => setMapScale(button.dataset.mapScale)));

  function renderSearchResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      searchResults.hidden = true;
      searchResults.innerHTML = "";
      return;
    }
    const collection = state.scale === "epci" ? state.epcis : state.communes;
    const matches = collection
      .filter((item) => item.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .slice(0, 8);
    if (!matches.length) {
      searchResults.hidden = true;
      return;
    }
    searchResults.innerHTML = matches
      .map((item) => `<button type="button" data-code="${item.code}"><b>${item.name}</b><small>${state.scale === "epci" ? (item.special ? "Commune particulière" : "EPCI") : "Commune"}</small></button>`)
      .join("");
    searchResults.hidden = false;
    searchResults.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.scale === "epci") selectEpci(btn.dataset.code);
        else selectCommune(btn.dataset.code);
        searchResults.hidden = true;
      });
    });
  }

  searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));
  searchInput.addEventListener("focus", () => renderSearchResults(searchInput.value));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box") && !e.target.closest(".search-results")) {
      searchResults.hidden = true;
    }
  });
  searchButton.addEventListener("click", () => {
    const collection = state.scale === "epci" ? state.epcis : state.communes;
    const q = searchInput.value.trim().toLowerCase();
    const match = collection.find((item) => item.name.toLowerCase() === q) || collection.find((item) => item.name.toLowerCase().includes(q));
    if (match) state.scale === "epci" ? selectEpci(match.code) : selectCommune(match.code);
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const collection = state.scale === "epci" ? state.epcis : state.communes;
      const q = searchInput.value.trim().toLowerCase();
      const match = collection.find((item) => item.name.toLowerCase() === q) || collection.find((item) => item.name.toLowerCase().includes(q));
      if (match) {
        state.scale === "epci" ? selectEpci(match.code) : selectCommune(match.code);
        searchResults.hidden = true;
      }
    }
  });

  // ---------- Direction toggles ----------
  document.querySelectorAll(".direction-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.dataset.dir;
      if (dir === "out") state.showOut = !state.showOut;
      if (dir === "in") state.showIn = !state.showIn;
      btn.classList.toggle("active", dir === "out" ? state.showOut : state.showIn);
      render();
    });
  });

  // ---------- Threshold ----------
  const thresholdInput = document.getElementById("threshold");
  const thresholdVal = document.getElementById("threshold-val");
  thresholdInput.addEventListener("input", (e) => {
    state.threshold = +e.target.value;
    thresholdVal.textContent = state.threshold;
    render();
  });

  // ---------- Mobile sidebar toggle ----------
  const sidebarEl = document.getElementById("layerSidebar");
  const mobileLayersBtn = document.getElementById("mobileLayers");
  mobileLayersBtn.addEventListener("click", () => {
    const open = sidebarEl.classList.toggle("open");
    mobileLayersBtn.setAttribute("aria-expanded", String(open));
  });

  // ---------- Reset view ----------
  function resetMapSelection() {
    state.selected = null;
    state.visibleRows = [];
    searchInput.value = "";
    searchResults.hidden = true;
    sidebarEl.classList.remove("open");
    mobileLayersBtn.setAttribute("aria-expanded", "false");
    document.getElementById("detailPanel").classList.remove("open");
    styleTerritories();
    gArcs.selectAll("path").remove();
    gPoints.selectAll("circle").remove();
    if (deptLayer) map.fitBounds(deptLayer.getBounds(), { padding: [24, 24], animate: false });
    else map.setView(VDO_CENTER, 10, { animate: false });
    renderEmptyState();
  }
  document.getElementById("resetView").addEventListener("click", resetMapSelection);

  // ---------- Comprendre dialog ----------
  const comprendreDialog = document.getElementById("comprendreDialog");
  ["openComprendre3"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => comprendreDialog.showModal());
  });
  comprendreDialog.querySelectorAll("[data-close]").forEach((btn) =>
    btn.addEventListener("click", () => comprendreDialog.close())
  );
  comprendreDialog.addEventListener("click", (e) => {
    if (e.target === comprendreDialog) comprendreDialog.close();
  });

  // ---------- Synthèse départementale ----------
  function computeDepartementSynthese(flows, communes95) {
    let intra = 0, sortants = 0, entrants = 0;
    const externalDest = new Map();
    const externalOrig = new Map();
    const intraPairs = [];
    const communeOut = new Map();
    const communeIn = new Map();

    flows.forEach((f) => {
      if (f.o95 && f.d95) {
        intra += f.v;
        if (f.o !== f.d) intraPairs.push(f);
      } else if (f.o95 && !f.d95) {
        sortants += f.v;
        externalDest.set(f.dname, (externalDest.get(f.dname) || 0) + f.v);
      } else if (!f.o95 && f.d95) {
        entrants += f.v;
        externalOrig.set(f.oname, (externalOrig.get(f.oname) || 0) + f.v);
      }
      if (f.o95) communeOut.set(f.o, (communeOut.get(f.o) || 0) + f.v);
      if (f.d95) communeIn.set(f.d, (communeIn.get(f.d) || 0) + f.v);
    });

    const balances = communes95.map((c) => {
      const out = communeOut.get(c.code) || 0;
      const inn = communeIn.get(c.code) || 0;
      return { name: c.name, out, inn, balance: inn - out };
    });
    const topResidentiel = [...balances].sort((a, b) => a.balance - b.balance).slice(0, 6);
    const topEmploi = [...balances].sort((a, b) => b.balance - a.balance).slice(0, 6);
    const topIntra = [...intraPairs].sort((a, b) => b.v - a.v).slice(0, 6);
    const topDest = [...externalDest.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, v]) => ({ name, v }));
    const topOrig = [...externalOrig.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, v]) => ({ name, v }));

    const selfContainment = intra + sortants ? Math.round((intra / (intra + sortants)) * 100) : 0;

    return { intra, sortants, entrants, selfContainment, balance: entrants - sortants, topResidentiel, topEmploi, topIntra, topDest, topOrig };
  }

  const DEPT_CHART_COLORS = ["#00a7b5", "#b8752a", "#000091", "#e85d8e", "#18753c", "#ffd66b"];

  function deptDonut(title, data, centerValue, centerLabel) {
    let cursor = 0;
    const stops = data.map((item, index) => {
      const start = cursor;
      cursor += item.pct;
      return `${item.color || DEPT_CHART_COLORS[index % DEPT_CHART_COLORS.length]} ${start}% ${cursor}%`;
    }).join(",");
    const legend = data.map((item, index) => `<div><i style="--swatch:${item.color || DEPT_CHART_COLORS[index % DEPT_CHART_COLORS.length]}"></i><span>${item.label}</span><b>${item.pct}%</b></div>`).join("");
    return `<article class="chart-card visual-card"><h3>${title}</h3><div class="donut-layout"><div class="donut" style="--segments:${stops}"><div><strong>${centerValue}</strong><span>${centerLabel}</span></div></div><div class="chart-legend">${legend}</div></div></article>`;
  }

  function deptBars(title, description, data, tone = "") {
    const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
    const rows = data.map((d) => `<div class="bar-row"><span title="${d.label}">${d.label}</span><div class="bar-track"><i style="--pct:${Math.max(6, (Math.abs(d.value) / max) * 100)}%"></i></div><b>${d.display}</b></div>`).join("");
    return `<article class="chart-card ${tone}"><h3>${title}</h3><p>${description}</p>${rows}</article>`;
  }

  function renderDepartementDialog() {
    const s = state.deptSynthese;
    const content = document.getElementById("departementContent");
    if (!s || !content) return;
    const format = (v) => Math.round(v).toLocaleString("fr-FR");
    const totalFlux = s.intra + s.sortants + s.entrants;
    const pct = (v) => (totalFlux ? Math.round((v / totalFlux) * 100) : 0);

    const repartitionDonut = deptDonut(
      "Répartition des flux domicile-travail",
      [
        { label: "Internes au 95", pct: pct(s.intra), color: "#00a7b5" },
        { label: "Sortants (résidents)", pct: pct(s.sortants), color: "#b8752a" },
        { label: "Entrants (actifs)", pct: pct(s.entrants), color: "#000091" },
      ],
      `${s.selfContainment}%`,
      "autoconfinement"
    );

    const balanceDonut = deptDonut(
      "Balance sortants / entrants",
      [
        { label: "Sortants", pct: totalFlux ? Math.round((s.sortants / (s.sortants + s.entrants)) * 100) : 0, color: "#b8752a" },
        { label: "Entrants", pct: totalFlux ? Math.round((s.entrants / (s.sortants + s.entrants)) * 100) : 0, color: "#000091" },
      ],
      `${s.balance >= 0 ? "+" : "−"}${format(Math.abs(s.balance))}`,
      s.balance >= 0 ? "solde net entrant" : "solde net sortant"
    );

    const residentiel = deptBars(
      "Communes les plus résidentielles",
      "Solde domicile-travail le plus négatif (plus de résidents actifs que d'emplois occupés sur place).",
      s.topResidentiel.map((r) => ({ label: r.name, value: r.balance, display: `−${format(Math.abs(r.balance))}` })),
      "orange"
    );
    const emploi = deptBars(
      "Communes les plus pourvoyeuses d'emploi",
      "Solde domicile-travail le plus positif.",
      s.topEmploi.map((r) => ({ label: r.name, value: r.balance, display: `+${format(r.balance)}` })),
      "green"
    );
    const intraLiaisons = deptBars(
      "Plus fortes liaisons intercommunales (95 ↔ 95)",
      "Hors résidence = travail dans la même commune.",
      s.topIntra.map((r) => ({ label: `${r.oname} → ${r.dname}`, value: r.v, display: format(r.v) }))
    );
    const destExt = deptBars(
      "Principales destinations hors Val-d'Oise",
      "Communes de travail des résidents partant ailleurs.",
      s.topDest.map((r) => ({ label: r.name, value: r.v, display: format(r.v) })),
      "orange"
    );
    const origExt = deptBars(
      "Principales origines hors Val-d'Oise",
      "Communes de résidence des actifs entrants.",
      s.topOrig.map((r) => ({ label: r.name, value: r.v, display: format(r.v) }))
    );

    content.innerHTML = `
      <div class="dashboard-kpis">
        <article><small>FLUX INTERNES AU 95</small><strong>${format(s.intra)}</strong><span>actifs résidant et travaillant dans le département</span></article>
        <article><small>RÉSIDENTS PARTANT AILLEURS</small><strong>${format(s.sortants)}</strong><span>actifs du 95 travaillant hors département</span></article>
        <article><small>ACTIFS ENTRANTS</small><strong>${format(s.entrants)}</strong><span>venant travailler dans le 95 depuis l'extérieur</span></article>
        <article><small>AUTOCONFINEMENT RÉSIDENTIEL</small><strong>${s.selfContainment}%</strong><span>des résidents actifs travaillent dans le Val-d'Oise</span></article>
      </div>
      <div class="dashboard-grid" style="margin-top:16px">
        ${repartitionDonut}
        ${balanceDonut}
        <article class="dashboard-note"><span>COMMENT LIRE</span><h3>Une synthèse à seuil nul</h3><p>Ces chiffres agrègent l'intégralité des flux domicile-travail du Val-d'Oise (RP2023, sans seuil minimum), contrairement à la carte qui applique le seuil et le sens choisis dans la barre latérale.</p></article>
        ${residentiel}
        ${emploi}
        ${intraLiaisons}
        ${destExt}
        ${origExt}
      </div>
    `;
  }

  function openDepartementDialog() {
    renderDepartementDialog();
    document.getElementById("departementDialog").showModal();
  }
  ["openData", "openDataTop"].forEach((id) => document.getElementById(id)?.addEventListener("click", openDepartementDialog));
  const departementDialog = document.getElementById("departementDialog");
  if (departementDialog) {
    departementDialog.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", () => departementDialog.close()));
    departementDialog.addEventListener("click", (e) => { if (e.target === departementDialog) departementDialog.close(); });
  }

  // ---------- Selection ----------
  function selectFromMap(code) {
    if (state.scale === "commune") {
      selectCommune(code);
      return;
    }
    const epci = epciForCommune(code);
    if (epci) {
      selectEpci(epci.code);
    }
  }

  function selectCommune(code) {
    state.scale = "commune";
    state.selected = code;
    const c = state.communesByCode.get(code);
    if (c) {
      searchInput.value = c.name;
      map.setView([c.lat, c.lon], Math.max(map.getZoom(), 11), { animate: false });
      document.getElementById("mapStatus").textContent = `${c.name} · flux communaux affichés`;
    }
    updateOverlayFrame();
    render();
  }

  function selectEpci(code) {
    const epci = state.epcisByCode.get(code);
    if (!epci) return;
    state.scale = "epci";
    state.selected = code;
    searchInput.value = epci.name;
    const visibleLayers = [];
    communesLayer.eachLayer((layer) => {
      if (epci.members.includes(layer.feature.properties.code)) visibleLayers.push(layer);
    });
    if (visibleLayers.length) {
      map.fitBounds(L.featureGroup(visibleLayers).getBounds(), { padding: [45, 45], animate: false, maxZoom: 11 });
    }
    document.getElementById("mapStatus").textContent = `${epci.name} · flux agrégés affichés`;
    updateOverlayFrame();
    render();
  }

  // ---------- Rendering ----------
  function curvedPath(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const offset = dist * 0.18;
    const nx = -dy / (dist || 1);
    const ny = dx / (dist || 1);
    const cx = mx + nx * offset;
    const cy = my + ny * offset;
    return `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
  }

  function aggregateEpciRows(epci) {
    const members = new Set(epci.members);
    const centers = epci.members.map((code) => state.communesByCode.get(code)).filter(Boolean);
    const center = {
      lon: d3.mean(centers, (item) => item.lon) || 2.15,
      lat: d3.mean(centers, (item) => item.lat) || 49.05,
    };
    const grouped = new Map();
    state.flows.forEach((flow) => {
      const originInside = members.has(flow.o);
      const destinationInside = members.has(flow.d);
      if (originInside === destinationInside) return;
      const isOut = originInside;
      if (isOut && !state.showOut) return;
      if (!isOut && !state.showIn) return;
      const otherCode = isOut ? flow.d : flow.o;
      const key = `${isOut ? "out" : "in"}:${otherCode}`;
      if (!grouped.has(key)) {
        grouped.set(key, isOut ? {
          o: epci.code, oname: epci.name, olon: center.lon, olat: center.lat,
          d: flow.d, dname: flow.dname, dlon: flow.dlon, dlat: flow.dlat, v: 0,
        } : {
          o: flow.o, oname: flow.oname, olon: flow.olon, olat: flow.olat,
          d: epci.code, dname: epci.name, dlon: center.lon, dlat: center.lat, v: 0,
        });
      }
      grouped.get(key).v += flow.v;
    });
    return Array.from(grouped.values()).filter((flow) => flow.v >= state.threshold);
  }

  function render() {
    if (!state.selected) {
      state.visibleRows = [];
      gArcs.selectAll("path").remove();
      gPoints.selectAll("circle").remove();
      return;
    }
    const code = state.selected;
    const selectedProfile = state.scale === "epci" ? state.epcisByCode.get(code) : state.communesByCode.get(code);
    const members = new Set(state.scale === "epci" ? selectedProfile.members : [code]);
    const rows = state.scale === "epci" ? aggregateEpciRows(selectedProfile) : state.flows.filter((f) => {
      if (f.v < state.threshold) return false;
      const isOut = f.o === code;
      const isIn = f.d === code;
      if (!isOut && !isIn) return false;
      if (isOut && !state.showOut) return false;
      if (isIn && !state.showIn) return false;
      return true;
    });
    state.visibleRows = rows;

    styleTerritories(code);

    const maxV = d3.max(rows, (d) => d.v) || 1;
    const widthScale = d3.scaleSqrt().domain([state.threshold, Math.max(maxV, state.threshold + 1)]).range([0.8, 7]);
    const opacityScale = d3.scaleSqrt().domain([state.threshold, Math.max(maxV, state.threshold + 1)]).range([0.4, 0.92]);

    const arcs = rows.map((f) => {
      const isOut = f.o === code;
      const s = projectLatLon(f.olon, f.olat);
      const t = projectLatLon(f.dlon, f.dlat);
      return {
        ...f,
        isOut,
        d: curvedPath(s.x, s.y, t.x, t.y),
        w: widthScale(f.v),
        op: opacityScale(f.v),
      };
    }).sort((a, b) => a.v - b.v);

    gArcs
      .selectAll("path")
      .data(arcs, (d) => d.o + "-" + d.d)
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
      const otherCode = d.isOut ? d.d : d.o;
      if (seen.has(otherCode)) return;
      seen.add(otherCode);
      const lon = d.isOut ? d.dlon : d.olon;
      const lat = d.isOut ? d.dlat : d.olat;
      const name = d.isOut ? d.dname : d.oname;
      const p = projectLatLon(lon, lat);
      points.push({ x: p.x, y: p.y, name, isOut: d.isOut, v: d.v });
    });

    gPoints
      .selectAll("circle.endpoint")
      .data(points, (d) => d.name + d.isOut)
      .join("circle")
      .attr("class", "endpoint")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 2.6)
      .attr("fill", (d) => (d.isOut ? "#b8752a" : "#000091"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.6)
      .append("title")
      .text((d) => `${d.name} — ${Math.round(d.v).toLocaleString("fr-FR")} actifs`);

    renderStats(code, rows);
  }

  function renderStats(code, rows) {
    const c = state.scale === "epci" ? state.epcisByCode.get(code) : state.communesByCode.get(code);
    const detailPanel = document.getElementById("detailPanel");
    const detailContent = document.getElementById("detailContent");
    if (!c) {
      detailPanel.classList.remove("open");
      return;
    }
    const outRows = rows.filter((r) => r.o === code).sort((a, b) => b.v - a.v);
    const inRows = rows.filter((r) => r.d === code).sort((a, b) => b.v - a.v);
    const totalOut = d3.sum(outRows, (d) => d.v);
    const totalIn = d3.sum(inRows, (d) => d.v);
    const total = totalOut + totalIn;
    const outShare = total ? Math.round((totalOut / total) * 100) : 0;
    const inShare = total ? 100 - outShare : 0;
    const balance = totalIn - totalOut;
    const maxRank = Math.max(outRows[0]?.v || 0, inRows[0]?.v || 0, 1);
    const format = (value) => Math.round(value).toLocaleString("fr-FR");
    const isEpci = state.scale === "epci" && !c.special;
    const territoryType = isEpci ? "EPCI" : "Commune";
    const exchangeProfile = outShare >= inShare
      ? (isEpci ? "résidentiel" : "résidentielle")
      : (isEpci ? "attractif" : "attractive");
    const profileUrl = state.scale === "epci"
      ? `fiche.html?type=epci&id=${encodeURIComponent(code)}`
      : `fiche.html?type=commune&id=${encodeURIComponent(code)}`;

    const rowsHtml = (arr, key) =>
      arr
        .slice(0, 6)
        .map((r, index) => `<div class="trajectory-row">
          <span class="rank-index">${String(index + 1).padStart(2, "0")}</span>
          <div class="rank-copy"><b>${r[key]}</b><i style="--bar:${Math.max(8, (r.v / maxRank) * 100)}%"></i></div>
          <span>${format(r.v)}</span>
        </div>`)
        .join("");

    detailContent.innerHTML = `
      <span class="detail-tag">${territoryType.toUpperCase()} · MOBILITÉS · VAL-D'OISE</span>
      <h2>${c.name}</h2>
      <p class="subtitle">Flux domicile-travail · INSEE RP2023</p>
      <div class="property-grid">
        <div class="property out"><small>Flux sortants affichés</small><strong>${format(totalOut)}</strong><small>${outRows.length} destinations</small></div>
        <div class="property"><small>Flux entrants affichés</small><strong>${format(totalIn)}</strong><small>${inRows.length} origines</small></div>
      </div>
      <section class="flow-profile" aria-label="Profil des flux">
        <div class="flow-donut" style="--out-share:${outShare * 3.6}deg"><div><strong>${total ? Math.max(outShare, inShare) : 0}%</strong><small>${outShare >= inShare ? "sortants" : "entrants"}</small></div></div>
        <div class="profile-copy"><span>Profil des échanges</span><strong>${territoryType} plutôt ${exchangeProfile}</strong><p>${outShare}% sortants · ${inShare}% entrants</p></div>
      </section>
      <section class="balance-card ${balance >= 0 ? "positive" : "negative"}">
        <div><span>Balance des flux</span><strong>${balance >= 0 ? "+" : "−"}${format(Math.abs(balance))}</strong></div>
        <p>${balance >= 0 ? "Davantage d’actifs viennent y travailler." : "Davantage de résidents partent travailler ailleurs."}</p>
        <div class="balance-track"><i style="width:${outShare}%"></i><b style="width:${inShare}%"></b></div>
      </section>
      ${outRows.length ? `<div class="trajectory-card"><strong>Top destinations (sortant)</strong>${rowsHtml(outRows, "dname")}</div>` : ""}
      ${inRows.length ? `<div class="trajectory-card"><strong>Top origines (entrant)</strong>${rowsHtml(inRows, "oname")}</div>` : ""}
      <a class="profile-link" href="${profileUrl}" target="_blank" rel="noopener">Voir la fiche ${isEpci ? "EPCI" : "communale"} complète et le PDF <span>↗</span></a>
      <p class="detail-method">Valeurs cartographiques calculées selon le seuil et les sens de flux affichés. La fiche complète utilise les microdonnées pondérées INSEE.</p>
    `;
    detailPanel.classList.add("open");
  }

  function renderEmptyState() {
    document.getElementById("detailPanel").classList.remove("open");
    document.getElementById("mapStatus").textContent = `Val-d’Oise · sélectionnez ${state.scale === "epci" ? "un EPCI" : "une commune"} pour révéler ses flux`;
  }

  document.getElementById("closeDetail").addEventListener("click", resetMapSelection);

  // ---------- Impression A3 ----------
  // Les flux peuvent pointer hors Val-d'Oise (Paris, La Défense...) : contrairement à une
  // simple choroplèthe, l'emprise à imprimer ne peut pas être fixée sur le contour du
  // département. print.js la recalcule à partir du territoire sélectionné et de chaque
  // extrémité de flux réellement affichée (voir app.rows()).
  function printTerritories() {
    if (!communesLayer) return { type: "FeatureCollection", features: [] };
    const code = state.selected;
    const epci = state.scale === "epci" && code ? state.epcisByCode.get(code) : null;
    const coreCodes = new Set(state.scale === "epci" ? (epci ? epci.members : []) : (code ? [code] : []));
    const features = [];
    communesLayer.eachLayer((layer) => {
      if (!layer.feature) return;
      const feature = layer.toGeoJSON();
      const communeCode = layer.feature.properties.code;
      feature.properties = { ...feature.properties, _printCore: coreCodes.has(communeCode), _printStyle: {
        color: layer.options.color,
        weight: layer.options.weight,
        opacity: layer.options.opacity,
        fillColor: layer.options.fillColor,
        fillOpacity: layer.options.fillOpacity,
      } };
      features.push(feature);
    });
    return { type: "FeatureCollection", features };
  }

  function printMeta() {
    const code = state.selected;
    if (!code) return null;
    const c = state.scale === "epci" ? state.epcisByCode.get(code) : state.communesByCode.get(code);
    if (!c) return null;
    const isEpci = state.scale === "epci" && !c.special;
    return {
      name: c.name,
      territoryType: isEpci ? "EPCI" : "Commune",
      showOut: state.showOut,
      showIn: state.showIn,
      threshold: state.threshold,
    };
  }

  window.mobiliteApp = {
    state,
    map,
    territories: printTerritories,
    department: () => deptLayer?.toGeoJSON(),
    rows: () => state.visibleRows || [],
    meta: printMeta,
  };
  document.getElementById("printMap")?.addEventListener("click", () => {
    if (!state.selected) {
      document.getElementById("mapStatus").textContent = `Choisissez d’abord ${state.scale === "epci" ? "un EPCI" : "une commune"} avant d’imprimer`;
      searchInput.focus();
      return;
    }
    const preview = new URLSearchParams(location.search).has("printPreview");
    window.open(`print.html${preview ? "?preview=1" : ""}`, "_blank");
  });

})();
