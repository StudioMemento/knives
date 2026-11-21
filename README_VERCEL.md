# Memento Knives V63

This Next.js showroom features Hyper, Vertex, Edge, Tris and Quad. The archive root is the Vercel project root. Use the Next.js preset for the static export to `out/`.

## Run locally

Use Node.js 24.x locally and on Vercel. Run `npm ci` and `npm run dev` to start the showroom. Use `npm run build`, `npm run check` and `npm test` to validate it.

## Controls

The product name, price and Blade/Handle/Metals summary share 15% side margins at every viewport width. Vertex is the widest name in the showroom typeface and sets the common type size. Letter spacing brings both ends of each name to the margins. The price uses half the name size. A single gradient rises through both lines.

The logo, five navigation symbols and controls use a centered column at 80% of the viewport width, up to 344 px. Each navigation symbol uses the same diamond perimeter. The readout fits above the visible floor and reflows in short viewports. Beneath the ring, four evenly spaced controls pick up its color. Style and Color each offer six variants. The gap below each heading matches the gap between its swatch rows. Inspect uses six framed camera symbols and six square lighting samples.

The 3D ring supplies the live tint for headings, swatch outlines, controls and keyboard focus. In each summary group the double slash ends at the right edge of the thumbnail. Titles and material names share a second column. Selections are saved per model. Demo prices are shown in whole euros. Base prices are in `app/lib/catalogue.ts` and option prices are in `app/lib/catalogue-data.json`.

## Camera and light

Drag to rotate. Scroll or pinch to zoom from 0.8× to 2.8×. Changing sections, models or camera views restores the reference framing. Inspect offers six camera views and six light presets. Studio, Softbox, Raking, Backlight, Amber and Two-tone each set the light positions, colors, intensities and studio reflections. The selected light applies to all five models during the session. Presets are defined in `app/lib/light-presets.ts`.

Use the left and right arrow keys to switch models and the up and down arrow keys to change sections. When the 3D canvas has focus, the arrow keys rotate the model. Use Tab and Enter to select controls.
