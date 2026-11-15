# MEMENTO · Knives Continuum — V49

Revisione della coreografia e delle inquadrature del 15 novembre 2026.

## Hero

- Trascinamento orizzontale con mouse o touch: la collezione segue il gesto e si assesta sul coltello scelto. Funzionano anche tastiera e trackpad orizzontale.
- La punta reale della lama animata segue esattamente l'ellisse del LED. L'aggancio tiene conto dell'esploso, della fluttuazione dei componenti e della rotazione del modello.
- I coltelli in secondo piano rimangono esplosi e i componenti oscillano con fasi coordinate. L'assemblaggio termina prima del focus, con lo stesso inviluppo sul percorso di uscita.
- Sosta di 7,4 secondi: avvio morbido, giro completo intorno all'asse longitudinale con lieve movimento sugli altri assi, assestamento e ripartenza. Il giro porta in vista anche la faccia posteriore, senza deformare le geometrie.
- Rimosse le frecce laterali duplicate. Restano chevron e cinque punti della sequenza in basso.

## Sezioni e UI

- **Blade:** tutto il coltello entra nella composizione diagonale; lama nitida a sinistra e manico visibile nella zona sfocata a destra. Il gradiente ottico attraversa la composizione intera e raggiunge 14 px sul lato della UI; non aggiunge oscuramento al prodotto.
- **Handle:** avvicinamento in tre quarti, con ingombro calcolato in prospettiva reale.
- **Metals:** cambio di posa e dettaglio sul pivot, distinto dalla vista del manico.
- **Explore:** conservati vista orizzontale iniziale, apertura, esploso, viste, orbita, tagli, zoom e reset.
- Scroll e swipe verticale si assestano sulle sezioni. Un gesto di rotella genera una sola destinazione; l'inerzia non accoda sezioni durante la formazione della UI.
- Reveal di testo e controlli da 1,85 secondi, titolo ambientale da 2,15 secondi. Include wordmark e navigazione a ogni cambio di sezione. Le particelle del titolo restano dietro al modello.
- Nomi ambientali più grandi su un piano dietro il canvas 3D; sfumatura verticale bianco/grigio con bloom, font Michroma conservato. Rimossi entrambi i contatori numerici.
- Su mobile il titolo ambientale mantiene margine anche con il nome più lungo, VERTEX, e con il movimento del puntatore.
- La preferenza di movimento ridotto disattiva danza, parallax, movimento scenografico e particelle.

## Avvio e distribuzione

Node 22.18+ o 24. Eseguire `npm ci`, poi `npm run dev`. Verifica completa: `npm run check`, `npm test`, `npm run build`. Il sito statico viene generato in `out/`. La configurazione Vercel è inclusa nella radice.

Gli asset restano quelli approvati: Hyper ottimizzato V48 e gli altri quattro modelli V46. Lama, manici e clip incisa di Hyper non vengono modificati da questa revisione. La verifica meccanica delle sorgenti e le limitazioni note sono documentate in `tools/assets/RIEPILOGO_CONSEGNA_ORIGINALE.md`.

## Verifiche riproducibili

- `scripts/check-v49.mjs`: trascinamento, rientro continuo, giro completo, scroll a sezioni e aggancio delle vere mesh al LED in 600 pose.
- `scripts/check-cinematic.mjs`: composizione di tutti i modelli su desktop, ultrawide e mobile; continuità geometrica della lama/manico in Blade, prospettiva Handle e posa distinta Metals.
- `scripts/check-presentation.mjs`: 6.480 pose Explore con animazioni, esploso e viste nei tre formati.
- `tools/assets/check-runtime-sampling.mjs`: tutti i 166 componenti mantengono esploso sincronizzato e reset esatto.
- `tools/assets/v48/verify.mjs`: integrità degli asset protetti e confronto Hyper prima/dopo.

I controlli numerici misurano geometrie e funzioni runtime. Le verifiche in un viewport mobile del browser non equivalgono a un benchmark su telefono fisico.
