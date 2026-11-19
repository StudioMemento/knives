# Memento Knives V51

Lo ZIP contiene lo showroom Next.js completo, i cinque modelli GLB, i font e i campioni dell’interfaccia. La base è la V50 di StudioMemento/knives, commit `ed993668ddeaa1b3301660931226aac5c640471f`.

## Aggiornare il progetto Vercel

Estrai lo ZIP nella radice della copia di lavoro della repo V50, consentendo la sovrascrittura dei file corrispondenti. Allo stesso livello devono comparire `package.json`, `vercel.json`, `app/` e `public/`. Puoi verificare le modifiche in un branch e usare l’anteprima Vercel prima di unirle a `main`.

Il progetto usa il preset Next.js. Il comando `npm run build` genera l’esportazione statica in `out/`. Le cartelle `public/models/v46` e `public/models/v48` contengono le revisioni dei modelli usati dalla V51.

## Avvio e verifica locale

Con Node.js 22.18 o successivo, esegui questi comandi dalla radice del progetto.

```sh
npm ci
npm run dev
```

Questi comandi verificano tipi, navigazione, pose e inquadrature e producono la build di produzione.

```sh
npm run check
npm test
npm run build
```

## Selettori

Le cinque icone aprono Stage, Blade, Handle, Details e Inspect. I chevron cambiano coltello nella sezione aperta. In Blade, Handle e Details, Color e Style memorizzano separatamente le scelte di ogni modello nel browser. I nomi, le palette e le descrizioni dei campioni sono in `app/lib/catalogue-data.json`. In questa revisione le selezioni aggiornano soltanto l’interfaccia.
