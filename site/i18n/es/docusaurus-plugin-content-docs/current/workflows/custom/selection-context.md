# Contexto de selección

Cuando un usuario selecciona elementos en Zotero, el plugin construye un **Contexto de Selección (SelectionContext)** estructurado que describe qué seleccionó el usuario y a qué tipo pertenece cada elemento seleccionado. Este contexto sirve como base de entrada para el Hook `buildRequest`.

## Tipos de selección

Basándose en la combinación de tipos de elementos seleccionados, `selectionContext.selectionType` devuelve uno de los siguientes valores:

| Tipo | Descripción |
|------|-------------|
| `"parent"` | Todos los elementos seleccionados son elementos padre (elementos de nivel superior) |
| `"child"` | Todos los elementos seleccionados son elementos hijo (elementos no de nivel superior) |
| `"attachment"` | Todos los elementos seleccionados son adjuntos |
| `"note"` | Todos los elementos seleccionados son notas |
| `"mixed"` | Los elementos seleccionados son una mezcla de múltiples tipos |
| `"none"` | No hay elementos seleccionados |

## Estructura del contexto

```ts
selectionContext = {
  selectionType: "parent",       // Tipo de selección
  items: {
    parents: [ /* Lista de elementos padre */ ],
    children: [ /* Lista de elementos hijo */ ],
    attachments: [ /* Lista de adjuntos */ ],
    notes: [ /* Lista de notas */ ],
  },
  summary: {
    parentCount: 2,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],                  // Mensajes de advertencia
  sampledAt: "2026-01-15T...",   // Hora de creación del contexto
}
```

Cada tipo de elemento contiene rica información contextual.

### Elemento padre (ParentContext)

Un elemento padre es un elemento de nivel superior en la biblioteca de Zotero (p. ej., artículo de revista, libro, página web, etc.). Cada contexto de elemento padre contiene:

```ts
{
  item: Zotero.Item,         // Objeto del elemento
  id: number,                // ID del elemento
  title: string,             // Título
  attachments: [             // Adjuntos hijo bajo este elemento
    { type, filePath, mimeType, dateAdded, ... }
  ],
  notes: [                   // Notas hijo bajo este elemento
    { id, content, ... }
  ],
  tags: string[],            // Lista de etiquetas
  collections: string[],     // Colecciones que lo contienen
  children: [                // Otros elementos hijo
    { id, type, ... }
  ],
}
```

### Adjunto (AttachmentContext)

Un adjunto es un archivo adjunto de un elemento (PDF, Markdown, etc.). Cada contexto de adjunto contiene:

```ts
{
  item: Zotero.Item,         // Objeto del elemento adjunto
  id: number,                // ID del elemento
  filePath: string,          // Ruta local del archivo
  fileName: string,          // Nombre del archivo
  mimeType: string,          // Tipo MIME (p. ej., "application/pdf")
  dateAdded: Date,           // Fecha de adición
  parentItem: {              // Elemento padre propietario
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
  content: string,           // Contenido de la nota (HTML)
  parentItem: { id, key, libraryID },
  tags: string[],
}
```

## Uso del contexto de selección en Hooks

### Obtener adjuntos seleccionados

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

### Obtener elementos padre seleccionados y su contenido hijo

```js
export function buildRequest({ selectionContext, runtime }) {
  const parents = selectionContext.items.parents;

  for (const parent of parents) {
    const title = parent.item.getField("title");
    const attachments = parent.attachments;  // Adjuntos bajo este elemento padre
    const notes = parent.notes;              // Notas bajo este elemento padre
  }

  // ...
}
```

### Verificar el tipo de selección para determinar el comportamiento

```js
export function preflight({ selectionContext }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // No hay elementos seleccionados, omitir
    return { kind: "skip", reason: "no selected items" };
  }

  if (selectionType === "attachment") {
    // El usuario seleccionó solo adjuntos, usar lógica de procesamiento de adjuntos
  } else if (selectionType === "parent") {
    // El usuario seleccionó solo elementos padre, expandir el primer adjunto que cumpla los requisitos
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
## Próximos pasos

- [Referencia de la API del host](host-api) — API completa para manipular datos de Zotero en hooks
- [Redacción del manifiesto](manifest) — Definir los tipos de unidad de entrada del workflow
