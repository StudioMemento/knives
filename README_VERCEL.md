# Memento Knives V53

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

I due slider sopra la navbar controllano lama ed esploso. In Inspect, i quattro preset e lo zoom affiancano i tagli XYZ. I tagli seguono il modello durante la rotazione. Il reset ripristina posa, camera e sezioni.

Material e Color memorizzano le scelte per modello e componente. Sotto al nome trovi le due descrizioni attive. In Inspect si riferiscono all’ultima parte visitata per quel coltello, oppure al manico al primo ingresso. Il catalogo UI è in `app/lib/catalogue-data.json`.

L’incavo luminoso e il percorso orbitale condividono le coordinate definite in `app/lib/choreography.ts`. La tinta di ciascun modello si imposta in `STAGE_COLORS` in `app/lib/lighting.ts`. I cinque valori iniziali usano lo stesso bianco caldo.
