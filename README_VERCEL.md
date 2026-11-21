# Memento Knives V60

This Next.js showroom features Hyper, Vertex, Edge, Tris and Quad. The archive root is the Vercel project root. Use the Next.js preset for the static export to `out/`.

## Run locally

Use Node.js 24.x locally and on Vercel. Run `npm ci` and `npm run dev` to start the showroom. Use `npm run build`, `npm run check` and `npm test` to validate it.

## Controls

The logo, product summary and navigation share a centered column at 80% of the viewport width, up to 344 px. The 3D scene fills the viewport. The chevrons beneath the ring switch models within the current section. The two middle controls toggle the blade and the exploded view.

Blade, Handle and Metals each have six styles and six colors. The first panel runs from the leading edge of the first navigation tile to the leading edge of the middle tile. The second runs from the trailing edge of the middle tile to the trailing edge of the last tile. Inspect uses the same layout for Camera and Light. Keyboard focus follows the shape of the control.

Behind the model, the summary shows a style and a color swatch for each part. The part names align with the option names, with a double slash in the swatch column. White lettering picks up the ring color toward the bottom. Selections are saved per model. The prices shown are demo prices in whole euros. Base prices are in `app/lib/catalogue.ts` and option prices are in `app/lib/catalogue-data.json`.

## Camera and light

Drag to rotate. Scroll or pinch to zoom from 0.8× to 2.8×. Changing sections, models or camera views restores the reference framing. Inspect offers six camera views and six light presets. Studio, Softbox, Raking, Backlight, Amber and Two-tone each set the light positions, colors, intensities and studio reflections. The selected light applies to all five models during the session. Presets are defined in `app/lib/light-presets.ts`.

Use the left and right arrow keys to switch models and the up and down arrow keys to change sections. When the 3D canvas has focus, the arrow keys rotate the model. Use Tab and Enter to select controls.
