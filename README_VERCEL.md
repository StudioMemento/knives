# Memento Knives V61

This Next.js showroom features Hyper, Vertex, Edge, Tris and Quad. The archive root is the Vercel project root. Use the Next.js preset for the static export to `out/`.

## Run locally

Use Node.js 24.x locally and on Vercel. Run `npm ci` and `npm run dev` to start the showroom. Use `npm run build`, `npm run check` and `npm test` to validate it.

## Controls

The product name, price and Blade/Handle/Metals summary occupy the middle 80% of the viewport on phones, 70% from 768 px, 60% from 1024 px and 40% from 1920 px. The outer letters of the name align optically with the margins. The price sits below the name in the same upward gradient.

The logo, five diamond navigation buttons and controls use a separate centered column at 80% of the viewport width, up to 344 px. Beneath the ring, the previous-model, blade, exploded-view and next-model buttons have equal center spacing. Each material panel has six styles and six colors in two three-column grids. The headings align with the artwork at both ends. Inspect uses the same grid for Camera and Light.

The 3D ring supplies the live tint for the headings, summary, active controls and keyboard focus. The summary shows a style and a color for each part, with the double slash on the swatch edge and the names on a shared text column. Selections are saved per model. The prices shown are demo prices in whole euros. Base prices are in `app/lib/catalogue.ts` and option prices are in `app/lib/catalogue-data.json`.

## Camera and light

Drag to rotate. Scroll or pinch to zoom from 0.8× to 2.8×. Changing sections, models or camera views restores the reference framing. Inspect offers six camera views and six light presets. Studio, Softbox, Raking, Backlight, Amber and Two-tone each set the light positions, colors, intensities and studio reflections. The selected light applies to all five models during the session. Presets are defined in `app/lib/light-presets.ts`.

Use the left and right arrow keys to switch models and the up and down arrow keys to change sections. When the 3D canvas has focus, the arrow keys rotate the model. Use Tab and Enter to select controls.
