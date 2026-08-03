(function () {
  "use strict";

  const state = {
    communes: [],
    communesByCode: new Map(),
    communesByName: new Map(),
    flows: [],
    selected: null,
    showOut: true,
    showIn: true,
    threshold: 10,
  };

  // ---------- Map ----------
  const VDO_CENTER = [49.05, 2.15];
  const map = L.map("map", { zoomControl: true, minZoom: 7, maxZoom: 15 }).setView(VDO_CENTER, 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  let communesLayer, deptLayer;

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
  ]).then(([dept95, communes95Geo, communes95, flows]) => {
    deptLayer = L.geoJSON(dept95, {
      style: { color: "#000091", weight: 2, fill: false, opacity: 0.55 },
    }).addTo(map);

    communesLayer = L.geoJSON(communes95Geo, {
      style: () => ({ color: "#8a9bb0", weight: 0.6, fillColor: "#000091", fillOpacity: 0.03 }),
      onEachFeature: (feature, layer) => {
        layer.on("click", () => selectCommune(feature.properties.code));
        layer.bindTooltip(feature.properties.nom, { sticky: true, className: "commune-tip" });
      },
    }).addTo(map);

    state.communes = communes95;
    state.communesByCode = new Map(communes95.map((c) => [c.code, c]));
    state.communesByName = new Map(communes95.map((c) => [c.name.toLowerCase(), c]));
    state.flows = flows;

    document.getElementById("mapStatus").textContent = `${flows.length.toLocaleString("fr-FR")} liaisons chargées`;
    updateOverlayFrame();

    const defaultCode = communes95[0] ? communes95[0].code : null;
    if (defaultCode) selectCommune(defaultCode);
  });

  // ---------- Search ----------
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const searchResults = document.getElementById("searchResults");

  function renderSearchResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      searchResults.hidden = true;
      searchResults.innerHTML = "";
      return;
    }
    const matches = state.communes
      .filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .slice(0, 8);
    if (!matches.length) {
      searchResults.hidden = true;
      return;
    }
    searchResults.innerHTML = matches
      .map((c) => `<button type="button" data-code="${c.code}">${c.name}</button>`)
      .join("");
    searchResults.hidden = false;
    searchResults.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectCommune(btn.dataset.code);
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
    const match = state.communesByName.get(searchInput.value.trim().toLowerCase());
    if (match) selectCommune(match.code);
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const match = state.communesByName.get(searchInput.value.trim().toLowerCase());
      if (match) {
        selectCommune(match.code);
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
  document.getElementById("resetView").addEventListener("click", () => {
    if (state.selected) {
      const c = state.communesByCode.get(state.selected);
      if (c) map.setView([c.lat, c.lon], 11, { animate: false });
      return;
    }
    map.setView(VDO_CENTER, 10, { animate: false });
  });

  // ---------- Comprendre dialog ----------
  const comprendreDialog = document.getElementById("comprendreDialog");
  ["openComprendre", "openComprendre2", "openComprendre3"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => comprendreDialog.showModal());
  });
  comprendreDialog.querySelectorAll("[data-close]").forEach((btn) =>
    btn.addEventListener("click", () => comprendreDialog.close())
  );
  comprendreDialog.addEventListener("click", (e) => {
    if (e.target === comprendreDialog) comprendreDialog.close();
  });

  // ---------- Selection ----------
  function selectCommune(code) {
    state.selected = code;
    const c = state.communesByCode.get(code);
    if (c) {
      searchInput.value = c.name;
      map.setView([c.lat, c.lon], Math.max(map.getZoom(), 11), { animate: false });
    }
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

  function render() {
    if (!state.selected) return;
    const code = state.selected;
    const rows = state.flows.filter((f) => {
      if (f.v < state.threshold) return false;
      const isOut = f.o === code;
      const isIn = f.d === code;
      if (!isOut && !isIn) return false;
      if (isOut && !state.showOut) return false;
      if (isIn && !state.showIn) return false;
      return true;
    });

    if (communesLayer) {
      communesLayer.eachLayer((layer) => {
        const isSel = layer.feature.properties.code === code;
        layer.setStyle({
          fillColor: isSel ? "#00a7b5" : "#000091",
          fillOpacity: isSel ? 0.22 : 0.03,
          weight: isSel ? 1.6 : 0.6,
          color: isSel ? "#00a7b5" : "#8a9bb0",
        });
      });
    }

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
    const c = state.communesByCode.get(code);
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

    const rowsHtml = (arr, key) =>
      arr
        .slice(0, 10)
        .map((r) => `<div class="trajectory-row"><b>${r[key]}</b><span>${Math.round(r.v).toLocaleString("fr-FR")} actifs</span></div>`)
        .join("");

    detailContent.innerHTML = `
      <span class="detail-tag">MOBILITÉS · VAL-D'OISE</span>
      <h2>${c.name}</h2>
      <p class="subtitle">Flux domicile-travail · INSEE RP2022</p>
      <div class="property-grid">
        <div class="property out"><small>Résidents actifs</small><strong>${Math.round(totalOut).toLocaleString("fr-FR")}</strong><small>travaillant ailleurs</small></div>
        <div class="property"><small>Actifs</small><strong>${Math.round(totalIn).toLocaleString("fr-FR")}</strong><small>venant y travailler</small></div>
      </div>
      ${outRows.length ? `<div class="trajectory-card"><strong>Top destinations (sortant)</strong>${rowsHtml(outRows, "dname")}</div>` : ""}
      ${inRows.length ? `<div class="trajectory-card"><strong>Top origines (entrant)</strong>${rowsHtml(inRows, "oname")}</div>` : ""}
    `;
    detailPanel.classList.add("open");
  }

  document.getElementById("closeDetail").addEventListener("click", () => {
    document.getElementById("detailPanel").classList.remove("open");
  });
})();
