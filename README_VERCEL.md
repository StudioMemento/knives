# Memento Knives V58

Showroom dei cinque modelli, sviluppato sulla V57. La radice dello ZIP corrisponde alla radice del progetto Next.js per Vercel. Il preset è Next.js e la build produce il sito statico in `out/`.

## Avvio

Con Node.js 22.18 o successivo, esegui `npm ci` e `npm run dev`. Per validare il progetto usa `npm run check`, `npm test` e `npm run build`.

## Interfaccia

Logo, scheda prodotto, navbar e pannelli condividono una colonna centrata. La larghezza è l’80% del viewport fino a un massimo di 344 px, ricavato da un telefono di riferimento di 430 px. Il canvas 3D occupa l’intera finestra. Nei viewport bassi si riducono le distanze verticali.

Material e Color sono centrati sulle prime due coppie di icone della navbar. I comandi per la posa sono sulla verticale della quinta. Le due frecce e i cinque punti sotto l’anello selezionano il modello nella sezione aperta.

Il riepilogo di Blade, Handle e Metals è dietro al modello. Ogni miniatura mostra la finitura del catalogo, con il colore selezionato sul bordo inferiore. Le scelte di configurazione sono salvate per modello anche dopo il ricaricamento. I prezzi sono dimostrativi, in euro interi. Il prezzo base per modello è in `app/lib/catalogue.ts` e ogni alternativa ha un supplemento `surcharge` in `app/lib/catalogue-data.json`.

## Camera e lighting

Trascina per ruotare il modello. La rotella o il pinch regolano lo zoom ottico fra 0,8× e 2,8×. Aprire un’altra sezione, selezionare un altro modello o scegliere una vista ripristina l’inquadratura di riferimento.

In Inspect, Camera offre sei inquadrature. Le sei miniature di Lighting selezionano Studio, Softbox, Radente, Controluce, Ambra e Bicolore. Ogni setup ha posizioni, temperature e intensità delle sorgenti proprie e pannelli di studio che si riflettono sulle superfici. La luce scelta segue la sessione e si applica ai cinque modelli. I parametri sono in `app/lib/light-presets.ts`.

Le frecce orizzontali cambiano modello e le verticali cambiano sezione. Con il focus sul canvas le frecce ruotano il modello. I preset si selezionano anche con Tab e Invio.
