# Memento Knives V54

Lo ZIP contiene il progetto Next.js, i cinque modelli originali, i font e i campioni del catalogo. L’ordine nello showroom è Hyper, Vertex, Edge, Tris e Quad.

## Avvio e pubblicazione

Estrai lo ZIP nella radice della copia di lavoro del progetto. Allo stesso livello devono comparire `package.json`, `vercel.json`, `app/` e `public/`. Vercel usa il preset Next.js. La build genera il sito statico in `out/`.

Con Node.js 22.18 o successivo puoi avviare l’anteprima locale.

```sh
npm ci
npm run dev
```

Per verificare la versione prima della pubblicazione esegui `npm run check`, `npm test` e `npm run build`.

## Interazioni

Le cinque icone in basso aprono le sezioni. I chevron ai lati, a metà altezza, scorrono fra i coltelli nella sezione aperta. Trascina sullo stage in qualsiasi direzione per ruotare il modello. Il trackpad e la rotella ruotano sullo stesso canvas. Un tap deliberato sul modello nello Stage apre Blade. Da tastiera, le frecce orizzontali cambiano coltello e quelle verticali cambiano sezione. Con il focus sul modello le frecce lo ruotano. Con il focus su uno slider ne regolano il valore.

I due pulsanti sopra la navbar aprono o chiudono la lama e attivano o richiudono la vista esplosa. La cornice indica lo stato. In Inspect, le viste laterale, dall’alto, frontale, prospettica, clip e viti affiancano i tagli X, Y e Z. Su Edge la quinta vista inquadra l’anello posteriore. Le macro seguono il particolare anche nell’esploso. I tagli seguono la rotazione. Il reset ripristina posa, camera e sezioni.

Il riepilogo sotto il prezzo mostra una riga per Blade, Handle e Details. Il campione combina la finitura e il colore. I selettori Material e Color conservano le scelte per modello e componente.

Il centro dell’anello e la sua quota sono definiti in `app/lib/choreography.ts`. In `app/lib/lighting.ts`, `STAGE_COLORS` assegna una luce a ogni modello. Uno spot superiore illumina il primo piano. La profondità di campo del gruppo sullo sfondo usa la distanza effettiva dei pixel dal piano di fuoco.
