# Debugging e Test

Dopo aver scritto un workflow personalizzato, puoi utilizzare i seguenti metodi per convalidarlo e debuggarne il funzionamento.

## Attivare la Modalità Debug

Attiva la modalità debug nelle preferenze per sbloccare strumenti di debugging aggiuntivi e visualizzazioni informative:

Zotero → Impostazioni → Zotero Agents → Attiva Modalità Debug

Quando la modalità debug è attivata:

- I workflow relativi al debug vengono visualizzati nella Dashboard
- I log di runtime diventano più dettagliati
- Alcuni strumenti diagnostici diventano disponibili

## Utilizzo del Toolkit Debug Probe

Il plugin include un toolkit di debugging integrato `workflow-debug-probe`, contenente diversi workflow diagnostici:

| Workflow | Scopo |
|----------|-------|
| **Workflow Debug Probe** | Ispeziona lo stato di pre-esecuzione del workflow, apre il pannello diagnostico |
| **Debug Sequence Linear Probe** | Convalida l'esecuzione sequenziale e il passaggio di handoff predefinito |
| **Debug Sequence Workspace Reuse Probe** | Convalida il riutilizzo del workspace tra i passaggi |
| **Debug Sequence Context Isolation Probe** | Convalida il filtraggio esplicito di handoff e i workspace isolati |

Questi workflow sono visibili nell'elenco dei workflow della Dashboard (in modalità debug) e possono essere eseguiti direttamente per convalidare i meccanismi di esecuzione delle sequenze.

## Visualizzazione dei Log

### Log di Runtime

I workflow generano log di runtime durante l'esecuzione, visualizzabili nella Dashboard:

1. Apri la Dashboard
2. Trova un'attività in esecuzione o completata
3. Clicca su "View Logs" per espandere il pannello dei log

### Scrivere Log negli Hook

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // Scrivi nel log di runtime
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Elaborazione parent: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // Per informazioni di debug complesse, puoi usare console
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## Risoluzione dei Problemi Comuni

### Il Workflow Non Appare nella Dashboard

1. Verifica che `workflow.json` sia posizionato nella directory corretta
2. Conferma che `workflow.json` sia formattato correttamente (sintassi JSON)
3. Verifica che `id` sia univoco e non entri in conflitto con i workflow ufficiali
4. Conferma che il percorso dello script `applyResult` sia corretto
5. Controlla il log degli errori del plugin (Zotero → Aiuto → Risoluzione dei problemi → Visualizza file di log)

### La Validazione della Selezione Salta Ogni Unità

Se la `validateSelection` dichiarativa o `preflight` salta ogni unità di input, il workflow non invierà alcuna richiesta al provider. Controlla la politica di selezione, le regole di esclusione e qualsiasi risultato di `preflight` che restituisca `kind: "skip"`.

### Conflitto Tra buildRequest e Richiesta Dichiarativa

L'hook `buildRequest` e il campo `request` in `workflow.json` sono **mutualmente esclusivi**. Se entrambi esistono, `buildRequest` ha la priorità. Se il comportamento della richiesta non è come previsto, verifica se entrambi sono stati definiti inavvertitamente contemporaneamente.

### Errore nell'Esecuzione dello Script Hook

- Conferma che lo script Hook sia in formato `.mjs` (ES Module)
- Conferma che i nomi delle funzioni esportate siano corretti: `preflight`, `buildRequest`, `normalizeSettings` o `applyResult`
- Conferma che la firma della funzione riceva correttamente parametri come `{ parent, bundleReader, runtime }`
- Verifica che i percorsi di importazione relativi siano corretti

### Il Risultato Non Viene Scritto in Zotero

Se `applyResult` utilizza `hostApi.mutations.execute()` ma non ha effetto, possibili cause:

- Le operazioni di scrittura richiedono l'approvazione dell'utente, ma il popup di approvazione è stato ignorato o è scaduto
- È stata tentata un'operazione di scrittura quando `execution.zoteroHostAccess.required` non era impostato su `true`
- `allowWriteApprovalBypass` deve essere utilizzato insieme alla configurazione dei permessi del plugin

## Suggerimenti per lo Sviluppo

### Inizia in Modo Semplice

1. Per prima cosa utilizza il provider `pass-through` con un `applyResult` minimo per verificare che il workflow venga caricato correttamente
2. Aggiungi prima `validateSelection`, poi aggiungi `preflight` o `buildRequest` solo quando necessario
3. Infine connettiti al backend effettivo

### Usa notifications.toast per un Feedback Rapido

```js
hostApi.notifications.toast({
  text: `buildRequest ha ricevuto ${selectionContext.items.filter((item) => item.kind === "parent").length} elementi principali`,
  type: "default",
});
```

Questa è una tecnica di debugging rapida che ti consente di vedere i risultati dell'esecuzione senza controllare i log.

### Fai Riferimento ai Workflow Ufficiali

I workflow ufficiali sono il miglior riferimento per l'apprendimento. Dopo aver installato il pacchetto ufficiale, puoi visualizzare il codice sorgente nella directory `<Zotero Data>/zotero-agents/content/official/workflows/`:

- `literature-workbench-package/literature-analysis/` — Esempio completo di skillrunner.job.v1
- `content/official/workflows/literature-workbench-package/export-notes/` — Semplice esempio pass-through
- `content/official/workflows/mineru/` — Esempio con buildRequest + gestione file
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — Esempio di modalità interattiva

## Passaggi Successivi

- [Riferimento Completo del Manifesto del Workflow](manifest) — Tutti i campi in workflow.json
- [Riferimento API Host](host-api) — Tutte le API disponibili negli hook
