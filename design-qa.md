# Design QA — ordre du panneau et fiche directe

- Source visual truth: `/var/folders/3h/px_6bwl96w50x8y34bkz_k_80000gn/T/TemporaryItems/NSIRD_screencaptureui_xHcAYF/Capture d’écran 2026-08-04 à 10.49.19.png`
- Unwanted-state evidence: `/var/folders/3h/px_6bwl96w50x8y34bkz_k_80000gn/T/TemporaryItems/NSIRD_screencaptureui_Pm9hDr/Capture d’écran 2026-08-04 à 11.00.06.png`
- Map implementation screenshot: `/tmp/carte-ordre-final.png`
- Direct profile screenshot: `/tmp/fiche-sans-menu.png`
- Viewport: 1280 × 720 CSS px, density 1
- State: carte vide en mode Commune ; fiche Argenteuil chargée directement

**Findings**

- No actionable P0/P1/P2 issue remains.
- The map sidebar now follows the shared atlas order: title, search, actions, analysis selectors, thematic controls.
- The territory profile no longer displays the “Choisir un territoire” menu; it opens directly on the URL-selected profile.

**Required fidelity surfaces**

- Typography: Marianne hierarchy and uppercase section labels preserved.
- Spacing/layout: selector block is below search/actions; direct profile uses the full content width.
- Colors/tokens: existing atlas navy, cyan, grey and orange tokens unchanged.
- Assets: official logo and map tiles unchanged.
- Copy/content: no new instruction or menu added.

**Interaction checks**

- Sidebar DOM order verified: intro → search → actions → Commune/EPCI → flow direction → threshold.
- Direct profile URL `fiche.html?type=commune&id=95018` renders Argenteuil.
- Territory menu computed display is `none`; profile workspace is one column.
- Browser console: no errors.

**Comparison history**

- Earlier issue: Commune/EPCI was placed above search and the profile exposed an unwanted territory menu.
- Fix: moved the selector block and hid the profile selector while preserving URL-driven commune/EPCI profiles and PDF export.

final result: passed
