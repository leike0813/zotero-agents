# Redigere il manifesto del Workflow

`workflow.json` è il file manifesto di un Workflow, che ne definisce tutti i metadati e comportamenti. Il Workflow Manager scopre e carica i Workflow attraverso questo file.

## Struttura di base

```json
{
  "schemaVersion": 2,
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": { "kind": "parent" },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": []
  },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "preflight": "hooks/preflight.mjs",
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

### Input Planning Contracts

`inputs` and `validateSelection` have separate, non-interchangeable roles.
`inputs` is the consumer contract for prepared execution members and grouping;
`validateSelection` is the producer contract for raw-selection validation,
candidate selection, ordered filtering, and candidate cardinality.

#### `inputs` — Execution Input Contract

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": {
        "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
      }
    },
    "grouping": { "mode": "parent" }
  }
}
```

- `member.kind`: `selection`, `parent`, `child`, `attachment`,
  `note`, `generated-note`, or `digest-image-target`.
- `member.accepts.mime` applies only to attachment execution members.
- `grouping.mode: "each"` creates one unit per candidate.
- `grouping.mode: "all"` creates one unit containing all candidates.
- `grouping.mode: "parent"` creates stable parent groups. Candidates without
  parent identity are skipped as `missing-parent`.

#### `validateSelection` — Candidate Production Contract {#selection-validation}

```json
{
  "validateSelection": {
    "require": {
      "selection": {
        "counts": {
          "parents": { "min": 1 },
          "total": { "min": 1 }
        },
        "allowMixed": false
      },
      "candidates": { "min": 1 }
    },
    "select": {
      "policy": "input-member",
      "source": "related"
    },
    "filters": [
      {
        "kind": "source-file-exists",
        "phase": "availability"
      }
    ]
  }
}
```

`require.selection` checks the raw SelectionContext exactly once.
`select` then produces ordered atomic candidates. MIME compatibility and
`filters` run before `require.candidates`. Count rules use either
`{ "exact": n }` or non-negative `min`/`max` values.

Supported selectors are `input-member` (`source: selected|related`),
`selection`, `literature-source`, `generated-note-candidates`, and
`digest-representative-image`. Supported filters are
`source-file-exists`, `candidates-per-parent`,
`generated-note-kinds-absent`, and `artifact-absent`. Parameter-dependent
artifact checks require `phase: "execute"`; availability filters run during
preview and are reapplied during confirmed planning.

#### `trigger` — Empty-selection Gate

```json
{
  "trigger": {
    "requiresSelection": true
  }
}
```

`trigger.requiresSelection` is required in schema v2. It controls only whether
an empty selection may enter planning; it does not replace
`require.selection`.
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
    "preflight": "hooks/preflight.mjs",
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Campo | Obbligatorio | Descrizione |
|-------|-------------|-------------|
| `applyResult` | ✅ | **Obbligatorio**. Percorso dello script per la gestione del risultato post-esecuzione |
| `preflight` | | Facoltativo. Viene eseguito dopo la risoluzione della selezione e prima della costruzione della richiesta. Può continuare, saltare, cortocircuitare verso `applyResult` o sostituire un'unità di input con unità di richiesta virtuali |
| `buildRequest` | | Facoltativo. Costruisce la richiesta da inviare al backend. Mutualmente esclusivo con il campo `request` |
| `normalizeSettings` | | Facoltativo. Normalizza i parametri impostati dall'utente |

> Il **filtraggio degli input** è stato sostituito dal meccanismo dichiarativo `validateSelection` — vedere [Validazione della selezione](#selection-validation) di seguito.

`preflight` non partecipa all'abilitazione del menu, alla classificazione della selezione per debug-probe né ai controlli di prontezza di Host Bridge. Mantenere i vincoli di selezione in `validateSelection`, la costruzione della richiesta al provider in `buildRequest` o `request`, e le scritture in Zotero in `applyResult`.

I percorsi sono relativi alla directory contenente `workflow.json`.

### Localizzazione

```json
{
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "My Workflow",
        "parameters.language.title": "Language"
      }
    }
  }
}
```

Vedere la pagina [Localizzazione](localization) per informazioni dettagliate.

### Esempio completo: un Workflow di analisi letteraria con parametri

```json
{
  "schemaVersion": 2,
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": { "mime": ["application/pdf"] }
    },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "require": {
      "selection": {
        "counts": { "attachments": { "min": 1 } },
        "allowMixed": false
      }
    },
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [
      { "kind": "source-file-exists", "phase": "availability" }
    ]
  },
  "parameters": {
    "language": {
      "type": "string",
      "title": "Output Language",
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
