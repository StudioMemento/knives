# Memento Knives V57

Showroom dei cinque modelli, sviluppato sulla V54. La radice dello ZIP è la radice del progetto Next.js per Vercel. Il preset è Next.js e la build produce il sito statico in `out/`.

## Avvio

Con Node.js 22.18 o successivo, esegui `npm ci` e `npm run dev`. Per validare il progetto usa `npm run check`, `npm test` e `npm run build`.

## Interfaccia

Il logo e la navbar occupano l’80% centrale del viewport. La scheda prodotto occupa l’80% sotto 700 px, il 70% da 700 px e il 60% da 1200 px. Su schermi larghi almeno 1500 px con rapporto di almeno 2,1:1 occupa il 40%. I telefoni in orizzontale con altezza fino a 500 px mantengono la scheda all’80%.

Le cinque icone inferiori aprono Stage, Blade, Handle, Details e Inspect. Material e Color sono centrati sulle prime due coppie di icone. I comandi per la posa sono sulla verticale della quinta icona. I chevron e i cinque punti sotto l’anello selezionano il modello nella sezione aperta.

Il riepilogo riporta materiale e colore di Blade, Handle e Details. Le scelte del catalogo sono salvate per modello anche dopo il ricaricamento. I prezzi sono dimostrativi, in euro interi. Il prezzo base per modello è in `app/lib/catalogue.ts` e ogni alternativa ha un supplemento `surcharge` in `app/lib/catalogue-data.json`. Le opzioni di serie hanno supplemento zero.

## Camera e luci

Trascina per ruotare il modello. La rotella o il pinch regolano lo zoom ottico fra 0,8× e 2,8× rispetto all’inquadratura attiva. Il punto inquadrato resta fermo durante lo zoom. Aprire un’altra sezione, selezionare un altro modello o scegliere una vista ripristina l’inquadratura di riferimento.

Inspect offre sei inquadrature e tre luci regolabili. Key controlla lo spot, Fill il riempimento ambiente e Rim la luce di contorno. Il valore iniziale del 100% corrisponde all’illuminazione V54. Le luci seguono la sessione e si applicano ai cinque modelli.

Le frecce orizzontali cambiano modello e le verticali cambiano sezione. Con il focus sul canvas le frecce ruotano il modello. Con il focus su una luce regolano il suo valore.
