# Memento Knives V69

This Next.js showroom features Hyper, Vertex, Edge, Tris and Quad. The archive root is the Vercel project root. Use the Next.js preset for the static export to `out/`.

## Run locally

Use Node.js 24.x locally and on Vercel. Run `npm ci` and `npm run dev` to start the showroom. Use `npm run build`, `npm run check` and `npm test` to validate it.

## Controls

The product name, price and Blade/Handle/Metals summary share 15% side margins at every viewport width. Vertex is the widest name in the showroom typeface and sets the common type size. Letter spacing brings both ends of each name to the margins. The right-aligned price uses half the name size and shares its top edge with the left-hand material summary. Blade, Handle and Metals stack vertically at every viewport width. A single gradient rises through the price and the name. The model passes in front of this text and its reveal effect.

The logo and navigation use a centered column at 80% of the viewport width, up to 344 px. Each navigation symbol is cut out of a tile with two long chamfers and two short ones. The compact finish/color and camera/light groups align with the outside edges of the first and last tiles. Each group holds two rows of three options.

The model chevrons, fold and exploded-view controls sit above the near edge of the ring. On desktop a transparent glyph mask draws the controls between the floor and the active model at rest. It shares the button outlines with the interactive SVGs. Hovering over the strip or focusing it with the keyboard brings the four icons forward. They stay in front for touch so the model cannot cover the controls. The spaces between the buttons still accept stage gestures. The exploded-view toggle spreads its plates and reverses its arrows as the model separates.

The 3D ring supplies the live tint for headings, swatch outlines, controls and keyboard focus. In each summary group the double slash ends at the right edge of the thumbnail. Titles and material names share a second column. Selections are saved per model. Demo prices are shown in whole euros. Base prices are in `app/lib/catalogue.ts` and option prices are in `app/lib/catalogue-data.json`.

The option grids share one gap between thumbnails in either direction and between the heading and first row. The configuration summary uses the locally hosted Memento UI Light face at every size. Inspect uses a side profile, an overhead eye and an end-on reticle for the principal views. The two macro views frame the physical detail. Lighting presets show the source or its effect, including the spotlight, the sky dome and the two studio stands. Each heading has a full line box inside the panel. The models load in parallel. The scene and UI appear together after the first complete frame, with type and swatches in place and both model arrows available. Particles follow changes to the product name and price.

The mouse pointer is a 14 × 16 px solid dart in the live ring color. Its tip marks the pointer position across the stage, controls and drag gestures. Touch and keyboard navigation use their native input behavior. The showroom suppresses tooltips, text selection, native image dragging, the context menu and auxiliary mouse clicks. The primary mouse button, touch, wheel zoom and keyboard controls operate the experience.

## Camera and light

Drag to rotate. Scroll or pinch to zoom from 0.8× to 2.8×. Changing sections, models or camera views restores the reference framing. Inspect offers six camera views and six light presets. Spotlight uses a focused beam. Penumbra softens the beam and spreads the reflections. Point light uses a local omnidirectional lamp with inverse-square decay. Dome combines hemispherical illumination with a continuous sky-to-ground reflection. Rim light uses rear strip reflections and a directional rim. Studio light is the default three-point setup. The selected light applies to all five models during the session. Presets are defined in `app/lib/light-presets.ts`.

The stage centers the projected silhouette of the active model in the viewport. The component views center the selected component, and a macro or picked point remains the inspection target. On ultrawide screens, viewport height limits the diagonal. The camera uses small measurement meshes generated from the five original GLBs. To regenerate them after changing an asset, run `node tools/assets/framing-proxies.mjs`.

Use the left and right arrow keys to switch models and the up and down arrow keys to change sections. When the 3D canvas has keyboard focus, the ring controls brighten and the arrow keys rotate the model. Use Tab and Enter to select controls.
