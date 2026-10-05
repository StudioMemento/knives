# Memento KnifeShowroom · V45.1 · Vercel

Export della versione 45 pubblicata, con le cinque sezioni e gli ultimi effetti cinematici.
Sorgente: edbe484020dc670ff3ae4b1ad5a25c1adad6be84.

Questa revisione corregge il pacchetto V45 incompleto: include tutti i file del Pocket Knife e le icone dell'interfaccia. Grafica, interazioni e modelli restano quelli di V45. Sono stati rimossi dall'export soltanto gli asset originali non utilizzati, mantenendo le copie ottimizzate realmente caricate dal sito.

## Contenuto

- Hero con cinque coltelli, speed ramp, spotlight e profondità di campo.
- Focus lama, focus manico, ispezione 3D e scheda prodotto.
- Particelle sul contorno, nome bianco con bloom, anello luminoso e riflesso sfocato.
- Modelli 3D, texture, font e contorni precalcolati inclusi in `public/`.
- Configurazione Next.js per Vercel e dipendenze bloccate in `package-lock.json`.

## Avvio locale

Richiede Node.js 22.13 o successivo e npm.

```sh
npm ci
npm run build
npm run start
```

Aprire http://localhost:3000. Per lo sviluppo usare `npm run dev`.

## Deploy su Vercel

Estrarre lo ZIP: la cartella che contiene `package.json` è la root del progetto.

**Da un repository Git:** caricare i file estratti nel repository e importarlo in Vercel.

Per aggiornare il progetto esistente, sostituire i file del repository con quelli di questa cartella, includendo l'intera cartella `public/`, `scripts/verify-assets.mjs`, `asset-manifest.json`, `package.json` e `package-lock.json`. Eseguire commit e push sul branch collegato a Vercel. Estrarre lo ZIP prima di caricarlo: il repository deve contenere i file, non l'archivio.

- Framework Preset: **Next.js**
- Root Directory: cartella contenente `package.json`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: impostazione predefinita del framework
- Variabili d'ambiente richieste: nessuna

**Da terminale:** entrare nella cartella estratta ed eseguire:

```sh
npx vercel login
npx vercel link
npx vercel --prod
```

Durante il collegamento selezionare il proprio team e il progetto desiderato.

## Verifica e note

L'export viene verificato con una build di produzione Next.js. Il pacchetto contiene il sorgente da compilare: `node_modules`, `.next` e credenziali di deploy non sono necessari nello ZIP.

`npm run build` verifica prima l'integrità di tutti i 154 asset necessari tramite `asset-manifest.json`. Se un modello, una texture, un font o un'icona manca o è stato troncato, la build si ferma indicando il percorso da ripristinare. Questo impedisce di pubblicare di nuovo una copia con asset incompleti. Il manifesto descrive questa specifica versione: quando si modificano intenzionalmente gli asset, occorre aggiornare anche il manifesto.

La configurazione dei coltelli resta nel browser tramite localStorage. Il checkout conservato nel progetto è una simulazione e non effettua pagamenti. Il prezzo di Hyper è ancora da definire.
