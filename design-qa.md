# Design QA — datavisualisations des fiches territoriales

- Existing design system: fiche territoriale DDT 95, Marianne, palette bleu/cyan/orange/rose/vert.
- Verification surface: in-app browser, `fiche.html?type=commune&id=95018` and `fiche.html?type=epci&id=200057859`.
- State: Argenteuil and CC Vexin Centre loaded from the processed INSEE RP2022 profiles.

**Findings**

- No actionable P0/P1/P2 issue remains.
- Donut centre labels use a compact percentage and constrained text so long housing labels cannot overflow the ring.
- Map focus outlines are suppressed; EPCI mode tooltips and whole-territory hover styling resolve at EPCI level instead of exposing commune hover feedback.
- The map uses one shared Leaflet tooltip; polygon hover events cannot accumulate one tooltip per member commune.
- The opening section now distinguishes population, localised jobs and employed residents in six directly labelled KPI cards.
- Population uses the official Insee municipal reference population for 2023, effective 1 January 2026, and is summed across complete EPCI membership.
- The profile section now uses a two-slice donut and six directly labelled vertical age bars.
- Employment and living-condition sections use additional donuts only for defensible part-to-whole comparisons.
- Dense categorical comparisons remain horizontal bars; flow rankings remain ordered lists.
- Every chart keeps visible values and a text legend, so color is not the only carrier of information.

**Interaction and data checks**

- Argenteuil renders 5 donuts, 6 directly labelled age bars and all 7 report sections.
- Argenteuil displays 106,130 inhabitants, 29,960 localised jobs and 44,560 employed residents without horizontal overflow.
- CC Vexin Centre renders the same chart families from its aggregated EPCI profile.
- Chart labels, percentages and accessible descriptions come from the existing processed datasets.
- No new statistic or inferred value was introduced, except explicit complements to 100% for binary donut legends.
- Existing PDF/export structure and section-level page-break protection are preserved.
- JavaScript syntax, JSON source and patch whitespace checks passed.

final result: passed
