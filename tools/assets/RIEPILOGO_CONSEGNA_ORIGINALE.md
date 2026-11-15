# KNIVES - verifica movimenti e cinque FBX

Consegna del 2026-11-08T14:30:47.886809+01:00.

ZIP aggiornato: [KNIVES_5_FBX_MOVIMENTO_CHECKPOINT_v003.zip](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/KNIVES_5_FBX_MOVIMENTO_CHECKPOINT_v003.zip>). Contiene esattamente HYPER.fbx, VERTEX.fbx, QUAD.fbx, EDGE.fbx e TRIS.fbx.

**Stato: checkpoint. HYPER supera le verifiche campionate di apertura, chiusura ed esploso; VERTEX, QUAD, EDGE e TRIS conservano le forme originali ma non superano il controllo delle interferenze.** I cinque file superano invece la verifica di esportazione e reimportazione.

## Risultati per coltello

| Coltello | Parti mesh | Triangoli invariati | Angolo chiusura | Movimento | Pose esploso verificate |
|---|---:|---:|---:|---|---:|
| HYPER | 52 | 1.124.760 | 180.025 gradi | PASS | 5.590 |
| VERTEX | 13 | 16.561 | 172.250 gradi | FAIL | 2.795 |
| QUAD | 21 | 20.794 | 172.750 gradi | FAIL | 4.485 |
| EDGE | 15 | 55.424 | 176.500 gradi | FAIL | 3.225 |
| TRIS | 65 | 59.186 | 170.250 gradi | FAIL | 4.515 |

HYPER: corretta la sola battuta angolare da 179,950 a 180,025 gradi. La parte anteriore della lama ora rientra nell’inviluppo convesso delle guancette nella vista laterale. Cuscinetto, rasamento e 12 sfere di sinistra escono insieme alla guancetta sinistra: sono ancora 15 mesh separate, senza fusioni. Questa sequenza mantiene l’incastro originale ed evita l’interferenza iniziale. Lama, manici, clip e tutte le altre mesh sono identici al master approvato; la posa aperta assemblata resta invariata.

VERTEX: la lama chiusa interseca guancette, perni del manico e stop pin. QUAD: interferenze con guancetta destra, supporti del pivot e distanziale. EDGE: interferenze con liner e componenti del blocco. TRIS: interferenze con asse del pivot e distanziali; una porzione della lama supera inoltre l’inviluppo convesso delle guancette di circa 1,745 mm alla scala della demo. Le coppie e le pose precise sono nei report per componente.

Per questi quattro modelli sono conservati anche gli incastri e i contatti già presenti nei sorgenti. La posa finale completamente esplosa è libera dalle interferenze rilevate, a tutte le cinque aperture provate. Il tragitto per raggiungerla e la chiusura non sono approvati: le tre clip portano il suffisso `QA_FAILED`. Le modifiche necessarie a eliminare tali problemi non sono state nascoste con deformazioni o soglie meno severe.

## Controlli eseguiti

- Hash esatti di geometria, UV e normali per ogni componente rispetto ai master di partenza; conteggi, nomi e materiali preservati. Nessuna nuova decimazione.
- Posa iniziale originale, asse della cerniera fermo, trasformazioni rigide, determinanti positivi e 20 cicli di reset: PASS per tutti. Errore misurato di reset e deriva del pivot: zero.
- 25 combinazioni apertura/esploso, 181 pose di apertura e controlli densi lungo ogni stadio di estrazione, inclusi i primi micrometri. Per HYPER: 5.590 pose di estrazione e tutti i 481 fotogrammi della clip combinata senza interferenze rilevate.
- Reimportati tutti i cinque FBX e verificati tutti i 6.519 fotogrammi delle 15 clip, confrontando ogni nodo. Limite superiore massimo dello scarto dei vertici animati: 0.143 micrometri, entro la soglia di 1 micrometro.
- Apertura ed esploso esportati su canali distinti e ricombinati in 25 stati dopo il reimport: PASS per tutti. Indici dei triangoli, winding, tutti i vertici, UV, normali, gerarchia e riapertura dei file .blend verificati. Normali e tangenti contenute nei file FBX finite, unitarie e ortogonali entro le soglie registrate.
- Esattamente tre materiali per coltello: `<NOME>__HARDWARE`, `<NOME>__BLADE`, `<NOME>__HANDLE`. Oggetti mobili indipendenti conservati.

La verifica delle collisioni usa una tolleranza geometrica invariata di 10 nm, attraversamenti delle superfici e contenimento per componenti chiusi. Le interfacce interne di uno stesso sottogruppo rigido sono inventariate separatamente e non sono trattate come collisioni di moto relativo. I contatti complanari non sono considerati attraversamenti volumetrici. Le patch aperte dei sorgenti non consentono una verifica di contenimento solido. I test sono campionati e non costituiscono una prova matematica di assenza di collisioni fra tutti gli istanti. Il controllo di inviluppo riguarda la parte anteriore della lama (oltre 15 mm dal pivot in posa aperta) e non certifica l’occultamento dell’intero filo.

## Orientamento e uso delle animazioni

Tutti i file usano la stessa convenzione destrorsa: punta aperta verso +X, alto/dorso verso +Y in FBX, spessore lungo Z. Nessuna scala negativa o riflessione. Unità coerenti: la lunghezza aperta di riferimento resta 0,25 m per la demo. Lasciare all’importatore FBX la conversione degli assi; non aggiungere rotazioni o specchiature diverse per coltello.

Ogni FBX contiene tre clip a 30 fps. `OPEN_CLOSE` parte aperto, raggiunge la posa chiusa a 6 secondi e torna aperto a 12 secondi. `EXPLODE` esegue esploso e ricomposizione. `COMBINED` combina i due controlli. Per i quattro checkpoint i nomi terminano in `_QA_FAILED`. `OPEN_CLOSE` ed `EXPLODE` possono agire insieme sui rispettivi canali; `COMBINED` è una clip alternativa che contiene entrambi.

Nei master Blender i controlli `openAmount` ed `explodeAmount` sono sul nodo `<NOME>__ROOT`: ripristino con `openAmount=1`, `explodeAmount=0`. Per riprodurre le tre anteprime sulla timeline, attivare la traccia NLA `<NOME>__MOTION_PREVIEWS`, disattivata inizialmente per lasciare liberi i controlli manuali. Il manifest registra rest pose, asse, angolo, part ID, nodi e vettori di esploso.

## File ed evidenze

| Coltello | Master riapribile | FBX reimportato | Report movimento / esportazione |
|---|---|---|---|
| HYPER | [Master](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/HYPER/blend/HYPER_MOTION_MASTER_v008.blend>) | [Reimport .blend](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/HYPER/blend/HYPER_ANIMATED_FBX_REIMPORTED_v008.blend>) | [Movimento](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/HYPER/qa/motion_qa_v007.json>) / [FBX](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/HYPER/qa/animated_fbx_verification_v008.json>) |
| VERTEX | [Master](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/VERTEX/blend/VERTEX_MOTION_MASTER_v006.blend>) | [Reimport .blend](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/VERTEX/blend/VERTEX_ANIMATED_FBX_REIMPORTED_v001.blend>) | [Movimento](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/VERTEX/qa/motion_qa_v005.json>) / [FBX](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/VERTEX/qa/animated_fbx_verification.json>) |
| QUAD | [Master](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/QUAD/blend/QUAD_MOTION_MASTER_v006.blend>) | [Reimport .blend](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/QUAD/blend/QUAD_ANIMATED_FBX_REIMPORTED_v001.blend>) | [Movimento](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/QUAD/qa/motion_qa_v005.json>) / [FBX](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/QUAD/qa/animated_fbx_verification.json>) |
| EDGE | [Master](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/EDGE/blend/EDGE_MOTION_MASTER_v006.blend>) | [Reimport .blend](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/EDGE/blend/EDGE_ANIMATED_FBX_REIMPORTED_v001.blend>) | [Movimento](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/EDGE/qa/motion_qa_v005.json>) / [FBX](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/EDGE/qa/animated_fbx_verification.json>) |
| TRIS | [Master](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/TRIS/blend/TRIS_MOTION_MASTER_v006.blend>) | [Reimport .blend](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/TRIS/blend/TRIS_ANIMATED_FBX_REIMPORTED_v001.blend>) | [Movimento](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/TRIS/qa/motion_qa_v005.json>) / [FBX](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/TRIS/qa/animated_fbx_verification.json>) |

[Tavola aperto / chiuso / esploso](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/proofs/MOVIMENTI_5_COLTELLI.png>) · [Interni in chiusura dei quattro checkpoint](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/proofs/CHIUSURA_INTERNI_QA_FAILED.png>) · [Indice delle 35 viste](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/PROOF_FRAMES_FINAL.json>)

[Registro numerico della consegna e hash](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/DELIVERY_VERIFICATION.json>) · [Riferimento per lo sviluppo](<C:/Users/Gianluigi/Documents/ChatGPT/_MCP___BLENDER/KNIVES_CODEX_BLENDER_HANDOFF_LIGHT_V1/output/MOTION_VERIFIED_v001/PER_LA_CHAT_DI_SVILUPPO.md>)

I registri `component_change_ledger_final.json` nelle cartelle QA documentano ogni componente. Sorgenti originali, master di partenza e ZIP precedente sono rimasti invariati, verificati tramite SHA-256. CRC dello ZIP e corrispondenza di ogni FBX con il file effettivamente reimportato: PASS.

Questa consegna aggiorna gli FBX e i master di animazione. Bake Painter, verifica nel runtime web e rigenerazione GLB non fanno parte di questa revisione; il pacchetto non è dichiarato “web ready”. Blender 5.2.2 LTS è stato eseguito in processi separati perché il ponte MCP aperto non rispondeva.
