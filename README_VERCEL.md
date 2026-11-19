# Memento Knives V52

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

Scorri verso l’alto per avanzare di scena e verso il basso per tornare. Il trascinamento orizzontale ruota il modello. I chevron cambiano coltello nella scena aperta. In basso a sinistra trovi i controlli continui di apertura ed esploso. In Inspect, le quattro camere e lo zoom sono affiancati alla sezione XYZ. Il reset ripristina posa, camera e sezioni.

Material e Color memorizzano le scelte per modello e componente. Il richiamo sotto il nome mostra la coppia selezionata e la descrizione del campione appena scelto. Il catalogo UI è in `app/lib/catalogue-data.json`.

L’incavo luminoso e il percorso orbitale condividono le coordinate definite in `app/lib/choreography.ts`. La tinta di ciascun modello si imposta in `STAGE_COLORS` in `app/lib/lighting.ts`. I cinque valori iniziali usano lo stesso bianco caldo.
