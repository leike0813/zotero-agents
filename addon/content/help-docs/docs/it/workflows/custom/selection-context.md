# Contesto di selezione

Quando un utente seleziona degli elementi in Zotero, il plugin costruisce un **Contesto di selezione (SelectionContext)** strutturato che descrive ciò che l'utente ha selezionato e a quale tipo appartiene ciascun elemento selezionato. Questo contesto funge da base di input per l'Hook `buildRequest`.

## Tipi di selezione

In base alla combinazione dei tipi di elementi selezionati, `selectionContext.selectionType` restituisce uno dei seguenti valori:

| Tipo | Descrizione |
|------|-------------|
| `"parent"` | Tutti gli elementi selezionati sono elementi genitore (elementi di livello superiore) |
| `"child"` | Tutti gli elementi selezionati sono elementi figlio (elementi non di livello superiore) |
| `"attachment"` | Tutti gli elementi selezionati sono allegati |
| `"note"` | Tutti gli elementi selezionati sono note |
| `"mixed"` | Gli elementi selezionati sono un mix di più tipi |
| `"none"` | Nessun elemento è selezionato |

## Struttura del contesto

```ts
selectionContext = {
  selectionType: "parent",       // Tipo di selezione
  items: {
    parents: [ /* Elenco degli elementi genitore */ ],
    children: [ /* Elenco degli elementi figlio */ ],
    attachments: [ /* Elenco degli allegati */ ],
    notes: [ /* Elenco delle note */ ],
  },
  summary: {
    parentCount: 2,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],                  // Messaggi di avviso
  sampledAt: "2026-01-15T...",   // Ora di creazione del contesto
}
```

Ogni tipo di elemento contiene informazioni contestuali ricche.

### Elemento genitore (ParentContext)

Un elemento genitore è un elemento di livello superiore nella libreria Zotero (ad es., articolo di rivista, libro, pagina web, ecc.). Ogni contesto di elemento genitore contiene:

```ts
{
  item: Zotero.Item,         // Oggetto elemento
  id: number,                // ID dell'elemento
  title: string,             // Titolo
  attachments: [             // Allegati figlio sotto questo elemento
    { type, filePath, mimeType, dateAdded, ... }
  ],
  notes: [                   // Note figlio sotto questo elemento
    { id, content, ... }
  ],
  tags: string[],            // Elenco dei tag
  collections: string[],     // Collezioni contenitrici
  children: [                // Altri elementi figlio
    { id, type, ... }
  ],
}
```

### Allegato (AttachmentContext)

Un allegato è un allegato file di un elemento (PDF, Markdown, ecc.). Ogni contesto di allegato contiene:

```ts
{
  item: Zotero.Item,         // Oggetto elemento dell'allegato
  id: number,                // ID dell'elemento
  filePath: string,          // Percorso locale del file
  fileName: string,          // Nome del file
  mimeType: string,          // Tipo MIME (ad es., "application/pdf")
  dateAdded: Date,           // Data di aggiunta
  parentItem: {              // Elemento genitore proprietario
    id: number,
    key: string,
    libraryID: number,
  },
  tags: string[],
  collections: string[],
}
```

### Nota (NoteContext)

```ts
{
  item: Zotero.Item,
  id: number,
  content: string,           // Contenuto della nota (HTML)
  parentItem: { id, key, libraryID },
  tags: string[],
}
```

## Utilizzo del contesto di selezione negli Hook

### Ottenere gli allegati selezionati

```js
export function buildRequest({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    input: {
      files: attachments.map((attachment) => ({
        path: runtime.helpers.getAttachmentFilePath(attachment),
        name: runtime.helpers.getAttachmentFileName(attachment),
      })),
    },
  };
}
```

### Ottenere gli elementi genitore selezionati e il loro contenuto figlio

```js
export function buildRequest({ selectionContext, runtime }) {
  const parents = selectionContext.items.parents;

  for (const parent of parents) {
    const title = parent.item.getField("title");
    const attachments = parent.attachments;  // Allegati sotto questo elemento genitore
    const notes = parent.notes;              // Note sotto questo elemento genitore
  }

  // ...
}
```

### Controllare il tipo di selezione per determinare il comportamento

```js
export function preflight({ selectionContext }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // Nessun elemento selezionato, salta
    return { kind: "skip", reason: "no selected items" };
  }

  if (selectionType === "attachment") {
    // L'utente ha selezionato solo allegati, utilizza la logica di elaborazione degli allegati
  } else if (selectionType === "parent") {
    // L'utente ha selezionato solo elementi genitore, espandi il primo allegato idoneo
  }

  return { kind: "continue", context: { selectionType } };
}
```

### Attachment Candidate Planning

```json
{
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
  }
}
```

`require.selection` reads the original SelectionContext once. The selector
produces ordered candidates, attachment MIME compatibility runs before filters,
and `inputs.grouping` creates immutable top-level units.

### Workflows Without Selected Items

Use `member.kind: "selection"`, `grouping.mode: "all"`, the `selection`
selector, and `trigger.requiresSelection: false`. The selector then produces
the complete empty SelectionContext as the single member. Selection
requirements remain active and must not make the empty selection impossible.

## Declarative Candidate Filters

```json
{
  "validateSelection": {
    "select": { "policy": "generated-note-candidates" },
    "filters": [
      {
        "kind": "generated-note-kinds-absent",
        "phase": "availability",
        "noteKinds": ["digest"]
      }
    ]
  }
}
```

`validateSelection` owns candidate production and filtering. `inputs` owns
the execution member and grouping. Hooks consume the prepared unit and must not
reconstruct selection planning.
## Prossimi passi

- [Riferimento API host](#doc/workflows%2Fcustom%2Fhost-api) — API completa per manipolare i dati Zotero negli hook
- [Redigere il manifesto](#doc/workflows%2Fcustom%2Fmanifest) — Definire i tipi di unità di input del Workflow
