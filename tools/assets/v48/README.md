# HYPER V48 — ottimizzazione conservativa

La versione V48 mantiene esattamente la geometria della lama, dei due manici e dell'intera clip con il wordmark MEMENTO in booleana. Non sono stati modificati né quantizzati i loro indici, posizioni, normali o UV: il verificatore confronta ogni byte dopo la decodifica.

| Misura | V46/V47 | V48 |
|---|---:|---:|
| File HYPER | 5.142.168 byte | 3.668.044 byte |
| Triangoli | 163.776 | 154.728 |
| Mesh indipendenti | 52 | 52 |
| Nodi | 108 | 108 |
| Clip di animazione | 3 | 3 |

Il payload diminuisce del **28,67%**; il numero di triangoli diminuisce del **5,52%**. La riduzione della geometria è volutamente prudente: una decimazione più aggressiva è stata scartata quando il controllo indipendente della superficie superava la tolleranza scelta.

## Parti protette

- `HYPER__blade__low` — 10.218 triangoli, invariati.
- `HYPER__handle_L__low` — 21.304 triangoli, invariati.
- `HYPER__handle_R__low` — 14.906 triangoli, invariati.
- `HYPER__clip__low` — 4.500 triangoli, invariati, comprese tutte le lettere e i bordi della booleana.

Le altre parti usano, quando possibile, una triangolazione più leggera. Tutti i vertici conservati restano su posizioni originali, con normali e UV originali. Sono bloccati i bordi topologici e tutti gli estremi dei sei piani di bounding box. Gli ingombri locali di **tutte le 52 mesh sono identici**.

Il massimo scostamento rilevato sulla superficie dell'hardware è **0,009745 mm**. Il controllo considera ogni vertice, centro di triangolo e punto medio di ogni spigolo, in entrambe le direzioni: 847.623 campioni sulle parti cambiate. È una misura campionata, non una dimostrazione matematica della distanza di Hausdorff continua. I parametri del semplificatore e il report separato sono inclusi; nessuna parte protetta utilizza questa tolleranza, perché per quelle la differenza è esattamente zero.

## Compressione e integrazione

`EXT_meshopt_compression` senza quantizzazione, filtro o cambi di precisione. Si usa la modalità `INDICES` per mantenere persino l'ordine originale degli indici della clip. Le viste di buffer identiche condividono i byte compressi. Il runtime richiede il decoder già distribuito con Three:

```js
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
```

Il manifest V48 punta al nuovo HYPER e riutilizza senza modifiche i quattro modelli V46. Restano invariati coordinate canoniche, gerarchia, trasformazioni, punti di fuoco, nomi/ruoli dei materiali, cerniere e tutti i campioni delle tre animazioni. Questa modifica non certifica nuovamente le collisioni della sorgente e non modifica gli altri modelli.

## Verifica riproducibile

Dalla radice del progetto, con le dipendenze dell'app installate:

```sh
node tools/assets/v48/verify.mjs
```

Il verificatore usa il decoder effettivo di Three e ricostruisce autonomamente conteggi, hash, byte protetti, superfici e riferimenti del manifest. Due controlli negativi provano che una mutazione della geometria protetta e una distanza positiva vengono rilevate. Il risultato completo è `qa/verification.json`.

Per rigenerare la derivata, installare le dipendenze bloccate di questa sottocartella e avviare il processo:

```sh
cd tools/assets/v48
npm ci
npm run optimize
npm run verify
```

## Confronto visivo

`qa/clip-before.png` e `qa/clip-after.png`: stessi pixel RGBA, wordmark MEMENTO leggibile. `qa/overall-before.png` e `qa/overall-after.png`: stessi ingombri e silhouette nella vista di controllo. I render sono a camera, materiali, luci e seed identici, Cycles CPU, 64 campioni. Differenza media RGB complessiva: 0,001814 su 255; solo lo 0,00306% dei pixel supera una differenza di 10/255. Questo è un controllo dell'asset, non un benchmark del browser.

Per riprodurre i render con Blender e il confronto con Pillow/Numpy:

```sh
node tools/assets/v48/verify.mjs --render-inputs
blender -b -t 4 --python tools/assets/v48/render-qa.py -- public/models/v46/hyper.glb tools/assets/v48/qa/clip-before.png clip
blender -b -t 4 --python tools/assets/v48/render-qa.py -- tools/assets/v48/qa/hyper-v48-decoded.glb tools/assets/v48/qa/clip-after.png clip
blender -b -t 4 --python tools/assets/v48/render-qa.py -- public/models/v46/hyper.glb tools/assets/v48/qa/overall-before.png overall
blender -b -t 4 --python tools/assets/v48/render-qa.py -- tools/assets/v48/qa/hyper-v48-decoded.glb tools/assets/v48/qa/overall-after.png overall
python3 tools/assets/v48/compare-renders.py
```

La copia GLB decodificata è un intermediario locale ignorato da Git. Non serve al runtime.
