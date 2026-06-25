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
export function filterInputs({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  for (const attachment of attachments) {
    const filePath = runtime.helpers.getAttachmentFilePath(attachment);
    const fileName = runtime.helpers.getAttachmentFileName(attachment);
    // Elabora l'allegato
  }

  return selectionContext;
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
export function filterInputs({ selectionContext, runtime }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // Nessun elemento selezionato, salta
    return null;
  }

  if (selectionType === "attachment") {
    // L'utente ha selezionato solo allegati, utilizza la logica di elaborazione degli allegati
  } else if (selectionType === "parent") {
    // L'utente ha selezionato solo elementi genitore, espandi il primo allegato idoneo
  }

  return selectionContext;
}
```

### Filtrare gli allegati

Utilizzare `helpers.withFilteredAttachments` per aggiornare il contesto di selezione dopo l'elaborazione:

```js
export function filterInputs({ selectionContext, runtime }) {
  const { helpers } = runtime;

  // Mantieni solo gli allegati PDF
  const pdfs = selectionContext.items.attachments.filter(
    a => helpers.isPdfAttachment(a)
  );

  // Mantieni solo gli elementi genitore che hanno allegati PDF da tutti gli elementi
  const matched = selectionContext.items.parents.filter(parent => {
    return parent.attachments.some(
      a => helpers.isPdfAttachment(a)
    );
  });

  // Se nessuna corrispondenza, salta l'esecuzione
  if (matched.length === 0) return null;

  // Aggiorna il contesto con il risultato filtrato
  return helpers.withFilteredAttachments(selectionContext, matched);
}
```

### Workflow quando nessun elemento è selezionato

Quando `inputs.unit: "workflow"` e `trigger.requiresSelection: false`, il Workflow può essere attivato senza alcun elemento selezionato. In questo caso, `selectionContext.selectionType` è `"none"`, e tutti gli array in `items` sono vuoti. Questa modalità è adatta per creare operazioni globali (ad es., "Crea sintesi dell'argomento").

## Validazione dichiarativa della selezione

Se il tuo Workflow ha solo bisogno di **saltare gli elementi che hanno già risultati** o **filtrare tipi specifici di input**, puoi utilizzare il campo dichiarativo `validateSelection` senza scrivere un Hook `filterInputs`.

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "generated-notes-all", "noteKinds": ["digest"] }
    ]
  }
}
```

Vedere la documentazione completa in [Redigere il manifesto](manifest#selection-validation).

> **Guida alla selezione:** Utilizzare `validateSelection` dichiarativo ogni volta che è possibile — non richiede JavaScript e non richiede manutenzione. La logica di selezione complessa può essere implementata nell'Hook `buildRequest`.

## Prossimi passi

- [Riferimento API host](host-api) — API completa per manipolare i dati Zotero negli hook
- [Redigere il manifesto](manifest) — Definire i tipi di unità di input del Workflow
