# Memento Knives V73

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

I cinque GLB animati dello Stage sono in `public/models/v73`. I quindici atlanti delle finiture usano le UV0 della V72. Il secondo canale UV è stato rimosso dagli asset web della V73. La microtrama usa la posizione del materiale nella posa aperta e segue ogni componente anche durante la chiusura e l’esploso.

`public/pbr/<modello>/<zona>/` contiene le mappe WebP. Il primo piano usa mappe da 1024 px, con NormalGL e ORM da 2048 px per la lama damasco di Hyper. Il primo fotogramma usa mappe da 256 px. Il primo piano passa poi alla qualità piena e i modelli secondari mantengono le mappe leggere fino alla selezione. BaseColor è in sRGB. Normali, roughness, metalness, curvature e ottica sono dati lineari. Le mappe numeriche vengono compresse in WebP lossless dopo una quantizzazione controllata. Il bake di curvature registra la geometria. Le lampade, le ombre, i riflessi e l’occlusione di contatto seguono la scena in tempo reale.

Il compositing usa profondità, normale della superficie, roughness e metalness. La riflessione screen-space usa il colore visibile nel fotogramma. Quando il raggio esce dal quadro la superficie conserva il riflesso dello studio. La finitura delle resine usa trasmissione, spessore locale, assorbimento e inclusioni con parallasse. Il colore del ring parte dal primo campione Handle, C01, di ciascun modello e viene normalizzato per la resa emissiva.

## Ottimizzazione delle mesh V73

| Modello | Triangoli V72 | Triangoli Stage V73 | GLB V72 | GLB Stage V73 | Dati aggiuntivi per il primo piano | Draw call del prodotto aperto e assemblato, V72 → V73 |
|---|---:|---:|---:|---:|---:|---:|
| Hyper | 154.710 | 127.628 | 6,98 MB | 4,08 MB | 0,84 MB | 52 → 4 |
| Vertex | 16.609 | 14.175 | 0,63 MB | 0,38 MB | 0,07 MB | 13 → 4 |
| Edge | 55.428 | 49.188 | 2,14 MB | 1,39 MB | 0,18 MB | 15 → 4 |
| Tris | 59.348 | 24.514 | 1,56 MB | 0,76 MB | 0,49 MB | 65 → 43 |
| Quad | 20.912 | 16.084 | 0,97 MB | 0,51 MB | 0,10 MB | 21 → 4 |
| **Collezione** | **307.007** | **231.589** | **12,28 MB** | **7,12 MB** | **1,69 MB** | |

I pesi sono in MB decimali e riguardano la sola geometria. Le cinque mesh con tutti i dettagli richiedono complessivamente 8,81 MB. Lo Stage usa le versioni leggere anche sullo sfondo del carosello. Quando si entra in una sezione di configurazione o in Inspect, si aumenta lo zoom o si cambia posa, il modello in primo piano richiede solo i vertici mancanti e gli indici del dettaglio. Il visualizzatore conserva il livello già visibile durante il caricamento e riutilizza il dettaglio nelle visite successive.

La pulizia ha eliminato 13.277 vertici ridondanti. La saldatura confronta posizione, UV0, normale, tangente e segno della tangente. La semplificazione blocca i contorni delle isole UV e conserva le aperture di ciascuna parte. Lama, clip e liner forati mantengono la triangolazione di partenza. Le posizioni e le UV0 dei vertici conservati mantengono i valori originali a 32 bit. Le direzioni di normale e tangente usano una codifica a 16 bit. Nel collaudo la deviazione angolare massima misurata sui vertici rispetto alla V72 è 0,00460°.

Con il prodotto aperto e assemblato, la minuteria opaca dello stesso materiale viene disegnata in un unico gruppo. Il contatore della tabella riguarda un passaggio sul solo prodotto dopo la preparazione del gruppo. Ombre, riflesso e postproduzione comportano passaggi aggiuntivi. Durante chiusura ed esploso il viewer usa i nodi animati originali. Se un download di dettaglio si interrompe, la mesh Stage rimane disponibile e il viewer ritenta la richiesta.

### Collaudo

`npm test` verifica i due livelli con il loader dello showroom, le chiusure, gli esplosi, le inquadrature e le 540 combinazioni del catalogo. Confronta i fotogrammi chiave, il verso e l'insieme dei triangoli di dettaglio, le coordinate di campionamento e il ritorno allo Stage. Comprende un cambio di vista durante il caricamento e il recupero da una richiesta interrotta.

Il confronto visivo locale usa cinque inquadrature per modello a 1024 × 576, comprendenti i due lati, la chiusura, l’esploso e la macro della vite isolata. Sono stati confrontati materiale neutro, normali in spazio mondo, normal map e resa con BaseColor e ORM. Le quattro viste dell’intero modello hanno una sovrapposizione di sagoma di almeno il 99,98% tra V72 e Stage V73. In tutte le 25 viste di dettaglio le maschere di sagoma coincidono. La prova include una coppia Hyper Blade C02/S06 importata con lo strumento Painter. Le misure riguardano la resa della geometria con luce e camera bloccate. Il frame rate della scena completa su PC e telefono richiede una misura sul dispositivo di riferimento.

`tools/assets/v73/mesh-audit.json` contiene i risultati per singola parte. `tools/assets/v73/visual-checks.json` riporta le misure di ogni inquadratura. Per rigenerare gli asset dalla copia V72 inclusa nel progetto, esegui questi comandi dalla radice dopo `npm ci`.

```bash
npm ci --prefix tools/assets
node tools/assets/v73/optimize.mjs
npm test
```

## Verifica delle superfici nella base V72

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
