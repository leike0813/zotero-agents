# Panoramica dell'architettura dei Workflow personalizzati

Il sistema di Workflow di Zotero Agents utilizza un'**architettura plug-in** — ogni Workflow è una directory indipendente e autonoma che richiede solo un file manifesto `workflow.json` e i corrispondenti script Hook. Il Workflow Manager del plugin lo scopre e lo carica automaticamente.

## Struttura delle directory

I Workflow possono essere memorizzati in due posizioni:

| Posizione | Tipo | Descrizione |
|-----------|------|-------------|
| Pacchetto ufficiale dei Workflow | Ufficiale | Installato indipendentemente tramite il Feed dei contenuti. Si trova in `<Zotero Data>/zotero-agents/content/official/workflows/` |
| Directory dei Workflow dell'utente | Personalizzato | Configurata nelle preferenze; il Workflow Manager la scansiona automaticamente |

Il **Workflow Manager** del plugin scansiona ricorsivamente la directory del pacchetto ufficiale e la directory dei Workflow dell'utente, scopre i file `workflow.json` e li registra come Workflow disponibili.

## Un esempio minimo di Workflow

Creare un Workflow personalizzato richiede solo **2 file**:

```
my-workflow/
├── workflow.json
└── hooks/
    └── applyResult.mjs
```

### workflow.json

```json
{
  "id": "hello-world",
  "label": "Hello World",
  "provider": "pass-through",
  "inputs": {
    "unit": "parent"
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

### hooks/applyResult.mjs

```js
export function applyResult({ parent, runtime }) {
  const title = runtime.helpers.resolveItemRef(parent).getField("title");
  runtime.hostApi.notifications.toast({
    text: `Hello, ${title}!`,
    type: "success",
  });
  return { greeted: true };
}
```

Dopo aver posizionato `my-workflow/` nella directory dei Workflow dell'utente, riapri la Dashboard per vedere il Workflow.

## Livelli dell'architettura dei Workflow

Il ciclo di vita di un Workflow coinvolge i seguenti livelli:

```
Azione dell'utente (Menu contestuale / Dashboard)
    │
    ▼
Workflow Manager — Scopri, carica, valida
    │
    ├── Input — Quali elementi ha selezionato l'utente?
    ├── Parametri — Quali parametri ha impostato l'utente?
    ├── Hook — Preelaborazione, costruzione delle richieste, gestione dei risultati
    └── Esecuzione — Dispatchato a un backend dal Provider
         │
         ▼
      Provider (SkillRunner / ACP / Generic HTTP / Pass-through)
         │
         ▼
      Backend — Motore di esecuzione remoto o locale
```

## Classificazione dei pattern dei Workflow

In base al metodo di esecuzione e al tipo di backend, i Workflow possono essere classificati come segue:

| Pattern | Caso d'uso tipico | Tipo di backend |
|---------|-------------------|-----------------|
| **pass-through** | Operazioni puramente locali (esportazione, elaborazione file), nessun backend remoto necessario | Nessuno |
| **skillrunner.job.v1** | Esecuzione di una singola skill inviata a SkillRunner | skillrunner / acp |
| **skillrunner.sequence.v1** | Esecuzione di skill concatenate a più passaggi, con passaggio del testimone tra i passaggi | acp |
| **generic-http.request.v1** | Singola chiamata API HTTP | generic-http |
| **generic-http.steps.v1** | Chiamate API HTTP a più passaggi | generic-http |

## Concetti chiave di workflow.json

```json
{
  "id": "identificatore univoco",
  "label": "nome visualizzato",
  "provider": "tipo di backend",
  "inputs": { "unit": "tipo di unità di input" },
  "parameters": { /* parametri configurabili */ },
  "execution": { /* controllo dell'esecuzione */ },
  "request": { "kind": "tipo di richiesta" },
  "hooks": { "applyResult": "percorso dello script per la gestione dei risultati" }
}
```

La pagina successiva spiega il significato e l'utilizzo di ogni campo in dettaglio.

## Passi successivi

- [Scrittura del manifesto del Workflow](manifest) — Spiegazione dettagliata di ogni campo in workflow.json
- [Sistema di Hook](hooks) — Come scrivere gli Hook per ogni fase
- [Sistema dei parametri](parameters) — Definire parametri configurabili
