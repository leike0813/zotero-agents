# Sistema dei parametri

I Workflow possono definire parametri configurabili che fanno apparire una finestra di dialogo delle impostazioni da compilare prima dell'esecuzione. Il sistema dei parametri supporta più tipi e origini di dati dinamici.

## Definizione dei parametri

I parametri sono definiti nel campo `parameters` di `workflow.json`:

```json
{
  "parameters": {
    "language": {
      "type": "string",
      "title": "Lingua di output",
      "description": "Seleziona la lingua per il contenuto di output",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    },
    "maxResults": {
      "type": "number",
      "title": "Risultati massimi",
      "description": "Limite superiore al numero di risultati restituiti",
      "default": 10,
      "min": 1,
      "max": 100
    },
    "enableFilter": {
      "type": "boolean",
      "title": "Abilita filtro",
      "description": "Se abilitare il filtraggio dei risultati",
      "default": true,
      "visible_if": { "parameter": "language", "equals": false }
    }
  }
}
```

## Tipi di parametri

| Tipo | Descrizione | Controllo applicabile |
|------|-------------|----------------------|
| `string` | Stringa di testo | Casella di testo / menu a tendina / selettore dinamico |
| `number` | Numero | Input numerico (supporta vincoli min/max) |
| `boolean` | Booleano | Interruttore / casella di selezione |

## Valori enum e valori personalizzati

```json
{
  "language": {
    "type": "string",
    "enum": ["en-US", "zh-CN", "ja-JP"],
    "allowCustom": true,
    "default": "en-US"
  }
}
```

- `enum`: Elenco di valori preimpostati suggeriti. Visualizzati come opzioni selezionabili nel menu a tendina
- `allowCustom` (solo tipo string): Quando impostato a `true`, i valori `enum` sono solo raccomandazioni; gli utenti possono inserire liberamente altri valori. Quando impostato a `false` o omesso, gli utenti possono solo selezionare da `enum`

## Visualizzazione condizionale

```json
{
  "advancedMode": {
    "type": "boolean",
    "title": "Modalità avanzata",
    "default": false
  },
  "customEndpoint": {
    "type": "string",
    "title": "Endpoint personalizzato",
    "visible_if": { "parameter": "advancedMode", "equals": true }
  }
}
```

`visible_if` controlla la visualizzazione/nascondimento dei parametri nella finestra di dialogo delle impostazioni:

- `equals: true` — Visualizza solo quando il valore del parametro di destinazione è truthy
- `equals: false` — Visualizza solo quando il valore del parametro di destinazione è falsy

**Esempio: Mostra/Nascondi collegato**

```json
{
  "auto_tag_regulator": {
    "type": "boolean",
    "title": "Regolatore di tag automatico",
    "default": true
  },
  "auto_tag_infer_tag": {
    "type": "boolean",
    "title": "Inferisci tag",
    "default": true,
    "visible_if": { "parameter": "auto_tag_regulator", "equals": true }
  }
}
```

Quando `auto_tag_regulator` è deselezionato, il parametro `auto_tag_infer_tag` viene automaticamente nascosto.

## Origini delle opzioni dinamiche

Le opzioni dei valori dei parametri possono provenire dai dati in tempo reale di Zotero:

```json
{
  "targetCollection": {
    "type": "string",
    "title": "Collezione di destinazione",
    "default": "",
    "optionsSource": {
      "kind": "zotero.collections",
      "library": "current",
      "includeEmpty": true,
      "valueFormat": "collectionRef",
      "labelFormat": "path"
    }
  },
  "relatedTopic": {
    "type": "string",
    "title": "Argomento correlato",
    "optionsSource": {
      "kind": "synthesis.topics",
      "filter": "updatable"
    }
  }
}
```

### Origini delle opzioni supportate

| `kind` | Descrizione | Parametri disponibili |
|--------|-------------|----------------------|
| `zotero.collections` | Elenco delle collezioni nella libreria Zotero corrente | `library` (current/user/number), `includeEmpty`, `valueFormat` (collectionRef), `labelFormat` (path/title) |
| `synthesis.topics` | Elenco degli argomenti nel Synthesis Workbench | `filter` (all/updatable), `valueFormat` (topicId), `labelFormat` (title) |

### Parametri comuni di optionsSource

| Parametro | Descrizione |
|-----------|-------------|
| `library` | Ambito della libreria. `"current"` (libreria corrente), `"user"` (libreria utente), numero (ID di una libreria specifica) |
| `includeEmpty` | Se includere un'opzione vuota (per "nessuna selezione") |
| `valueFormat` | Formato dei valori delle opzioni: `"collectionRef"` / `"topicId"` |
| `labelFormat` | Formato di visualizzazione delle etichette delle opzioni: `"path"` / `"title"` |
| `allowStale` | Consente l'uso di dati in cache (evita di richiedere ogni volta che si aprono le impostazioni) |
| `filter` | Condizione di filtro (varia in base al kind) |

## Vincoli per parametri numerici

```json
{
  "confidence": {
    "type": "number",
    "title": "Soglia di confidenza",
    "default": 0.8,
    "min": 0,
    "max": 1
  }
}
```

`min` e `max` vincolano l'intervallo dei valori di input.

## Lettura dei parametri negli Hook

In `buildRequest`, `filterInputs` e `applyResult`, puoi leggere i valori dei parametri impostati dall'utente tramite `executionOptions.workflowParams`:

```js
export function buildRequest({ executionOptions, runtime }) {
  const params = executionOptions?.workflowParams || {};
  const language = params.language || "en-US";
  const maxResults = params.maxResults || 10;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    parameter: { language, max_results: maxResults },
  };
}
```

## Localizzazione dei parametri

Il `title` e la `description` dei parametri supportano la localizzazione:

```json
{
  "i18n": {
    "messages": {
      "zh-CN": {
        "parameters.language.title": "Lingua",
        "parameters.language.description": "Seleziona la lingua per il contenuto di output"
      }
    }
  }
}
```

Vedere la pagina [Localizzazione](localization) per il meccanismo completo di localizzazione.

## Prossimi passi

- [Contesto di selezione](selection-context) — Comprendere come la selezione degli elementi dell'utente viene passata al Workflow
- [Tipi di richiesta](request-kinds) — Metodi di passaggio dei parametri per diversi tipi di richiesta
