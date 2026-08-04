# Design QA — datavisualisations des fiches territoriales

- Existing design system: fiche territoriale DDT 95, Marianne, palette bleu/cyan/orange/rose/vert.
- Verification surface: in-app browser, `fiche.html?type=commune&id=95018` and `fiche.html?type=epci&id=200057859`.
- State: Argenteuil and CC Vexin Centre loaded from the processed INSEE RP2022 profiles.

**Findings**

- No actionable P0/P1/P2 issue remains.
- The profile section now uses a two-slice donut and six directly labelled vertical age bars.
- Employment and living-condition sections use additional donuts only for defensible part-to-whole comparisons.
- Dense categorical comparisons remain horizontal bars; flow rankings remain ordered lists.
- Every chart keeps visible values and a text legend, so color is not the only carrier of information.

**Interaction and data checks**

- Argenteuil renders 5 donuts, 6 directly labelled age bars and all 7 report sections.
- CC Vexin Centre renders the same chart families from its aggregated EPCI profile.
- Chart labels, percentages and accessible descriptions come from the existing processed datasets.
- No new statistic or inferred value was introduced, except explicit complements to 100% for binary donut legends.
- Existing PDF/export structure and section-level page-break protection are preserved.
- JavaScript syntax, JSON source and patch whitespace checks passed.

final result: passed
