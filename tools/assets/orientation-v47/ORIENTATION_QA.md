# V47 — orientamento verificato sulla geometria

**La correzione è comune a tutti e cinque i modelli; non servono correzioni per modello.** Le proiezioni ortografiche delle mesh confermano punta **+X**, dorso **+Y**, tagliente **−Y**. Le clip sono sulla faccia **+Z**; la faccia da presentare alla camera è **−Z**. EDGE non contiene una clip esterna: la stessa faccia −Z mantiene coerenza con gli altri modelli.

La tavola di riferimento richiede punta a sinistra e dorso in alto nell’Explore; punta in basso a sinistra e manico in alto a destra nella Hero. Il `Rz(π)` attuale manda il dorso verso il basso e lascia davanti la faccia con clip.

## Riscontri geometrici

Sono state campionate le vere mesh GLB con `OPEN_CLOSE=0`, `EXPLODE=0`, applicando tutta la gerarchia. A tre sezioni della lama (45%, 60%, 75% della coordinata X della punta), lo spessore sul bordo +Y supera quello sul bordo −Y in tutti i modelli. Questo verifica il lato del dorso senza basarsi sul solo MD. Le viste CPU mostrano anche bisello, foro/apertura, profilo e lato clip.

| Modello | Punta X, mm | Clip: intervallo Z, mm | Min. rapporto spessore dorso/tagliente |
|---|---:|---:|---:|
| HYPER | +120.274 | +5.319 … +8.554 | 3.098 |
| VERTEX | +122.168 | +4.277 … +9.480 | 3.583 |
| QUAD | +118.460 | +5.685 … +10.479 | 2.767 |
| EDGE | +114.965 | Nessuna clip esterna nel GLB | 3.097 |
| TRIS | +126.041 | +4.660 … +9.854 | 2.519 |

VERTEX e TRIS hanno aperture nel manico: la clip posteriore può essere visibile **attraverso i fori**, pur rimanendo dietro la faccia principale. Non è un orientamento errato e non richiede di nascondere componenti.

## Trasformazione consigliata

Canonico Explore, ordine quaternion Three.js `[x,y,z,w]`:

```ts
const canonical = new THREE.Quaternion(0, 1, 0, 0); // Ry(Math.PI)
// Matrice in righe:
// [-1, 0,  0]
// [ 0, 1,  0]
// [ 0, 0, -1]
```

Questo manda punta `(+1,0,0) → (−1,0,0)`, dorso `(0,+1,0) → (0,+1,0)`, faccia clip `(0,0,+1) → (0,0,−1)`. Il determinante è **+1**: è una rotazione, senza specchiare geometria, winding o normali.

Hero, mantenendo l’inclinazione e la traiettoria della punta già usate:

```ts
const presentationRoll = Math.PI / 2 - .58 * authority;
const heroQ = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(0, 0, 1), presentationRoll)
  .multiply(canonical);
```

A focus pieno: `heroQ ≃ [−0.475381985, +0.879779500, 0, 0]`. La punta va verso `(−0.548024, −0.836463, 0)`, il dorso verso `(−0.836463, +0.548024, 0)`, la faccia clip verso `(0,0,−1)`.

**Patch concettuale minima sulle pose attuali:** usare `qAttuale.multiply(new THREE.Quaternion(1,0,0,0))`, cioè moltiplicare a destra per `Rx(π)`, in ogni posa di presentazione (Hero e anchor). È equivalente al canonico sopra; conserva esattamente la direzione +X che il codice usa per il posizionamento della punta, invertendo dorso e faccia. Applicarla alla quaternion della posa prima delle interpolazioni, senza modificare singole mesh, clip di animazione o GLB. Non inserire una correzione sotto la traslazione del focus senza trasformare anche i focus point: la correzione della quaternion del gruppo evita questo problema.

Correzioni aggiuntive `C_model`: identità `[0,0,0,1]` per HYPER, VERTEX, QUAD, EDGE e TRIS. Le differenze di profilo/altezza della punta appartengono ai rispettivi design, non indicano assi invertiti.

## Evidenza e limiti

- `orientation-sheet.png`: per ogni modello, vista nativa +Z, Explore attuale `Rz(π)`, Explore proposto `Ry(π)`. Le clip sono arancioni per distinguerle.
- `hero-orientation-sheet.png`: posa Hero proposta comune ai cinque modelli.
- `axis-validation.json`: misure per modello, sezioni lama, matrici, quaternion e test degli assi; tutti passati.
- Le immagini sono proiezioni CPU ortografiche delle triangolazioni reali, con ordine di profondità e shading di faccia; servono all’ispezione, non sono render PBR finali.
- Stage e GLB non sono stati modificati. Rimangono invariati gli esiti QA meccanici originali.
