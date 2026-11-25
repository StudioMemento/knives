# Memento Knives V72

La radice dell’archivio è il progetto Next.js. Per Vercel usa il preset Next.js con Node 24. La build genera un sito statico in `out/`.

```bash
npm ci
npm test
npm run build
```

## Showroom

Hyper, Vertex, Edge, Tris e Quad hanno ciascuno tre sezioni con sei finiture e sei colori. Ogni zona consente 36 abbinamenti. Feather Damascus occupa lo slot S06 di Hyper Blade. Una configurazione V71 salvata con il damasco S07 viene letta come S06.

Dal basso verso l’alto si trovano la navbar, i quattro comandi per modello e posa e il pannello della sezione. In Inspect compaiono le sei camere e i sei set luce. Il puntatore, i tasti freccia e i gesti sul modello permettono di navigare, ruotare e modificare lo zoom. Il pannello rispetta la safe area del dispositivo.

## Asset e rendering

I cinque GLB animati di produzione sono in `public/models/v72`. I quindici atlanti principali usano UV0. Le UV precedenti rimangono in TEXCOORD_1. La microtrama usa la posizione del materiale nella posa aperta e segue ogni componente anche durante la chiusura e l’esploso.

`public/pbr/<modello>/<zona>/` contiene le mappe WebP. Il primo piano usa mappe da 1024 px, con NormalGL e ORM da 2048 px per la lama damasco di Hyper. Il primo fotogramma usa mappe da 256 px. Il primo piano passa poi alla qualità piena e i modelli secondari mantengono le mappe leggere fino alla selezione. BaseColor è in sRGB. Normali, roughness, metalness, curvature e ottica sono dati lineari. Le mappe numeriche vengono compresse in WebP lossless dopo una quantizzazione controllata. Il bake di curvature registra la geometria. Le lampade, le ombre, i riflessi e l’occlusione di contatto seguono la scena in tempo reale.

Il compositing usa profondità, normale della superficie, roughness e metalness. La riflessione screen-space usa il colore visibile nel fotogramma. Quando il raggio esce dal quadro la superficie conserva il riflesso dello studio. La finitura delle resine usa trasmissione, spessore locale, assorbimento e inclusioni con parallasse. Il colore del ring parte dal primo campione Handle, C01, di ciascun modello e viene normalizzato per la resa emissiva.

## Verifica delle superfici

Il controllo geometrico in posa aperta copre tutte le parti animate. I quindici atlanti principali passano il controllo delle intersezioni fra triangoli UV. I campioni di cucitura confrontano le normali dopo la ricostruzione nello spazio 3D del pezzo.

| Modello | Intervento verificato |
| --- | --- |
| Hyper | Rimosse facce coincidenti e ricalcolati i raccordi su manico, pivot e minuteria. La mesh assemblata è chiusa. |
| Vertex | Ripuliti lembi sovrapposti sulle superfici, risolte le giunzioni non manifold e chiusi quattro fondi di minuteria. |
| Edge | Chiuse due fessure sulla lama e corretti i raccordi di viti, guancette e liner. La mesh assemblata è chiusa. |
| Tris | Raccordate le triangolazioni delle due guancette. Entrambe risultano chiuse quando i pannelli sono assemblati. Chiusi dieci fondi di minuteria. |
| Quad | Chiusi undici fondi di minuteria visibili nella vista esplosa. Calcolato il rilievo per ogni essenza. |

Le interfacce aperte ancora presenti riguardano il fissaggio della clip e la sede interna di Vertex, i supporti e i distanziali di Quad e alcuni componenti del pivot e dei distanziali di Tris. Le sedi e i passaggi tra componenti sono conservati. I risultati numerici sono in `tools/assets/v72-surface-audit.json`.

## Override da Substance 3D Painter

I cinque kit Painter contengono le mesh OBJ nella posa aperta, i master PNG e le maschere. Per appiattire una combinazione e reimportarla, segui `LEGGIMI.md` del kit. Lo showroom carica un override solo per la coppia scelta. Le altre combinazioni mantengono le proprie mappe.

```bash
python tools/pbr/import_painter.py --source Export/HYPER_C02_S06 --model HYPER --zone blade --color C02 --style S06
npm run build
```

L’importatore usa NumPy e Pillow e accetta BaseColor, NormalGL e ORM, oppure i tre canali AO, Roughness e Metallic separati. Accetta anche le mappe Optics e Anisotropy. La copia a qualità web e l’anteprima vengono esportate insieme.
