# Design QA — sélecteur Commune / EPCI

- Source visual truth: `/var/folders/3h/px_6bwl96w50x8y34bkz_k_80000gn/T/TemporaryItems/NSIRD_screencaptureui_I6Hm2D/Capture d’écran 2026-08-03 à 23.00.44.png`
- Implementation screenshot: `/tmp/atlas-commune-selector.png`
- Combined comparison: `/tmp/atlas-selector-comparison.png`
- Viewport: 1280 × 720 CSS px, density 1
- Source pixels: 1020 × 1544; implementation pixels: 1280 × 720
- State: empty Commune view after switching EPCI → Commune

**Findings**

- No actionable P0/P1/P2 mismatch. The new native level selector is an intentional addition and follows the existing navy, pale-grey, radius, type and spacing system.
- The commune boundaries are more visible than in the earlier state, which fixes the lost/inactive appearance without competing with future flow lines.

**Required fidelity surfaces**

- Typography: Marianne, hierarchy, weights and uppercase eyebrow remain consistent.
- Spacing/layout: the selector fits the existing sidebar grid without overflow; action and flow controls keep their rhythm.
- Colors/tokens: existing navy, grey and cyan tokens are reused; commune fill remains neutral.
- Image quality/assets: existing official logo and OSM raster tiles are unchanged; no asset substitution.
- Copy/content: “Niveau d’analyse”, “Commune” and “EPCI” are explicit and concise.

**Interaction checks**

- Native selector changes Commune → EPCI → Commune.
- Commune search reappears and EPCI list is hidden when returning to Commune.
- 183 commune polygons plus departmental outlines are present; polygon pointer events are active.
- Clicking a commune after the round trip opens the correct detail panel (Bezons tested).
- Browser console: no errors.

**Focused comparison**

- Sidebar controls were compared in a single combined image. No additional crop was required because all affected typography, spacing, colors and controls are legible there.

**Comparison history**

- Initial issue: segmented buttons did not provide the requested explicit selector and the commune layer appeared inactive.
- Fix: native scale selector, synchronized state, stronger commune fill/borders, cache-busted CSS/JS.
- Post-fix evidence: successful EPCI → Commune round trip and commune click; implementation screenshot above.

**Follow-up polish**

- None required for this correction.

final result: passed
