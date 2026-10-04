# MEMENTO KnifeShowroom — v42 per Vercel

Export della versione 42 del 4 ottobre 2026.
Sorgente: `988ea8511b734d90d07adef8f9270bd833a80293`.

Sono inclusi tutti i sorgenti dell’esperienza, i quattro modelli 3D con texture, il background video, i font, le icone e le relative licenze presenti nel progetto. UI e comportamento sono quelli della v42 pubblicata. L’adattamento riguarda soltanto installazione e build per Next.js su Vercel.

## Requisiti

- Node.js 24.x e npm.
- Un account Vercel per pubblicare.
- Nessuna variabile d’ambiente, database o chiave API necessaria per lo showroom.

## Pubblicazione da cartella locale

1. Estrai lo ZIP.
2. Apri un terminale dentro `memento-showroom-v42`, dove si trova `package.json`.
3. Esegui:

```bash
npx vercel --prod
```

Accedi a Vercel quando richiesto e scegli il team e il progetto corretti. Per aggiornare un progetto esistente selezionalo durante il collegamento. Vercel installerà le dipendenze ed eseguirà la build.

## Pubblicazione tramite GitHub / GitLab / Bitbucket

1. Carica il contenuto della cartella estratta in un repository.
2. In Vercel importa il repository oppure aggiorna quello già collegato.
3. Seleziona la directory contenente `package.json` come Root Directory.
4. Controlla queste impostazioni:

| Impostazione | Valore |
| --- | --- |
| Framework Preset | Next.js |
| Node.js Version | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Predefinita di Next.js; nessun override |
| Environment Variables | Nessuna richiesta |

`vercel.json` contiene già il framework e i comandi. Non impostare `dist`, `public` o `out` come output. Se il progetto Vercel esistente ha override diversi, riallineali a questi valori.

## Sviluppo e verifica locale

```bash
npm ci
npm run dev
```

Apri http://localhost:3000.

Per eseguire le verifiche automatiche e la build di produzione:

```bash
npm test
npm run build
npm start
```

Il lockfile preserva le versioni delle dipendenze usate per questo export. `app/` e `public/` corrispondono ai file della versione 42. Gli asset locali sono inclusi: non dipendono dall’URL dello showroom precedente.

## Funzioni dimostrative

Il checkout rimane una simulazione: non elabora pagamenti o ordini reali. La richiesta scarica una bozza JSON con i dati inseriti e la configurazione; non invia automaticamente email o richieste. I prezzi sono indicativi. Le configurazioni salvate nel browser appartengono al dominio sul quale vengono create.

La resa 3D richiede WebGL e va controllata su un dispositivo che lo supporta. L’ambiente di esportazione non dispone di rendering GPU nel browser.

## Verifiche dell’export

Installazione pulita con `npm ci`, build Next.js di produzione e TypeScript riusciti. Passati i 21 test inclusi e la verifica dei quattro asset 3D (46.239 triangoli, orientamento, pivot, texture e otto dimensioni viewport). I file applicativi e gli asset sono stati confrontati byte per byte con la v42.

## Fonti per il deploy

- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/frameworks/full-stack/nextjs

- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
