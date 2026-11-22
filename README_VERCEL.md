# Memento Knives V64

This Next.js showroom features Hyper, Vertex, Edge, Tris and Quad. The archive root is the Vercel project root. Use the Next.js preset for the static export to `out/`.

## Run locally

Use Node.js 24.x locally and on Vercel. Run `npm ci` and `npm run dev` to start the showroom. Use `npm run build`, `npm run check` and `npm test` to validate it.

## Controls

The product name, price and Blade/Handle/Metals summary share 15% side margins at every viewport width. Vertex is the widest name in the showroom typeface and sets the common type size. Letter spacing brings both ends of each name to the margins. The right-aligned price uses half the name size and shares its top edge with the left-hand material summary. Blade, Handle and Metals stack vertically at every viewport width. A single gradient rises through the price and the name. The camera fits the default shot between or below the two readouts. Price and summary sit in the foreground during inspection and manual zoom.

The logo, five navigation symbols and controls use a centered column at 80% of the viewport width, up to 344 px. Five standalone symbols select the stage, blade, handle, hardware and inspection views. The model chevrons, fold control and exploded view sit in front of the stage, above the near edge of the ring. Below the ring, the material selector is headed Blade, Handle or Metals according to the active chapter. It offers six finishes and six colors. Inspect has six camera symbols and six lighting symbols with keyboard focus, accessible names and hover labels.

The 3D ring supplies the live tint for headings, swatch outlines, controls and keyboard focus. In each summary group the double slash ends at the right edge of the thumbnail. Titles and material names share a second column. Selections are saved per model. Demo prices are shown in whole euros. Base prices are in `app/lib/catalogue.ts` and option prices are in `app/lib/catalogue-data.json`.

## Camera and light

Drag to rotate. Scroll or pinch to zoom from 0.8× to 2.8×. Changing sections, models or camera views restores the reference framing. Inspect offers six camera views and six light presets. Spotlight uses a focused beam. Penumbra softens the beam and spreads the reflections. Point light uses a local omnidirectional lamp with inverse-square decay. Dome combines hemispherical illumination with a continuous sky-to-ground reflection. Rim light uses rear strip reflections and a directional rim. Studio light is the default three-point setup. The selected light applies to all five models during the session. Presets are defined in `app/lib/light-presets.ts`.

Use the left and right arrow keys to switch models and the up and down arrow keys to change sections. When the 3D canvas has focus, the arrow keys rotate the model. Use Tab and Enter to select controls.
