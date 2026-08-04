(function () {
  "use strict";

  const fmt = (number) => Math.round(number).toLocaleString("fr-FR");
  const chartColors = ["#000091", "#00a7b5", "#e07a2f", "#e85d8e", "#18753c", "#ffd66b"];
  const root = document.getElementById("profileRoot");
  const dialog = document.getElementById("exportDialog");
  const communeSelect = document.getElementById("communeSelect");
  const epciSelect = document.getElementById("epciSelect");
  const communeField = document.getElementById("communeField");
  const epciField = document.getElementById("epciField");
  const territoryNote = document.getElementById("territoryNote");
  const headerTitle = document.getElementById("headerTitle");
  const params = new URLSearchParams(location.search);
  let datasets;
  let currentProfile;
  let scale = params.get("type") === "epci" ? "epci" : "commune";
  let selectedId = scale === "epci" ? params.get("id") : params.get("code") || params.get("id");

  function bars(title, data, tone = "") {
    return `<article class="chart-card ${tone}"><h3>${title}</h3>${data
      .map(
        (item) =>
          `<div class="bar-row"><span title="${item.label}">${item.label}</span><div class="bar-track"><i style="--pct:${item.pct}%"></i></div><b>${item.pct.toLocaleString("fr-FR")}%</b></div>`,
      )
      .join("")}</article>`;
  }

  function donut(title, data, centerLabel, centerValue, tone = "") {
    let cursor = 0;
    const stops = data.map((item, index) => {
      const start = cursor;
      cursor += item.pct;
      return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`;
    }).join(",");
    const description = data.map((item) => `${item.label} ${item.pct}%`).join(", ");
    return `<article class="chart-card visual-card ${tone}"><h3>${title}</h3><div class="donut-layout"><div class="donut" style="--segments:${stops}" role="img" aria-label="${description}"><div><strong>${centerValue}</strong><span>${centerLabel}</span></div></div><div class="chart-legend">${data.map((item, index) => `<div><i style="--swatch:${chartColors[index % chartColors.length]}"></i><span>${item.label}</span><b>${item.pct.toLocaleString("fr-FR")}%</b></div>`).join("")}</div></div></article>`;
  }

  function segmented(title, data) {
    const description = data.map((item) => `${item.label} ${item.pct}%`).join(", ");
    const maximum = Math.max(...data.map((item) => item.pct));
    return `<article class="chart-card visual-card wide-chart"><h3>${title}</h3><div class="age-bars" role="img" aria-label="${description}">${data.map((item, index) => `<div class="age-column"><b>${item.pct.toLocaleString("fr-FR")}%</b><div><i style="--height:${Math.max(5, (item.pct / maximum) * 100)}%;--swatch:${chartColors[index % chartColors.length]}"></i></div><span>${item.label}</span></div>`).join("")}</div></article>`;
  }

  function ranks(title, data) {
    return `<div class="rank-list"><h3>${title}</h3>${data
      .map(
        (item) =>
          `<div class="rank-row"><span>${item.label.replace(/ \(\w+\)$/, "")}</span><b>${fmt(item.value)}</b></div>`,
      )
      .join("")}</div>`;
  }

  function section(kicker, title, content, note = "") {
    return `<section class="section"><div class="section-head"><div><small>${kicker}</small><h2>${title}</h2></div>${note ? `<p>${note}</p>` : ""}</div>${content}</section>`;
  }

  function renderProfile(profile) {
    currentProfile = profile;
    const isEpci = scale === "epci" && !profile.special;
    const territory = isEpci ? "l’EPCI" : "la commune";
    const territoryTitle = isEpci ? "L’EPCI" : "La commune";
    const localPct = profile.residents ? (profile.local / profile.residents) * 100 : 0;
    const specialLabel = profile.special ? "Commune hors EPCI valdoisien" : null;
    document.title = `${profile.name} · Fiche mobilités · DDT 95`;
    headerTitle.textContent = isEpci ? "Fiche EPCI" : "Fiche communale";
    territoryNote.innerHTML = isEpci
      ? `<b>${profile.member_count} communes</b><span>Périmètre intercommunal complet · profils pondérés INSEE RP2022</span>`
      : `<b>${specialLabel || "Commune du Val-d’Oise"}</b><span>Profil pondéré INSEE RP2022</span>`;

    root.innerHTML = `<div id="report">
      <section class="report-cover">
        <div class="cover-kicker">FICHE ${isEpci ? "INTERCOMMUNALE" : "COMMUNALE"} · MOBILITÉS PROFESSIONNELLES</div>
        <h1>${profile.name}</h1>
        <p>Qui travaille, où, comment et dans quelles conditions ? Portrait statistique des actifs occupés résidant dans ${territory} et des emplois qui y sont exercés.</p>
        <div class="cover-meta"><span>INSEE · RP2022</span><span>${specialLabel || (isEpci ? `${profile.member_count} communes · EPCI ${profile.code}` : `Commune ${profile.code}`)}</span><span>DDT du Val-d’Oise</span><span>Valeurs pondérées</span></div>
      </section>
      <div class="report-body">
        ${section("01 · REPÈRES", `${territoryTitle} en quatre chiffres`, `<div class="kpi-grid"><div class="kpi"><small>Actifs résidents</small><strong>${fmt(profile.residents)}</strong><span>actifs de 15 ans ou plus ayant un emploi</span></div><div class="kpi"><small>Emplois dans ${territory}</small><strong>${fmt(profile.workers)}</strong><span>emplois occupés par des résidents de toute origine</span></div><div class="kpi"><small>Travaillent sur place</small><strong>${localPct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%</strong><span>${fmt(profile.local)} actifs résident et travaillent dans ${territory}</span></div><div class="kpi"><small>Ménage avec étudiant</small><strong>${profile.student_household_pct.toLocaleString("fr-FR")}%</strong><span>au moins un élève, étudiant ou stagiaire de 14 ans ou plus</span></div></div>`)}
        ${section("02 · PROFIL", "Sexe et générations", `<div class="charts-grid visual-grid">${donut("Répartition par sexe", profile.sex, "actifs", "100 %")}${segmented("Actifs par tranche d’âge", profile.age)}</div>`, `Profil des actifs occupés résidant dans ${territory}.`)}
        ${section("03 · EMPLOIS", "Professions et conditions d’emploi", `<div class="charts-grid">${bars("Groupes socioprofessionnels", profile.profession, "green")}${donut("Conditions d’emploi", profile.employment, "emploi stable", `${profile.employment[0].pct.toLocaleString("fr-FR")}%`)}${donut("Temps de travail", profile.worktime, "temps complet", `${profile.worktime[0].pct.toLocaleString("fr-FR")}%`, "orange")}${bars("Diplôme le plus élevé", profile.diploma)}</div>`)}
        ${section("04 · DÉPLACEMENTS", "Comment va-t-on travailler ?", `<div class="charts-grid">${bars("Mode principal de transport", profile.transport, "orange")}${bars("Motorisation du ménage", profile.cars, "green")}</div>`)}
        ${section("05 · CADRE DE VIE", "Dans quel type de logement ?", `<div class="charts-grid">${donut("Type de logement", profile.housing, "habitat dominant", profile.housing.slice().sort((a, b) => b.pct - a.pct)[0].label)}${donut("Présence d’élèves et étudiants", [{ label: "Ménage concerné", pct: profile.student_household_pct }, { label: "Autre ménage", pct: 100 - profile.student_household_pct }], "ménages concernés", `${profile.student_household_pct.toLocaleString("fr-FR")}%`, "green")}</div>`)}
        ${section("06 · POLARITÉS", "Principales destinations et origines", `<div class="rank-grid">${ranks("Où travaillent les habitants ?", profile.destinations)}${ranks(`D’où viennent ceux qui travaillent dans ${territory} ?`, profile.origins)}</div>`, "Effectifs estimés, classés par ordre décroissant.")}
        ${section("SOURCE · MÉTHODE", "Bien lire cette fiche", `<div class="method-note"><strong>Source :</strong> Insee, Recensement de la population 2022, fichier détail Mobilités professionnelles domicile-lieu de travail, géographie au 1er janvier 2024. Les résultats utilisent le poids individuel <strong>IPONDI</strong>. ${isEpci ? "Le périmètre EPCI est celui de l’API Découpage administratif ; les EPCI interdépartementaux sont analysés dans leur intégralité." : ""} Les faibles effectifs sont des ordres de grandeur. La statistique « ménage avec étudiant » ne signifie pas que l’actif est lui-même étudiant. Licence Ouverte / Etalab.</div>`)}
      </div>
    </div>`;
  }

  function setScale(nextScale, id) {
    scale = nextScale;
    document.querySelectorAll(".scale-toggle button").forEach((button) => {
      button.classList.toggle("active", button.dataset.scale === scale);
    });
    communeField.hidden = scale !== "commune";
    epciField.hidden = scale !== "epci";
    const source = datasets[scale];
    selectedId = id && source[id] ? id : Object.keys(source)[0];
    const select = scale === "commune" ? communeSelect : epciSelect;
    select.value = selectedId;
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("type", scale);
    url.searchParams.set("id", selectedId);
    history.replaceState(null, "", url);
    renderProfile(source[selectedId]);
  }

  Promise.all([
    fetch("data/processed/commune_profiles.json").then((response) => response.json()),
    fetch("data/processed/epci_profiles.json").then((response) => response.json()),
  ])
    .then(([commune, epci]) => {
      datasets = { commune, epci };
      communeSelect.innerHTML = Object.values(commune)
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
        .map((profile) => `<option value="${profile.code}">${profile.name}</option>`)
        .join("");
      const regular = Object.values(epci).filter((profile) => !profile.special).sort((a, b) => a.name.localeCompare(b.name, "fr"));
      const special = Object.values(epci).filter((profile) => profile.special).sort((a, b) => a.name.localeCompare(b.name, "fr"));
      epciSelect.innerHTML = `<optgroup label="EPCI du Val-d’Oise">${regular.map((profile) => `<option value="${profile.code}">${profile.name}</option>`).join("")}</optgroup><optgroup label="Communes particulières">${special.map((profile) => `<option value="${profile.code}">${profile.name} · commune</option>`).join("")}</optgroup>`;
      setScale(scale, selectedId);
    })
    .catch(() => {
      root.innerHTML = '<div class="loading">Impossible de charger cette fiche territoriale.</div>';
    });

  document.querySelectorAll(".scale-toggle button").forEach((button) => {
    button.addEventListener("click", () => setScale(button.dataset.scale));
  });
  communeSelect.addEventListener("change", () => setScale("commune", communeSelect.value));
  epciSelect.addEventListener("change", () => setScale("epci", epciSelect.value));
  document.getElementById("openExport").onclick = () => dialog.showModal();
  document.getElementById("closeExport").onclick = () => dialog.close();
  dialog.onclick = (event) => {
    if (event.target === dialog) dialog.close();
  };
  document.getElementById("printProfile").onclick = () => {
    dialog.close();
    window.print();
  };
  document.getElementById("makePdf").onclick = async () => {
    dialog.close();
    document.body.classList.add("exporting");
    const name = currentProfile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    try {
      await html2pdf().set({
        margin: 0,
        filename: `fiche-mobilites-${name}-rp2022.pdf`,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: [".section", ".chart-card"] },
      }).from(document.getElementById("report")).save();
    } finally {
      document.body.classList.remove("exporting");
    }
  };
})();
