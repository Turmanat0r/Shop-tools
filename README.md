# Turmanator Shop Tools

Offline-capable fabrication calculators. Static HTML — no build step, no
dependencies. Vercel serves this directory as-is.

| Page | What it does |
|---|---|
| `index.html` | Beam capacity (bending / shear / deflection), angle + miter, right triangles |
| `axle/index.html` | Tongue weight and axle placement for torsion-axle trailers |

## Offline

`sw.js` caches both pages plus the manifest and icon, so the tools open with no
signal once they have been loaded once with a connection. Bump `CACHE` in
`sw.js` on every deploy or phones will keep serving the old copy.

## Engineering notes

**Beam.** A36, allowable bending 0.6·Fy = 21.6 ksi, allowable shear 0.4·Fy =
14.4 ksi, E = 29,000 ksi. Section properties model radiused corners at an
outside radius of 2×wall, which reproduces the published AISC HSS values for
I, S and weight — a sharp-corner approximation overstates I by 7–11%.

**Axle.** Rigid trailer on two supports, coupler at 0 and axle group at La:

    TW = Ws - Ms/La                    tongue weight
    La = Ms / (Ws - p*(Ws + Wa))       axle position for target fraction p

`Wa` is the axle assembly, modelled riding at the axle: it is carried entirely
by its own support so it adds nothing to tongue weight, but it still counts in
gross, which pushes the target position aft.

**Torsion geometry.** The load acts at the contact patch, not the bracket. Arm
reach is `L·cos(start − rise)`. The 20.8° full-load rise and the 1.33"
bar-below-bracket offset were solved from the Dexter Torflex full-load
application chart, whose H column is tire-independent and therefore pure
geometry; the fit holds to 0.017" RMS across all seven published start angles.
Arm length varies by series, so it is an input.

Tandem and triple torsion axles have no equalizer, so the per-axle split shown
is nominal.
