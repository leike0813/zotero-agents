# Redigere il manifesto del Workflow

`workflow.json` è il file manifesto di un Workflow, che ne definisce tutti i metadati e comportamenti. Il Workflow Manager scopre e carica i Workflow attraverso questo file.

## Struttura di base

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "inputs": { "unit": "parent" },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Riferimento dei campi

### Identificazione di base

| Campo | Obbligatorio | Tipo | Descrizione |
|-------|-------------|------|-------------|
| `id` | ✅ | string | Identificatore univoco; non deve essere duplicato. Si consiglia il kebab-case |
| `label` | ✅ | string | Nome visualizzato visibile all'utente |
| `version` | | string | Numero di versione semantico, ad es., `"1.0.0"` |
| `provider` | ✅ | string | Tipo di backend. Vedere sotto per i valori disponibili |

### Valori del Provider

| Valore | Descrizione |
|--------|-------------|
| `"pass-through"` | Esecuzione puramente locale, nessun backend necessario. Adatto per operazioni su file, esportazioni, ecc. |
| `"skillrunner"` | Esegue Skill tramite il backend Skill-Runner |
| `"acp"` | Esegue Skill tramite il backend ACP |
| `"generic-http"` | Chiama API tramite il backend Generic HTTP |

`provider` determina i tipi di backend con cui il Workflow è compatibile, e determina anche quali backend vengono mostrati come eseguibili nella Dashboard.

### Controllo della visualizzazione

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  },
  "taskNameTemplate": "Elaborazione: {query}",
  "debug_only": false
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `display.core` | boolean | Se contrassegnare come Workflow principale (visualizzazione prioritizzata nella Dashboard, con un badge core) |
| `display.emoji` | string | Icona prefisso del nome visualizzato, ad es., `"📖"` |
| `taskNameTemplate` | string | Modello del nome dell'attività che utilizza segnaposto `{nome parametro}`, sostituiti con i valori effettivi al momento dell'esecuzione |
| `debug_only` | boolean | Quando `true`, visibile solo in modalità debug |

### Definizione degli input

```json
{
  "inputs": {
    "unit": "attachment",
    "accepts": {
      "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
    },
    "per_parent": {
      "min": 1,
      "max": 1
    }
  }
}
```

| Campo | Descrizione |
|-------|-------------|
| `unit` | **Tipo di unità di input**. `"attachment"` (allegato), `"parent"` (elemento genitore), `"note"` (nota), `"workflow"` (nessuna selezione di elementi necessaria, attivato direttamente dalla Dashboard) |
| `accepts.mime` | Tipi MIME accettati (applicabile solo quando `unit: "attachment"`). Se non specificato, tutti i tipi sono accettati |
| `per_parent.min` | Numero minimo di allegati per elemento genitore |
| `per_parent.max` | Numero massimo di allegati per elemento genitore |

Quando `unit: "workflow"`, non sono richiesti elementi selezionati dall'utente per l'attivazione (ad es., "Crea sintesi dell'argomento").

### <a id="selection-validation"></a>validateSelection — Validazione della selezione

`validateSelection` è la validazione dichiarativa della selezione. Copre scenari comuni come "salta gli elementi che hanno già risultati" o "accetta solo selezioni di tipi specifici" — senza scrivere JavaScript.

```json
{
  "validateSelection": {
    "select": {
      "policy": "literature-source"
    },
    "require": {
      "counts": {
        "parents": 1
      },
      "allowMixed": false
    },
    "exclude": [
      {
        "kind": "generated-notes-all",
        "noteKinds": ["digest", "references", "citation-analysis"]
      }
    ]
  }
}
```

### `select` — Politica di selezione

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `select.policy` | string | Politica di selezione. Valori supportati di seguito |
| `select.unit` | string | Sovrascrive l'unità di input per la validazione della selezione. `"attachment"` / `"parent"` / `"note"` / `"workflow"` |

**Valori supportati per `select.policy`:**

| Politica | Descrizione |
|----------|-------------|
| `input-unit` | Accetta elementi corrispondenti all'unità di input |
| `literature-source` | Accetta fonti letterarie (allegati o elementi genitore con allegati espandibili) |
| `pdf-attachment` | Accetta solo allegati PDF |
| `selected-parent` | Accetta elementi genitore dalla selezione |
| `generated-note-candidates` | Accetta elementi candidati per note generate |
| `digest-representative-image` | Elementi target per l'estrazione dell'immagine rappresentativa |

### `require` — Requisiti della selezione

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `require.counts.parents` | number | Numero minimo richiesto di elementi genitore |
| `require.counts.attachments` | number | Numero minimo richiesto di allegati |
| `require.counts.notes` | number | Numero minimo richiesto di note |
| `require.counts.children` | number | Numero minimo richiesto di elementi figlio |
| `require.counts.total` | number | Numero totale minimo richiesto di elementi |
| `require.allowMixed` | boolean | Se è consentito mescolare diversi tipi di elementi nella selezione |

### `exclude` — Regole di esclusione

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `exclude[]` | array | Elenco di regole di esclusione. Se una qualsiasi regola corrisponde, l'elemento corrente viene saltato |

**Valori supportati per `exclude.kind`:**

| kind | Descrizione | Parametri aggiuntivi |
|------|-------------|----------------------|
| `generated-notes-all` | L'elemento ha già note generate del tipo specificato | `noteKinds`: elenco di tipi di nota, ad es., `["digest", "references", "citation-analysis"]` |
| `artifact-exists` | L'elemento ha già l'artifact specificato (per evitare esecuzioni ridondanti) | `target`: `"deep-reading-html"` / `"translator-markdown"` / `"mineru-markdown"`; `parameter`: parametro lingua opzionale per la corrispondenza dell'artifact |

### `derive` — Selezioni derivate

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `derive[]` | array | Operazioni di selezione derivata. `"exportCandidates"` — deriva candidati per l'esportazione di note; `"digestRepresentativeImageTarget"` — deriva target di immagini rappresentative dalle note digest |

**Esempio:**

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "artifact-exists", "target": "deep-reading-html" }
    ]
  }
}
```

> In questo esempio, gli elementi che hanno già l'artifact HTML di lettura approfondita vengono automaticamente saltati, senza richiedere un filtraggio manuale da parte dell'utente.

### Controllo dell'attivazione

```json
{
  "trigger": {
    "requiresSelection": false
  }
}
```

| Campo | Descrizione |
|-------|-------------|
| `requiresSelection` | Se sono richiesti elementi selezionati dall'utente per l'attivazione. Il valore predefinito è `true`. Quando impostato su `false`, il Workflow può essere eseguito dalla Dashboard senza selezionare alcun elemento. Solitamente impostato su `false` quando `inputs.unit: "workflow"` |

### Controllo dell'esecuzione

```json
{
  "execution": {
    "timeout_ms": 600000,
    "poll_interval_ms": 2000,
    "mcp": {
      "requiredTools": ["search_items", "get_item_detail"]
    },
    "zoteroHostAccess": {
      "required": false,
      "allowWriteApprovalBypass": false
    },
    "feedback": {
      "showNotifications": true
    }
  }
}
```

| Campo | Descrizione |
|-------|-------------|
| `timeout_ms` | Timeout in millisecondi (efficace solo per i backend Generic HTTP) |
| `poll_interval_ms` | Intervallo di polling in millisecondi, controlla la frequenza dei controlli di avanzamento |
| `mcp.requiredTools` | Strumenti MCP richiesti da questo Workflow (array di stringhe di nomi di strumenti) |
| `zoteroHostAccess.required` | Se è richiesto l'accesso all'host Zotero (per leggere/scrivere i dati della libreria) |
| `zoteroHostAccess.allowWriteApprovalBypass` | Se è consentita l'esenzione dall'approvazione delle operazioni di scrittura |
| `feedback.showNotifications` | Se mostrare le notifiche di esecuzione. Il valore predefinito è `true`; impostare su `false` per l'esecuzione silenziosa |

> **Modalità di esecuzione** (`auto` / `interactive`) è stato spostato in `request.create.mode` — vedere [Tipi di richiesta](request-kinds).

### Recupero dei risultati

```json
{
  "result": {
    "fetch": { "type": "bundle" },
    "final_step_id": "finalize",
    "expects": {
      "result_json": "result/result.json",
      "artifacts": [
        "result/artifact1",
        "result/artifact2"
      ]
    }
  }
}
```

| Campo | Descrizione |
|-------|-------------|
| `fetch.type` | Metodo di recupero. `"bundle"` (scarica il bundle zip), `"result"` (recupera solo il JSON del risultato) |
| `final_step_id` | Per i Workflow di sequenza, specifica l'id del passo finale, utilizzato per determinare il risultato finale |
| `expects.result_json` | Percorso previsto del file JSON del risultato (relativo allo spazio di lavoro del runtime) |
| `expects.artifacts` | Elenco dei percorsi previsti dei file degli artifact |

### Definizione della richiesta

Definizione dichiarativa della richiesta, **mutuamente esclusiva** con `hooks.buildRequest` (se entrambi esistono, `hooks.buildRequest` ha la priorità).

```json
{
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "my-skill",
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

Per informazioni dettagliate su ciascun `kind`, vedere [Tipi di richiesta](request-kinds).

### Dichiarazione degli Hook

```json
{
  "hooks": {
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Campo | Obbligatorio | Descrizione |
|-------|-------------|-------------|
| `applyResult` | ✅ | **Obbligatorio**. Percorso dello script per la gestione del risultato post-esecuzione |
| `buildRequest` | | Facoltativo. Costruisce la richiesta da inviare al backend. Mutualmente esclusivo con il campo `request` |
| `normalizeSettings` | | Facoltativo. Normalizza i parametri impostati dall'utente |

> Il **filtraggio degli input** è stato sostituito dal meccanismo dichiarativo `validateSelection` — vedere [Validazione della selezione](#selection-validation) di seguito.

I percorsi sono relativi alla directory contenente `workflow.json`.

### Localizzazione

```json
{
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "Il mio Workflow",
        "parameters.language.title": "Lingua"
      }
    }
  }
}
```

Vedere la pagina [Localizzazione](localization) per informazioni dettagliate.

### Esempio completo: un Workflow di analisi letteraria con parametri

```json
{
  "id": "my-literature-analysis",
  "label": "La mia analisi letteraria",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "inputs": {
    "unit": "attachment",
    "accepts": { "mime": ["application/pdf"] },
    "per_parent": { "min": 1, "max": 1 }
  },
  "parameters": {
    "language": {
      "type": "string",
      "title": "Lingua di output",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    }
  },
  "execution": {
    "mode": "auto",
    "skillrunner_mode": "auto",
    "timeout_ms": 600000
  },
  "request": {
    "kind": "skillrunner.job.v1",
    "create": { "skill_id": "literature-analysis" }
  },
  "result": {
    "fetch": { "type": "bundle" },
    "expects": {
      "result_json": "result/result.json"
    }
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Prossimi passi

- [Sistema Hook](hooks) — Conoscere le firme API e i metodi di scrittura per ciascun Hook
- [Sistema dei parametri](parameters) — Tipi di parametri, valori enum, origini delle opzioni dinamiche
- [Selezione e contesto](selection-context) — Come ottenere informazioni sugli elementi selezionati dall'utente
