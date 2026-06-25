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
export function filterInputs({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  for (const attachment of attachments) {
    const filePath = runtime.helpers.getAttachmentFilePath(attachment);
    const fileName = runtime.helpers.getAttachmentFileName(attachment);
    // Procesar adjunto
  }

  return selectionContext;
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
export function filterInputs({ selectionContext, runtime }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // No hay elementos seleccionados, omitir
    return null;
  }

  if (selectionType === "attachment") {
    // El usuario seleccionó solo adjuntos, usar lógica de procesamiento de adjuntos
  } else if (selectionType === "parent") {
    // El usuario seleccionó solo elementos padre, expandir el primer adjunto que cumpla los requisitos
  }

  return selectionContext;
}
```

### Filtrar adjuntos

Usa `helpers.withFilteredAttachments` para actualizar el contexto de selección después del procesamiento:

```js
export function filterInputs({ selectionContext, runtime }) {
  const { helpers } = runtime;

  // Mantener solo adjuntos PDF
  const pdfs = selectionContext.items.attachments.filter(
    a => helpers.isPdfAttachment(a)
  );

  // Mantener solo elementos padre que tengan adjuntos PDF de todos los elementos
  const matched = selectionContext.items.parents.filter(parent => {
    return parent.attachments.some(
      a => helpers.isPdfAttachment(a)
    );
  });

  // Si no hay coincidencias, omitir la ejecución
  if (matched.length === 0) return null;

  // Actualizar contexto con el resultado filtrado
  return helpers.withFilteredAttachments(selectionContext, matched);
}
```

### Workflows cuando no hay elementos seleccionados

Cuando `inputs.unit: "workflow"` y `trigger.requiresSelection: false`, el workflow puede activarse sin ningún elemento seleccionado. En este caso, `selectionContext.selectionType` es `"none"`, y todos los arrays en `items` están vacíos. Este modo es adecuado para crear operaciones globales (p. ej., "Crear síntesis de tema").

## Validación de selección declarativa

Si tu workflow solo necesita **omitir elementos que ya tienen resultados** o **filtrar tipos específicos de entrada**, puedes usar el campo declarativo `validateSelection` sin escribir un Hook `filterInputs`.

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

Consulta la documentación completa en [Redacción del manifiesto](#doc/workflows%2Fcustom%2Fmanifest#selection-validation).

> **Guía de selección:** Usa `validateSelection` declarativo siempre que sea posible — no requiere JavaScript y no requiere mantenimiento. La lógica de selección compleja puede implementarse en el Hook `buildRequest`.

## Próximos pasos

- [Referencia de la API del host](#doc/workflows%2Fcustom%2Fhost-api) — API completa para manipular datos de Zotero en hooks
- [Redacción del manifiesto](#doc/workflows%2Fcustom%2Fmanifest) — Definir los tipos de unidad de entrada del workflow
