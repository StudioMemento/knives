# Memento Knives V71

This Next.js showroom features Hyper, Vertex, Edge, Tris and Quad. The archive root is the Vercel project root. Use the Next.js preset for the static export to `out/`.

## Materiali V71

Le cinque mesh animate in `public/models/v71` hanno tre atlanti UV0 ciascuna. Le UV precedenti sono conservate in TEXCOORD_1. La scena carica le texture in `public/pbr`. Il modello in primo piano usa le mappe da 1024 px, con NormalGL e ORM da 2048 px per la lama Hyper S07. I modelli sullo sfondo usano mappe da 256 px. Il cambio di combinazione applica insieme tutti i canali per la zona selezionata.

Sulla lama di Hyper, il settimo pulsante Style seleziona **Feather Damascus**. La combinazione di anteprima usa Gunmetal, il secondo Color. Il supplemento dimostrativo di questa finitura è €34 e può essere modificato in `app/lib/catalogue-data.json`.

I master PNG e gli OBJ per Painter sono nel kit V71 separato. Per riportare una coppia personalizzata nel sito, esporta `BaseColor.png`, `NormalGL.png` e `ORM.png` da Painter. L’importatore accetta anche AO, Roughness e Metallic separati. Esegui `python tools/pbr/import_painter.py --source /percorso/export --model HYPER --zone blade --color C02 --style S07` e poi `npm run build`. Per usare l’importatore servono NumPy e Pillow.

## Run locally

Use Node.js 24.x locally and on Vercel. Run `npm ci` and `npm run dev` to start the showroom. Use `npm run build`, `npm run check` and `npm test` to validate it.

## Controls

The product name, price and Blade/Handle/Metals summary share 15% side margins at every viewport width. Vertex is the widest name in the showroom typeface and sets the common type size. Letter spacing brings both ends of each name to the margins. The right-aligned price uses half the name size and shares its top edge with the left-hand material summary. Blade, Handle and Metals stack vertically at every viewport width. A single gradient rises through the price and the name. The model passes in front of this text and its reveal effect.

The logo and navigation use a centered column at 80% of the viewport width, up to 344 px. Each navigation symbol is cut out of a square tile with chamfers at its upper-left and lower-right corners. The compact finish/color and camera/light groups align with the outside edges of the first and last tiles. Groups use two rows. Hyper’s blade finish bank uses four columns to accommodate Feather Damascus.

The model chevrons, fold and exploded-view controls sit above the near edge of the ring. On desktop the browser composites native SVG buttons between the backdrop and the active model. One WebGL renderer produces both layers, so the SVG edges follow the display resolution at rest and on hover. Hovering over the strip or focusing it with the keyboard brings the four icons forward. They stay in front for touch so the model cannot cover the controls. The spaces between the buttons still accept stage gestures. The exploded-view toggle spreads its plates and reverses its arrows as the model separates.

The 3D ring supplies the live tint for headings, swatch outlines, controls and keyboard focus. In each summary group the double slash ends at the right edge of the thumbnail. Titles and material names share a second column. Selections are saved per model. Demo prices are shown in whole euros. Base prices are in `app/lib/catalogue.ts` and option prices are in `app/lib/catalogue-data.json`.

The option grids share one gap between thumbnails in either direction and between the heading and first row. The configuration summary uses the locally hosted Memento UI Light face at every size. The camera icons depict side, top, end-on and three-quarter views of one stylized knife. Two close-ups show the pocket clip (rear loop on Edge) and pivot screw. Keyboard focus adds a small mark beneath the active control. Lighting presets show the source or its effect, including the spotlight, the sky dome and the two studio stands. Each heading has a full line box inside the panel. The models load in parallel. The scene and UI appear together after the first complete frame, with type and swatches in place and both model arrows available. Particles follow changes to the product name and price.

The mouse pointer is a 14 × 16 px white dart. A short glow follows its motion in the current ring color and fades at rest. Reduced-motion mode retains the white tip and suppresses the trail. Touch and keyboard navigation use their native input behavior. The showroom suppresses tooltips, text selection, native image dragging, the context menu and auxiliary mouse clicks. The primary mouse button, touch, wheel zoom and keyboard controls operate the experience.

## Camera and light

Drag to rotate. Scroll or pinch to zoom from 0.8× to 2.8×. Changing sections, models or camera views restores the reference framing. Inspect offers six camera views and six light presets. Spotlight uses a focused beam. Penumbra softens the beam and spreads the reflections. Point light uses a local omnidirectional lamp with inverse-square decay. Dome combines hemispherical illumination with a continuous sky-to-ground reflection. Rim light uses rear strip reflections and a directional rim. Studio light is the default three-point setup. The selected light applies to all five models during the session. Presets are defined in `app/lib/light-presets.ts`.

The stage centers the projected silhouette of the active model in the viewport. The component views center the selected component, and a macro or picked point remains the inspection target. On ultrawide screens, viewport height limits the diagonal. The camera uses small measurement meshes generated from the five original GLBs. To regenerate them after changing an asset, run `node tools/assets/framing-proxies.mjs`.

Use the left and right arrow keys to switch models and the up and down arrow keys to change sections. When the 3D canvas has keyboard focus, the ring controls brighten and the arrow keys rotate the model. Use Tab and Enter to select controls.
