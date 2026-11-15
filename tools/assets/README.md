# Knife V46 — FBX to browser GLB

This conversion uses the five **new user-supplied FBX files**, including their baked independent opening/explosion tracks. It does not reuse the V45 GLTF meshes.

## Reproduce

Run from the application project directory, with source FBX files in the sibling `upload` directory:

```sh
npm install --prefix tools/assets
node --max-old-space-size=4096 tools/assets/convert.mjs
node tools/assets/validate.mjs
```

The scripts write `public/models/v46/{hyper,vertex,quad,edge,tris}.glb`, per-model JSON, `manifest.json` and `validation.json`. They leave the original FBX files untouched.

## Runtime contract

- GLB length is **0.25 metres**, blade tip toward **+X**, spine toward **+Y**, thickness along **Z**. No negative scale, mirrored transform or per-model correction is required. Wrap each imported scene in a common display normalization group if the application uses larger world units. A scale of `4 / 0.25` gives an open length of 4 world units.
- `meta.bounds`, `meta.roleBounds` and `meta.focusPoints` use those native model coordinates. `meta.hinge` describes the true fixed blade pivot. All moving components remain separate and are named.
- There are exactly three named PBR material slots: `<ID>__BLADE`, `<ID>__HANDLE`, `<ID>__HARDWARE`. `__HARDWARE` is the **metals** configurator category. Each mesh also has `userData.materialRole` equal to `blade`, `handle` or `metals` and `userData.partId`.
- Source FBX files have no final baked Painter maps. Exported base PBR materials are neutral defaults; UVs and normals are present for application materials/procedural treatments.
- `meta.motion.openCloseClip`: 0 seconds = open, 6 = fully closed, 12 = reopened. To sample a normalized `openAmount` where 1 is open, use `time = (1 - openAmount) * 6`.
- `meta.motion.explodeClip`: sample `time = explodeAmount * meta.motion.explodePeakTime`. The first complete explosion is at **HYPER 10.4s**, **VERTEX 5.2s**, **QUAD 8.4s**, **EDGE 6s**, **TRIS 8.4s**. Do not assume the same duration for every knife. These are staged baked animations, so components start at different progress points.
- Opening controls quaternion tracks and explosion controls independent position tracks. Apply both clips to the same hierarchy. Do **not** also activate `COMBINED`, which is an alternative demonstration clip.
- Avoid resetting the hierarchy every animation frame after applying clips. Restore rest transforms first only when explicitly resetting. Sample cached clip interpolants or paused animation actions, then update matrices.
- Complete explosion extends much farther in Z than the assembled thickness. Camera limits and orbital spacing should use the exploded bounds in `roundTripValidation.samples` if necessary.

## Derivative geometry and validation

HYPER's source has 1,124,760 triangles. The web derivative has **163,776**: the blade and handle triangle topology is retained, while dense hardware receives conservative attribute-aware meshoptimizer simplification. Every moving mesh remains independent. UVs, normals, hierarchy and named parts survive; no negative-scale or geometry-baking shortcut is used. The other four knives retain their triangle counts, with only identical vertices indexed/welded.

All three source clips per knife are preserved, including original QA suffixes. Redundant baked keys are reduced with measured interpolation-error bounds. Six independently combined open/explode poses were exported/reimported and compared for every node, with zero node-transform difference. `validation.json` records binary integrity, attribute finiteness, index range, transforms and reduction measurements.

**Source mechanical limitations remain:** the delivery MD approves sampled HYPER motion but flags VERTEX, QUAD, EDGE and TRIS for intersections during some closure/explosion poses. TRIS also has a reported closed-blade protrusion. This conversion does not modify those mechanical shapes or certify collision clearance, and HYPER's simplified derivative has not been collision re-certified. `_QA_FAILED` clip names and `sourceMotionQA` fields are deliberately retained.

Do not include `tools/assets/node_modules`, source FBX files, inspection dumps or logs in a web deployment. Include the generated GLBs and compact JSON metadata; include conversion scripts/package files in the source handoff if reproducibility is desired.

## Runtime sampling and framing QA

`check-runtime-sampling.mjs` verifies independent OPEN_CLOSE / EXPLODE properties and prevents cumulative rear-model floating drift. Three.js PropertyMixer can skip writing unchanged samples, so remove the previous additive floating offset before sampling and add the current offset once afterward.

`check-framing.mjs --corrected` projects the actual animated GLB vertices at the final Stage anchors, on 1363 × 936 and 390 × 844 viewports. `check-orbit-fit.mjs` imports the production `app/lib/framing.ts` helpers and tests 216,000 fold/explosion, view, yaw, pitch and zoom configurations against conservative per-mesh sphere envelopes. Use Node 24 for native TypeScript import support. Both scripts resolve the application root relative to their own location.

The final technical cap fits normal non-focus viewing within a HUD-safe camera rectangle. The numerical zoom-factor 1.3 test without focus may enter the HUD area but keeps complete geometry inside the viewport with 2% margins. Default viewing has zero potential HUD overlaps. Explicit detail focus (double-click or lens) deliberately bypasses the full-viewport cap, retains the base safe-radius cap, and allows macro cropping at requested zoom 1.27 / 1.3. That intentional focus mode, its pan, and scrolling transitions are outside the stable-anchor framing check. Effective enlargement 1.066× desktop / 1.159× mobile applies only to the numerical non-focus zoom test. `FRAMING_QA.md` and the three framing report JSON files record full bounds and evidence; original mesh-motion QA remains unchanged.
