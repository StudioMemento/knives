# Memento Knives V56

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

Le cinque icone in basso aprono Stage, Blade, Handle, Details e Camera & Lighting. I chevron ai lati cambiano coltello nella sezione aperta. Trascina lo stage per ruotare il modello. La rotella e il pinch regolano lo zoom. Con il focus sul canvas funzionano anche i tasti più e meno. Un tap sul modello nello Stage apre Blade.

Le frecce orizzontali della tastiera cambiano coltello e quelle verticali cambiano sezione. Con il focus sul canvas le quattro frecce ruotano il modello. I due comandi fissi alla destra della navbar controllano l’apertura della lama e la vista esplosa.

Sotto il prezzo, ciascuna delle tre sezioni mostra la finitura e il colore con i rispettivi campioni. Seleziona un’intestazione per modificare quella parte. Il modello 3D, i campioni e il prezzo leggono la stessa configurazione. Il browser ricorda le scelte per modello.

Camera & Lighting offre sei inquadrature e i set Atelier, Ghiaccio, Ambra, Noir, Prisma e Seta. Su Edge la quinta vista inquadra l’anello posteriore. Le due viste macro seguono il particolare anche durante l’esploso.

## Direzione artistica e listino

La palette dei cinque stage e i sei set luce si trovano in `app/lib/art-direction.ts`. Il piano e la gola luminosa incassata sono in `app/lib/lighting.ts`. La nebbia in primo piano è in `app/lib/foreground-fog.ts`.

Il listino dimostrativo in euro si trova in `app/lib/pricing.ts`. Le fasce per modello vanno da 249,00 a 998,90 euro nella collezione. Il peso di materiali e colori determina la posizione nella fascia. I centesimi distinguono tutte le 46.656 combinazioni di ogni modello. Il test controlla tutte le 233.280 configurazioni.

La punta aperta dei cinque modelli percorre la gola nello spazio 3D. Il piano e i modelli condividono la profondità di scena. Il punto di messa a fuoco governa la sfocatura sul retro.

Il margine esterno dei comandi e del logo è il 10%. La scheda prodotto passa dal 10% al 15% da 700 px e al 20% da 1200 px. Gli schermi da 1500 px con rapporto di almeno 21∶10 hanno margini del 30% e una colonna centrale del 40%.
