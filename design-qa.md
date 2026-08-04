# Design QA — sélecteurs Commune / EPCI

- Source visual truth: `/var/folders/3h/px_6bwl96w50x8y34bkz_k_80000gn/T/TemporaryItems/NSIRD_screencaptureui_RM38yB/Capture d’écran 2026-08-04 à 10.51.39.png`
- Implementation screenshot: `/tmp/atlas-toggle-selectors.png`
- Combined focused comparison: `/tmp/atlas-toggle-comparison.png`
- Viewport: 1280 × 720 CSS px, density 1
- Source pixels: 790 × 1126; implementation pixels: 1280 × 720
- State: Commune active, EPCI inactive, no territory selected

**Findings**

- No actionable P0/P1/P2 mismatch. The two analysis selectors reproduce the reference pattern: stacked rounded rows, large switch at left, title and explanatory copy in the center, color marker at right, pale active background.
- “Données & évolutions” replaces “Comprendre la carte” in both relevant entry points.

**Required fidelity surfaces**

- Typography: Marianne family, bold titles, blue uppercase section label and muted descriptions match the atlas system.
- Spacing/layout: stacked full-width rows, switch/title alignment, padding, radii and inter-row rhythm follow the reference.
- Colors/tokens: active navy, inactive blue-grey, cyan EPCI marker and pale-grey card use existing atlas tokens.
- Image quality/assets: no new raster assets were needed; official logo and map tiles remain unchanged.
- Copy/content: Commune and EPCI descriptions clearly state scope, including Argenteuil and Bezons.

**Interaction checks**

- Commune and EPCI switches are mutually exclusive and update `aria-pressed`.
- Search label and placeholder follow the selected scale.
- EPCI search returns and selects Argenteuil; 448 flow arcs render and the correct detail panel opens.
- “Données & évolutions” navigates to the selected profile page (`fiche.html`).
- Direction and threshold controls remain unchanged.
- Browser console: no errors.

**Comparison history**

- Earlier mismatch: native dropdown menus did not match the atlas layer-selector pattern.
- Fix: replaced them with two stacked switch rows grounded in the supplied reference; renamed the data action.
- Post-fix evidence: combined comparison and browser interaction checks above.

**Follow-up polish**

- None required for this correction.

final result: passed
