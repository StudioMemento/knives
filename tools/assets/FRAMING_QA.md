# CPU framing QA

No WebGL or replacement browser was used. Actual animated GLB vertices were projected with Stage.tsx camera 38°, viewport 1363 × 936 and 390 × 844. Coordinates are normalized with top-left origin. Each row below is the union of all five models, in xmin / ymin / xmax / ymax order. Stable anchors only; idle wobble and scrolling transitions are outside this check.

## Baseline before framing corrections

| Scene | Desktop | Mobile |
|---|---|---|
| Hero | 0.219 / 0.145 / 0.517 / 0.852 | 0.130 / 0.178 / 0.706 / 0.606 |
| Blade (focused blade only) | 0.109 / 0.239 / 0.496 / 0.729 | -0.015 / 0.235 / 0.723 / 0.530 |
| Handle closed | 0.037 / 0.371 / 0.553 / 0.649 | -0.148 / 0.322 / 0.824 / 0.489 |
| Metals closed | 0.234 / 0.262 / 0.813 / 0.648 | 0.216 / 0.250 / 1.281 / 0.465 |
| Explore assembled | 0.015 / 0.416 / 0.577 / 0.622 | -0.189 / 0.356 / 0.865 / 0.479 |
| Explore exploded side | -0.108 / 0.340 / 0.701 / 0.750 | -0.420 / 0.311 / 1.097 / 0.555 |
| Explore exploded top | -0.129 / -0.051 / 0.705 / 1.027 | -0.438 / 0.082 / 1.105 / 0.715 |
| Explore exploded edge | -0.219 / 0.296 / 0.672 / 0.788 | -0.415 / 0.280 / 1.047 / 0.563 |
| Explore exploded perspective | -0.093 / 0.385 / 0.679 / 0.918 | -0.222 / 0.342 / 1.055 / 0.580 |

Desktop METALS invades the x ≥ .72 HUD exclusion zone in all five models. The desktop Blade macro intentionally crops non-focused handle geometry above the viewport. Mobile Handle, Metals, and open Explore crop actual focused geometry. Exploded technical views can crop on every viewport and can overlap lower-right mobile controls.

## Final implemented framing policy

The latest harness imports `app/lib/framing.ts` directly from the Sites checkout. Stage now uses the verified macro corrections:

- Desktop METALS: position.x = -2.3.
- Mobile BLADE: final position.x = -.25.
- Mobile HANDLE: final position.x = 0; mobile scale multiplier .55.
- Mobile METALS: final position.x = -.8; mobile scale multiplier .50.
- Explore center: desktop (-1.1, -.12, .65), mobile (0, 1.40, .65).

Without detail focus, Explore computes `baseRadius = animatedRadius / zoomFactor`, then `cap = min(1, safeRadius / baseRadius, fullViewportRadius / (baseRadius * zoomFactor))`. At zoom 1, geometry remains in the HUD-safe rectangle. The numerical zoom-factor 1.3 check also uses no detail focus: it may enter the HUD area while retaining the whole geometry within [ .02, .02, .98, .98 ]. Explicit detail focus from double-click or the lens deliberately omits the full-viewport cap, retains `safeRadius / baseRadius`, and limits requested zoom to 1.27 / 1.3. That macro mode can crop the scene and is excluded from the fit guarantees and tests below, including its camera pan.

| Scene | Final desktop bounds | Final mobile bounds |
|---|---|---|
| Blade (focused blade only) | 0.109 / 0.239 / 0.496 / 0.729 | 0.062 / 0.235 / 0.802 / 0.530 |
| Handle closed | 0.037 / 0.371 / 0.553 / 0.649 | 0.084 / 0.334 / 0.920 / 0.477 |
| Metals closed | 0.125 / 0.262 / 0.668 / 0.648 | 0.116 / 0.283 / 0.907 / 0.447 |
| Explore assembled | 0.081 / 0.428 / 0.587 / 0.610 | 0.107 / 0.251 / 0.894 / 0.342 |
| Explore exploded side | 0.076 / 0.407 / 0.587 / 0.665 | 0.101 / 0.240 / 0.894 / 0.368 |
| Explore exploded top | 0.070 / 0.166 / 0.586 / 0.835 | 0.099 / 0.122 / 0.891 / 0.448 |
| Explore exploded edge | 0.063 / 0.404 / 0.551 / 0.680 | 0.134 / 0.217 / 0.853 / 0.368 |
| Explore exploded perspective | 0.127 / 0.429 / 0.573 / 0.725 | 0.182 / 0.260 / 0.866 / 0.372 |
| Explore exploded top, factor 1.3 without focus | 0.052 / 0.141 / 0.603 / 0.856 | 0.035 / 0.094 / 0.953 / 0.473 |

## Orbit and zoom validation

The final regression uses each actual mesh bounding sphere, with the production radius also enclosing all eight AABB corners, and the production `animatedRadius` / `safeSphereRadius` helpers. A projected sphere envelope conservatively contains all mesh triangles. Each of 5 models × 2 viewports uses 25 fold/explosion states, all 4 preset views, 36 yaw samples (10° increments), 3 pitch offsets (-1.05 / 0 / 1.05), and zoom 1 / 1.3: **216,000 configurations, zero framing violations**.

At zoom 1 there are also **zero potential HUD overlaps** in all tested views. At numerical zoom factor 1.3 without detail focus, mobile sphere envelopes can enter the lower-right HUD area while the whole geometry remains in the viewport. The default orbit/view state at factor 1 has no HUD overlap. Desktop envelopes remain clear of the HUD in the tested configurations.

| Viewport / zoom | Enclosing projected bounds across all models and orbits | Framing violations | Potential HUD overlap cases |
|---|---|---|---|
| desktop / 1 | 0.047 / 0.128 / 0.594 / 0.913 | 0 | 0 |
| desktop / 1.3 | 0.025 / 0.100 / 0.612 / 0.941 | 0 | 0 |
| mobile / 1 | 0.093 / 0.103 / 0.907 / 0.483 | 0 | 0 |
| mobile / 1.3 | 0.027 / 0.071 / 0.973 / 0.512 | 0 | 3246 |

Potential overlap counts use conservative sphere envelopes, not a rendered-pixel collision claim. Actual vertex projections at the anchors are stored separately in `framing-corrected-report.json`.

| Viewport | HUD-safe screen rectangle | Safe radius | Whole-viewport radius |
|---|---|---|---|
| desktop | 0.040 / 0.080 / 0.690 / 0.920 | 2.109606 | 2.249302 |
| mobile | 0.040 / 0.100 / 0.960 / 0.490 | 1.109702 | 1.286133 |

In the non-focus numerical check, the viewport cap limits effective enlargement around these fixed centers to about 1.066× desktop and 1.159× mobile even when factor 1.3 is requested. The actual explicit detail-focus mode omits this viewport cap and can use the desired 1.27 / 1.3 factor with intentional macro cropping.

The enclosing-radius cap is orientation-independent: an enclosing sphere inside the safe camera frustum remains inside under arbitrary rotation. Actual animated pose bounds must be recomputed before applying the cap. Samples validate integration while the sphere containment also covers intermediate yaw/pitch geometrically. The check covers stable anchors; scrolling transitions and intentional detail-focus cropping/pan have not been certified by this harness.

Run with Node 24 (native TypeScript stripping for production helper imports):

```sh
node tools/assets/check-runtime-sampling.mjs
node tools/assets/check-framing.mjs --corrected
node tools/assets/check-orbit-fit.mjs
```

`check-framing.mjs` without `--corrected` intentionally reconstructs the pre-correction baseline. The corrected mode reconstructs final anchor transforms and imports the production fit functions. `orbit-fit-report.json` contains per-model envelopes and overlap counts.

Original source mesh-motion QA remains unchanged: these checks assess framing and sampling, not repair of source intersections or TRIS closed protrusion.
