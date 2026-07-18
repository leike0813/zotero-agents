# Export/Import Literature Bundle

## Scopo

Esportare e importare bundle ZIP portabili di elementi padre Zotero con i loro metadati, tag, note secondarie, allegati, immagini incorporate e relazioni tra elementi, facilitando la migrazione tra istanze Zotero o la collaborazione con altri ricercatori.

## Export Literature Bundle

### Casi d'uso

- Eseguire il backup degli elementi Zotero selezionati come ZIP autonomo
- Condividere letteratura con collaboratori che utilizzano una libreria Zotero diversa
- Trasferire elementi a un'altra istanza Zotero per l'importazione successiva

### Vincoli di input

| Tipo di vincolo | Descrizione |
|---------|------|
| Unità di input | Elemento padre |
| Selezione | Uno o più elementi padre; allegati, note ed elementi figli non possono essere mescolati |
| Output | L'utente seleziona la posizione di salvataggio ZIP; l'estensione `.zip` viene aggiunta automaticamente se mancante |

### Comportamento

1. Validare che tutti gli elementi selezionati siano elementi padre (nessun allegato, nota o elemento figlio consentito).
2. Raccogliere metadati bibliografici, tag, note secondarie con immagini incorporate, allegati locali leggibili e allegati URL di collegamento per ogni elemento padre.
3. Per gli allegati Markdown, riscrivere i riferimenti alle immagini locali in percorsi relativi al bundle e includere le immagini referenziate.
4. Registrare le relazioni tra elementi solo tra elementi padre esportati nello stesso batch.
5. Scrivere `manifest.json` con versione del formato, inventario dei file, dati di integrità e eventuali avvisi di esportazione.
6. Impacchettare tutto in un file ZIP nella posizione scelta dall'utente.

I file locali mancanti vengono saltati con un avviso; le immagini remote in Markdown vengono mantenute così come sono (non scaricate). L'annullamento della finestra di dialogo di salvataggio annulla l'esportazione.

### Output

| Artefatto | Descrizione |
|----------|-------------|
| `manifest.json` | Versione del formato, inventario dei file, informazioni di integrità, avvisi di esportazione, relazioni tra elementi |
| Metadati dell'elemento padre | Informazioni bibliografiche portabili e tag per elemento padre |
| Note secondarie | Note con immagini incorporate |
| Allegati | Allegati locali leggibili; allegati Markdown con immagini locali accompagnatrici |
| Allegati URL di collegamento | Informazioni di collegamento |

## Import Literature Bundle

### Casi d'uso

- Ripristinare un bundle di letteratura precedentemente esportato nella libreria Zotero corrente
- Importare letteratura condivisa da un collaboratore

### Vincoli di input

| Tipo di vincolo | Descrizione |
|---------|------|
| Unità di input | Workflow (nessuna selezione di elementi Zotero richiesta) |
| Metodo di importazione | Selezionare un file ZIP prodotto da Export Literature Bundle |
| Contesto della raccolta | Se viene selezionata una raccolta reale nella vista corrente, i nuovi elementi vengono aggiunti ad essa; altrimenti gli elementi vengono importati nella radice della libreria |

### Comportamento

1. Validare il bundle: tipo, versione, percorsi dell'archivio, inventario dei file, dimensione e integrità. Il fallimento della validazione interrompe senza modificare la libreria.
2. Per ogni elemento padre nel bundle, creare un nuovo grafo di elementi Zotero: metadati bibliografici, tag, allegati, note, immagini incorporate e allegati URL di collegamento.
3. Ripristinare le relazioni tra elementi tra gli elementi padre importati con successo dallo stesso bundle.
4. Se un singolo elemento padre fallisce l'importazione, pulire quell'elemento e i suoi figli appena creati, quindi continuare con gli elementi rimanenti.

L'importazione non riutilizza mai ID o chiavi di elementi Zotero originali, non deduplica mai, non unisce né sovrascrive elementi esistenti. Reimportare lo stesso bundle produce copie indipendenti.

### Output

Nuovi elementi padre Zotero con i loro grafi di elementi completi. File mancanti, fallimenti di pulizia o fallimenti di ripristino delle relazioni vengono segnalati come avvisi; il risultato potrebbe essere parzialmente completato.

## Durata stimata

Dipende dal numero di elementi, dalle dimensioni degli allegati e dalla velocità del disco locale. Metadati puri o piccole note si completano rapidamente; PDF grandi o molte immagini aumentano proporzionalmente la durata.

## Dipendenze

- Non è richiesta connessione al backend
- Si basa solo sull'archiviazione locale Zotero e sui permessi di accesso ai file

## Workflow correlati

- [Export/Import Notes](#doc/workflows%2Fexport-import-notes) — Esportare o importare solo note di analisi
- [Export Research Bundle](#doc/workflows%2Fexport-research-bundle) — Assemblare un bundle di ricerca di sola lettura per un progetto di articolo (scopo diverso)
