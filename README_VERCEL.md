# MEMENTO — Knives V49 · Vercel

Pacchetto completo dell’ultima V49 verificata: sorgenti React/Next.js,
modelli 3D, font, configurazione e controlli automatici.

## Utilizzo

1. Estrai lo ZIP.
2. Carica il contenuto nella radice del repository collegato a Vercel:
   `package.json`, `vercel.json`, `app/` e `public/` devono essere alla radice.
3. La configurazione inclusa usa Next.js e il comando `npm run build`.
   `next.config.ts` genera l’esportazione statica in `out/`.

Non servono variabili d’ambiente. Conserva `package-lock.json`.
Dipendenze e cartelle di build non sono incluse: vengono generate da npm.

## Avvio locale

Usa Node.js 22.18 o successivo.

```sh
npm ci
npm run dev
```

## Verifica

```sh
npm run check
npm test
npm run build
```

Le caratteristiche della revisione sono in `README_V49.md`.
I cinque modelli sono inclusi: Hyper ottimizzato V48 e Vertex, Quad,
Edge e Tris V46. Le cartelle degli asset mantengono i numeri della
loro revisione originale, anche se l’esperienza è V49.

Il pacchetto contiene il blur finale verso destra e il margine corretto
del titolo VERTEX su mobile. I controlli mobile sono stati eseguiti
nel browser; non costituiscono un benchmark su telefono fisico.

Sorgente verificata: `0009d815c019646874c417c3401a77003708112d`.
