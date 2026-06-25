# Debug e test

Dopo aver scritto un Workflow personalizzato, puoi utilizzare i seguenti metodi per validarlo e fare il debug.

## Abilitare la modalità debug

Abilita la modalità debug nelle preferenze per sbloccare strumenti di debug aggiuntivi e visualizzazioni di informazioni:

Zotero → Impostazioni → Zotero Agents → Abilita modalità debug

Quando la modalità debug è abilitata:

- I Workflow relativi al debug vengono visualizzati nella Dashboard
- I log di runtime diventano più dettagliati
- Alcuni strumenti diagnostici diventano disponibili

## Utilizzo del toolkit Debug Probe

Il plugin include un toolkit di debug integrato `workflow-debug-probe`, contenente diversi Workflow diagnostici:

| Workflow | Scopo |
|----------|-------|
| **Workflow Debug Probe** | Esamina lo stato pre-esecuzione del Workflow, apri il pannello diagnostico |
| **Debug Sequence Linear Probe** | Valida l'esecuzione sequenziale e il passaggio predefinito dell'handoff |
| **Debug Sequence Workspace Reuse Probe** | Valida il riutilizzo dello spazio di lavoro tra i passaggi |
| **Debug Sequence Context Isolation Probe** | Valida il filtraggio esplicito dell'handoff e gli spazi di lavoro isolati |

Questi Workflow sono visibili nell'elenco dei Workflow della Dashboard (in modalità debug) e possono essere eseguiti direttamente per validare i meccanismi di esecuzione delle sequenze.

## Visualizzazione dei log

### Log di runtime

I Workflow generano log di runtime durante l'esecuzione, visualizzabili nella Dashboard:

1. Apri la Dashboard
2. Trova un'attività in esecuzione o completata
3. Fai clic su "Visualizza log" per espandere il pannello dei log

### Scrittura dei log negli Hook

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // Scrivi nel log di runtime
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Processing parent: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // Per informazioni di debug complesse, puoi usare console
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## Risoluzione dei problemi comuni

### Il Workflow non appare nella Dashboard

1. Verifica che `workflow.json` sia posizionato nella directory corretta
2. Conferma che `workflow.json` sia formattato correttamente (sintassi JSON)
3. Controlla che `id` sia univoco e non entri in conflitto con i Workflow ufficiali
4. Conferma che il percorso dello script `applyResult` sia corretto
5. Controlla il log degli errori del plugin (Zotero → Aiuto → Risoluzione problemi → Visualizza file di log)

### filterInputs restituisce null

Se `filterInputs` restituisce `null`, significa che non è stata trovata alcuna selezione idonea e il Workflow non verrà eseguito. Controlla che la logica di filtraggio sia corretta.

### Conflitto tra buildRequest e richiesta dichiarativa

L'hook `buildRequest` e il campo `request` in `workflow.json` sono **mutuamente esclusivi**. Se entrambi esistono, `buildRequest` ha la priorità. Se il comportamento della richiesta non è quello previsto, verifica se entrambi sono stati definiti inavvertitamente contemporaneamente.

### Esecuzione dello script Hook fallita

- Conferma che lo script Hook sia in formato `.mjs` (ES Module)
- Conferma che vengano esportati i nomi delle funzioni corretti: `filterInputs`, `buildRequest`, `applyResult`
- Conferma che la firma della funzione riceva correttamente parametri come `{ parent, bundleReader, runtime }`
- Controlla che i percorsi di importazione relativi siano corretti

### Il risultato non viene scritto in Zotero

Se `applyResult` usa `hostApi.mutations.execute()` ma non ha effetto, le possibili cause sono:

- Le operazioni di scrittura richiedono l'approvazione dell'utente, ma il popup di approvazione è stato ignorato o è scaduto
- È stata tentata un'operazione di scrittura quando `execution.zoteroHostAccess.required` non era impostato a `true`
- `allowWriteApprovalBypass` deve essere utilizzato insieme alla configurazione dei permessi del plugin

## Suggerimenti per lo sviluppo

### Inizia in modo semplice

1. Usa prima il provider `pass-through` con un `applyResult` minimo per verificare che il Workflow venga caricato con successo
2. Aggiungi gradualmente `filterInputs` e `buildRequest`
3. Infine connettiti al backend effettivo

### Usa notifications.toast per un feedback rapido

```js
hostApi.notifications.toast({
  text: `filterInputs received ${selectionContext.items.parents.length} parent items`,
  type: "default",
});
```

Questa è una tecnica di debug rapida che ti permette di vedere i risultati dell'esecuzione senza controllare i log.

### Fai riferimento ai Workflow ufficiali

I Workflow ufficiali sono il miglior riferimento di apprendimento. Dopo aver installato il pacchetto ufficiale, puoi visualizzare il codice sorgente nella directory `<Zotero Data>/zotero-agents/content/official/workflows/`:

- `literature-workbench-package/literature-analysis/` — Esempio completo di skillrunner.job.v1
- `content/official/workflows/literature-workbench-package/export-notes/` — Semplice esempio pass-through
- `content/official/workflows/mineru/` — Esempio con buildRequest + gestione dei file
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — Esempio di modalità interattiva

## Passi successivi

- [Riferimento completo del manifesto del Workflow](manifest) — Tutti i campi in workflow.json
- [Riferimento dell'API host](host-api) — Tutte le API disponibili negli Hook
