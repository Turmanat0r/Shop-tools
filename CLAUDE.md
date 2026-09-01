# Turmanator Shop Tools

Static, offline-capable fabrication calculators for a trailer shop. No build
step, no dependencies, no framework. Vercel serves this directory as-is and
auto-deploys on every push to `main`.

Live: https://shop-tools-gamma.vercel.app

## Layout

```
index.html      Shop Systems home page (boot sequence, tool cards)
fab/            Beam capacity, angle + miter, right triangles
axle/           Tongue weight and torsion-axle placement
cut/            Cut list nesting, kerf, remnants
volts/          DC voltage drop, fuse, ground sizing
convert/        Fraction / decimal / metric
job/            Job sheet: rolls saved entries into a printable quote
job.js          Shared job store (localStorage) + the save bar
sw.js           Service worker, caches every page
```

Each tool owns its own visual identity on purpose. Do not homogenise them.

## Rules that bite if ignored

**Bump `CACHE` in `sw.js` on every deploy.** It is at `shop-tools-v5`. Forget it
and phones keep serving the old copy indefinitely.

**Desktop styles go inside `@media (min-width: ...)` only.** Phone rendering is
the reference and must not move. It was verified by rendering with and without
the desktop blocks, animations frozen, and hashing the images — byte-identical
at 390, 414, 819 and 899 px. Re-verify that way after any layout change.

**Use CSS multi-column, not grid, for the two-column desktop layouts.** Grid
rows are shared across columns, which leaves dead space and splits paragraphs
mid-sentence. That was tried and reverted.

**Navigation links are 44 px minimum** (`min-height: 44px` with flex centering,
not padding arithmetic — the pages use three different typefaces and one loads
over the network).

## Engineering constants and where they came from

- **Steel**: A36. Bending 0.6·Fy = 21.6 ksi, shear 0.4·Fy = 14.4 ksi,
  E = 29,000 ksi, density 0.2836 lb/in³.
- **Tube sections**: radiused corners at an outside radius of 2×wall. This
  reproduces the published AISC HSS values for I, S and weight. A sharp-corner
  model overstates I by 7–11% and area by 4–6%. `fab/` and `cut/` must agree on
  the weight of the same tube — check that after touching either.
- **Torsion axle**: arm reach is `L·cos(start − rise)`. The 20.8° full-load rise
  and the 1.33" bar-below-bracket offset were solved by fitting the Dexter
  Torflex full-load chart, whose H column is tire-independent and therefore pure
  arm geometry. Fit holds to 0.017" RMS across all seven published start angles.
  Arm length varies by series, so it is an input.
- **Wire**: solid copper at 20 °C, within 0.04% of the AWG geometric definition.
  Stranded and warm wire run higher, so the drop is a floor.
- **Kerf**: n pieces plus a drop needs n cuts, not n−1. A remainder shorter than
  one kerf is consumed by the blade and reports as nothing.

## Verification standard

Every math change is checked against an **independent model** — a second
implementation, a physical simulation, or published tables — never against the
page's own arithmetic. Then fuzzed with randomised inputs.

**A single clean run is not evidence.** Two real bugs in this project surfaced
only on repeat runs, one of them intermittently (a sub-kerf remainder that
overran a progress bar in roughly one run in five). Run fuzzers several times.

Playwright drives the pages; Chromium is at `/opt/pw-browsers/chromium`.

## Recurring hazard

Re-themed files have twice arrived carrying the **original pre-correction math**
— sharp corners, no shear check, the 90° float-comparison bug, and notes whose
conservatism claims are backwards. When a new theme shows up for an existing
tool, diff its script against the current one before assuming only styling
changed, and keep the verified engine.

The "backwards note" pattern is worth watching for generally: several notes
claimed a simplification was conservative when it erred the other way.

## Deliberate limitations

- Jobs are per-device `localStorage`. No sync, no accounts. Clearing site data
  erases them; the printed sheet is the durable copy. Sync would need a database
  and auth, and the site is public.
- The job sheet carries quantities and specs only. No pricing.
- Fonts load from Google. Offline they fall back; the service worker only caches
  same-origin files.
- Beam capacity does not subtract the tube's own weight.
