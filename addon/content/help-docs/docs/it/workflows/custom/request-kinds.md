# Tipi di richiesta

I Workflow determinano quale Provider (esecutore) gestisce la richiesta dichiarando `request.kind`. Il sistema dispone di diversi tipi di richiesta integrati, corrispondenti a diversi backend e modalità di esecuzione.

## Panoramica dei tipi di richiesta

| `kind` | Provider applicabile | Descrizione |
|--------|---------------------|-------------|
| `pass-through.run.v1` | pass-through | Esecuzione puramente locale, nessun backend remoto coinvolto |
| `skillrunner.job.v1` | skillrunner / acp | Esecuzione di una Skill SkillRunner in un singolo passo |
| `skillrunner.sequence.v1` | acp | Esecuzione di Skill concatenate in più passi |
| `acp.prompt.v1` | acp | Invia direttamente un prompt al backend ACP |
| `acp.skill.run.v1` | acp | Invia direttamente un'esecuzione di Skill al backend ACP |
| `generic-http.request.v1` | generic-http | Chiamata API HTTP in un singolo passo |
| `generic-http.steps.v1` | generic-http | Chiamate API HTTP in più passi |

## pass-through.run.v1 — Esecuzione puramente locale

Nessun backend remoto richiesto; viene eseguito direttamente all'interno del plugin. Adatto per scenari puramente locali come operazioni su file ed esportazione di dati.

```json
{
  "provider": "pass-through",
  "request": {
    "kind": "pass-through.run.v1"
  }
}
```

Quando si costruisce la richiesta nell'hook `buildRequest`, tipicamente si passano `selectionContext` e `parameter`:

```js
export function buildRequest({ selectionContext, executionOptions }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

## skillrunner.job.v1 — Esecuzione di Skill in un singolo passo

Invia una richiesta di esecuzione di una singola Skill al backend Skill-Runner. Effettua il polling dei risultati dopo l'invio.

```json
{
  "provider": "skillrunner",
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "literature-analysis",
      "skill_source": "local-package"
    },
    "input": {
      "upload": {
        "files": [
          { "key": "source", "from": "selected.markdown" }
        ]
      }
    },
    "poll": {
      "interval_ms": 2000,
      "timeout_ms": 600000
    }
  }
}
```

| Campo | Descrizione |
|-------|-------------|
| `create.skill_id` | Identificatore della Skill da eseguire |
| `create.skill_source` | Origine della Skill. `"local-package"` (inclusa nel pacchetto), `"installed"` (già installata) |
| `input.upload.files` | Elenco di file da caricare. `from` può essere `"selected.markdown"`, `"selected.pdf"`, `"selected.source"` |
| `poll.interval_ms` | Intervallo di polling (millisecondi) |
| `poll.timeout_ms` | Timeout totale (millisecondi) |

Quando il Workflow seleziona il backend ACP, `skillrunner.job.v1` si adatta automaticamente a `acp.skill.run.v1`, quindi i Workflow dichiarati come `skillrunner.job.v1` sono compatibili anche con il backend ACP.

## skillrunner.sequence.v1 — Concatenamento di Skill in più passi

Quando è necessario concatenare più Skill in sequenza (dove l'output di un passo diventa l'input del successivo), utilizzare l'esecuzione di sequenza. Gli scenari tipici includono pipeline multi-stadio (ad es., il flusso in tre passi della Sintesi dell'argomento: prepare → core enrichment → finalize), dove ogni passo è gestito da una Skill diversa, passando i risultati intermedi tramite il meccanismo di handoff.

Concatena più Skill in sequenza, dove l'output di un passo può servire come input del successivo (handoff).

```json
{
  "provider": "acp",
  "request": {
    "kind": "skillrunner.sequence.v1",
    "sequence": {
      "steps": [
        {
          "id": "prepare",
          "skill_id": "create-topic-synthesis-prepare",
          "workspace": "new",
          "parameter": { "language": "en-US" }
        },
        {
          "id": "core",
          "skill_id": "topic-synthesis-core-enrichment",
          "workspace": "reuse-workflow",
          "handoff": {
            "from_step": "prepare",
            "pass_through": true
          }
        },
        {
          "id": "finalize",
          "skill_id": "topic-synthesis-finalize",
          "workspace": "reuse-workflow"
        }
      ]
    }
  }
}
```

### Configurazione dei passi

| Campo | Descrizione |
|-------|-------------|
| `id` | Identificatore univoco per il passo, referenziato dall'handoff |
| `skill_id` | Identificatore della Skill da eseguire |
| `mode` | **Obbligatorio.** Modalità di esecuzione: `"auto"` (non interattiva) o `"interactive"` (richiede input dell'utente) |
| `workspace` | Politica dello spazio di lavoro. `"new"` (crea un nuovo spazio di lavoro), `"reuse-workflow"` (riutilizza lo spazio di lavoro padre) |
| `parameter` | Parametri passati alla Skill |
| `input` | Dati di input passati alla Skill |
| `short_circuit` | Regole di terminazione anticipata. Vedere sotto |
| `fetch_type` | Specifica il tipo di fetch per passo. `"bundle"` (scarica il bundle zip degli artifact); se non specificato, utilizza il `result.fetch.type` a livello di Workflow |
| `apply_result` | Applicazione del risultato a livello di passo: `workflow_id` specifica quale `applyResult` del sotto-Workflow invocare; `on_failure` controlla il comportamento in caso di errore (`"continue"` o `"fail_sequence"`) |
| `include_if` | Esecuzione condizionale del passo. O `{ kind: "parameter", parameter: "...", equals: ... }` per controllare un parametro del Workflow, o `{ kind: "runtime", condition: "..." }` per condizioni di runtime |

### Terminazione anticipata (short_circuit)

Quando il valore di ritorno di un passo soddisfa le condizioni, salta i passi successivi e utilizza l'output del passo corrente come risultato finale.

```json
{
  "id": "prepare",
  "skill_id": "create-topic-synthesis-prepare",
  "workspace": "new",
  "short_circuit": {
    "when": {
      "path": "status",
      "equals": "canceled"
    },
    "result": "step_output"
  }
}
```

| Campo | Descrizione |
|-------|-------------|
| `when.path` | Quale campo nel JSON di output del passo controllare |
| `when.equals` | Attiva la terminazione quando il valore del campo è uguale a questo valore |
| `result` | Risultato dopo la terminazione: `"step_output"` (output completo del passo corrente) |

### Configurazione dell'handoff

L'handoff passa i dati da un passo ai passi successivi tramite un array `bindings`. Ogni binding descrive un singolo trasferimento di valore o file.

**Pass-through completo (tutti i campi di output da un passo precedente):**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "target": "/input/handoff"
      }
    ]
  }
}
```

**Mappatura selettiva dei campi:**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "step": "step1",
        "source": "output_field_name",
        "target": "/input/field_name",
        "required": false
      },
      {
        "kind": "value",
        "step": "step1",
        "source": "status",
        "target": "/input/step1_status",
        "required": false
      }
    ]
  }
}
```

| Campo del binding | Descrizione |
|-------------------|-------------|
| `kind` | `"value"` per valori di dati, `"file"` per riferimenti a file |
| `step` | ID del passo di origine (da quale passo leggere l'output). Se omesso, legge dal passo immediatamente precedente |
| `source` | Nome del campo nel JSON di output del passo di origine |
| `target` | Percorso JSON dove il valore deve essere scritto nell'input del passo corrente (ad es., `"/input/field_name"`) |
| `required` | Se `true`, il passo fallirà quando il valore di origine è mancante. Il valore predefinito è `false` |
| `value` | Per `kind: "value"`, un valore letterale da passare (utilizzato quando `step`/`source` sono omessi) |

## generic-http.request.v1 — Chiamata API HTTP

Invia una singola richiesta HTTP al backend Generic HTTP.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.request.v1"
  }
}
```

Comunemente utilizzato per chiamare API REST esterne (ad es., servizio di analisi PDF MinerU).

## generic-http.steps.v1 — Chiamate HTTP in più passi

Esegue più passi di richiesta HTTP in sequenza.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.steps.v1"
  }
}
```

## Come scegliere il Provider giusto

| Il tuo Workflow deve... | Scegli il provider | Tipo di richiesta |
|-------------------------|-------------------|-------------------|
| Eseguire operazioni puramente locali, nessuna chiamata remota | `pass-through` | `pass-through.run.v1` |
| Inviare una singola Skill al Skill-Runner | `skillrunner` | `skillrunner.job.v1` |
| Concatenare più Skill in sequenza | `acp` | `skillrunner.sequence.v1` |
| Chiamare un'API HTTP | `generic-http` | `generic-http.request.v1` |

Nota: `provider` è l'unico campo che determina con quali backend un Workflow è compatibile. `request.kind` viene utilizzato solo per il routing all'esecutore corretto e non partecipa all'inferenza della compatibilità del backend.

## Prossimi passi

- [Debug e testing](#doc/workflows%2Fcustom%2Fdebugging) — Verificare le richieste e le risposte dei Workflow
- [Pacchettizzazione e distribuzione](#doc/workflows%2Fcustom%2Fpackaging) — Pubblicare i Workflow per gli utenti
