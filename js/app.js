(function () {
  "use strict";

  // ---------- Tabs ----------
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "carte") setTimeout(resizeMap, 0);
    });
  });

  // ---------- State ----------
  const state = {
    communes: [],       // Val d'Oise communes with totals
    communesByCode: new Map(),
    flows: [],           // all flows touching Val d'Oise
    selected: null,       // selected commune code
    direction: "both",
    threshold: 10,
  };

  const svg = d3.select("#map");
  const gContext = svg.append("g").attr("class", "layer-context");
  const gDept = svg.append("g").attr("class", "layer-dept");
  const gCommunes = svg.append("g").attr("class", "layer-communes");
  const gArcs = svg.append("g").attr("class", "layer-arcs");
  const gPoints = svg.append("g").attr("class", "layer-points");

  let projection, path, width, height;

  const zoom = d3.zoom()
    .scaleExtent([0.7, 40])
    .on("zoom", (event) => {
      [gContext, gDept, gCommunes, gArcs, gPoints].forEach((g) =>
        g.attr("transform", event.transform)
      );
    });
  svg.call(zoom);

  function resizeMap() {
    const wrap = document.querySelector(".map-wrap");
    width = wrap.clientWidth;
    height = wrap.clientHeight;
    svg.attr("viewBox", [0, 0, width, height]);
  }
  window.addEventListener("resize", () => {
    resizeMap();
    if (projection) fitProjection();
    render();
  });

  function fitProjection(contextGeo) {
    projection = d3.geoMercator();
    projection.fitExtent(
      [
        [24, 24],
        [width - 24, height - 24],
      ],
      contextGeo || window.__idfContext
    );
    path = d3.geoPath(projection);
  }

  // ---------- Load data ----------
  Promise.all([
    d3.json("data/processed/idf_context.geojson"),
    d3.json("data/processed/departement95.geojson"),
    d3.json("data/processed/communes95.geojson"),
    d3.json("data/processed/communes95.json"),
    d3.json("data/processed/flows.json"),
  ]).then(([idfContext, dept95, communes95Geo, communes95, flows]) => {
    window.__idfContext = idfContext;
    resizeMap();
    fitProjection(idfContext);

    gContext
      .selectAll("path")
      .data(idfContext.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "currentColor")
      .attr("class", "ctx-dept")
      .style("fill", "#232a33")
      .style("stroke", "#2f3844")
      .style("stroke-width", 0.6);

    gCommunes
      .selectAll("path")
      .data(communes95Geo.features)
      .join("path")
      .attr("d", path)
      .attr("class", "commune-poly")
      .style("fill", "#33404d")
      .style("stroke", "#4a5a6b")
      .style("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        selectCommune(d.properties.code);
      })
      .append("title")
      .text((d) => d.properties.nom);

    gDept
      .selectAll("path")
      .data(dept95.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "none")
      .style("stroke", "#f4c95d")
      .style("stroke-width", 1.4);

    state.communes = communes95;
    state.communesByCode = new Map(communes95.map((c) => [c.code, c]));
    state.flows = flows;

    populateCommuneList();

    const defaultCode = communes95[0] ? communes95[0].code : null;
    if (defaultCode) selectCommune(defaultCode);
  });

  function populateCommuneList() {
    const datalist = document.getElementById("commune-list");
    const sorted = [...state.communes].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    datalist.innerHTML = sorted
      .map((c) => `<option value="${c.name}" data-code="${c.code}"></option>`)
      .join("");
  }

  // ---------- Controls ----------
  const searchInput = document.getElementById("commune-search");
  searchInput.addEventListener("change", () => {
    const match = state.communes.find(
      (c) => c.name.toLowerCase() === searchInput.value.trim().toLowerCase()
    );
    if (match) selectCommune(match.code);
  });

  document.getElementById("direction").addEventListener("change", (e) => {
    state.direction = e.target.value;
    render();
  });

  const thresholdInput = document.getElementById("threshold");
  const thresholdVal = document.getElementById("threshold-val");
  thresholdInput.addEventListener("input", (e) => {
    state.threshold = +e.target.value;
    thresholdVal.textContent = state.threshold;
    render();
  });

  function selectCommune(code) {
    state.selected = code;
    const c = state.communesByCode.get(code);
    if (c) searchInput.value = c.name;
    render();
  }

  // ---------- Rendering ----------
  const tooltip = document.getElementById("tooltip");
  function showTooltip(event, html) {
    tooltip.innerHTML = html;
    tooltip.hidden = false;
    const wrapRect = document.querySelector(".map-wrap").getBoundingClientRect();
    tooltip.style.left = event.clientX - wrapRect.left + 14 + "px";
    tooltip.style.top = event.clientY - wrapRect.top + 10 + "px";
  }
  function hideTooltip() {
    tooltip.hidden = true;
  }

  function curvedPath(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    // perpendicular offset, consistent curvature direction
    const offset = dist * 0.18;
    const nx = -dy / (dist || 1);
    const ny = dx / (dist || 1);
    const cx = mx + nx * offset;
    const cy = my + ny * offset;
    return `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
  }

  function render() {
    if (!projection || !state.selected) return;
    const code = state.selected;
    const rows = state.flows.filter((f) => {
      if (f.v < state.threshold) return false;
      const isOut = f.o === code;
      const isIn = f.d === code;
      if (!isOut && !isIn) return false;
      if (state.direction === "out") return isOut;
      if (state.direction === "in") return isIn;
      return isOut || isIn;
    });

    const maxV = d3.max(rows, (d) => d.v) || 1;
    const widthScale = d3.scaleSqrt().domain([state.threshold, Math.max(maxV, state.threshold + 1)]).range([0.8, 7]);
    const opacityScale = d3.scaleSqrt().domain([state.threshold, Math.max(maxV, state.threshold + 1)]).range([0.35, 0.9]);

    const selC = state.communesByCode.get(code);
    gCommunes.selectAll(".commune-poly").style("fill", (d) =>
      d.properties.code === code ? "#f4c95d" : "#33404d"
    );

    const arcs = rows
      .map((f) => {
        const isOut = f.o === code;
        const [sx, sy] = projection([f.olon, f.olat]);
        const [tx, ty] = projection([f.dlon, f.dlat]);
        return {
          ...f,
          isOut,
          d: curvedPath(sx, sy, tx, ty),
          w: widthScale(f.v),
          op: opacityScale(f.v),
        };
      })
      .sort((a, b) => a.v - b.v);

    gArcs
      .selectAll("path")
      .data(arcs, (d) => d.o + "-" + d.d)
      .join("path")
      .attr("d", (d) => d.d)
      .attr("fill", "none")
      .attr("stroke", (d) => (d.isOut ? "var(--accent)" : "var(--accent-in)"))
      .attr("stroke-width", (d) => d.w)
      .attr("stroke-opacity", (d) => d.op)
      .attr("stroke-linecap", "round")
      .on("mousemove", (event, d) => {
        const other = d.isOut ? d.dname : d.oname;
        const verb = d.isOut ? "vers" : "depuis";
        showTooltip(
          event,
          `<b>${Math.round(d.v).toLocaleString("fr-FR")}</b> actifs ${verb} <b>${other}</b>`
        );
      })
      .on("mouseleave", hideTooltip);

    // endpoint dots
    const points = [];
    const seen = new Set();
    arcs.forEach((d) => {
      const otherCode = d.isOut ? d.d : d.o;
      if (seen.has(otherCode)) return;
      seen.add(otherCode);
      const lon = d.isOut ? d.dlon : d.olon;
      const lat = d.isOut ? d.dlat : d.olat;
      const name = d.isOut ? d.dname : d.oname;
      const [x, y] = projection([lon, lat]);
      points.push({ x, y, name, isOut: d.isOut });
    });

    gPoints
      .selectAll("circle")
      .data(points, (d) => d.name + d.isOut)
      .join("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 2.4)
      .attr("fill", (d) => (d.isOut ? "var(--accent)" : "var(--accent-in)"))
      .on("mousemove", (event, d) => showTooltip(event, `<b>${d.name}</b>`))
      .on("mouseleave", hideTooltip);

    if (selC) {
      const [sx, sy] = projection([selC.lon, selC.lat]);
      gPoints
        .selectAll("circle.focus")
        .data([selC])
        .join("circle")
        .attr("class", "focus")
        .attr("cx", sx)
        .attr("cy", sy)
        .attr("r", 5)
        .attr("fill", "#f4c95d")
        .attr("stroke", "#20242b")
        .attr("stroke-width", 1.2);
    }

    renderStats(code, rows);
  }

  function renderStats(code, rows) {
    const c = state.communesByCode.get(code);
    const statsEl = document.getElementById("stats");
    if (!c) {
      statsEl.innerHTML = "";
      return;
    }
    const outRows = rows.filter((r) => r.o === code).sort((a, b) => b.v - a.v);
    const inRows = rows.filter((r) => r.d === code).sort((a, b) => b.v - a.v);
    const totalOut = d3.sum(outRows, (d) => d.v);
    const totalIn = d3.sum(inRows, (d) => d.v);

    const topList = (arr, key) =>
      arr
        .slice(0, 5)
        .map((r) => `<li><span>${r[key]}</span><span>${Math.round(r.v).toLocaleString("fr-FR")}</span></li>`)
        .join("");

    statsEl.innerHTML = `
      <h4>${c.name}</h4>
      <div class="stat-row"><span>Résidents actifs sortants</span><b>${Math.round(totalOut).toLocaleString("fr-FR")}</b></div>
      <div class="stat-row"><span>Actifs entrants (travail)</span><b>${Math.round(totalIn).toLocaleString("fr-FR")}</b></div>
      ${outRows.length ? `<div class="stat-row" style="margin-top:0.5rem;"><em>Top destinations</em></div><ul class="top-list">${topList(outRows, "dname")}</ul>` : ""}
      ${inRows.length ? `<div class="stat-row"><em>Top origines</em></div><ul class="top-list">${topList(inRows, "oname")}</ul>` : ""}
    `;
  }
})();
