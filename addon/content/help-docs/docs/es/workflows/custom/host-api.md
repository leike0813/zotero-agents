# Referencia de la API del Host

`runtime.hostApi` es la interfaz principal para que los hooks de workflow interactúen con Zotero. Encapsula capacidades operativas completas para bibliotecas de Zotero, elementos, sistemas de archivos, preferencias y más.

## Operaciones de elementos (hostApi.items)

```ts
hostApi.items = {
  get: (ref) => Zotero.Item | null,          // Obtener elemento por referencia
  resolve: (ref) => Zotero.Item,             // Igual que get, pero lanza error si el elemento no existe
  getByLibraryAndKey: (libraryID, key) => Zotero.Item | null,  // Obtener por ID de biblioteca + Key
  getAll: () => Promise<Zotero.Item[]>,      // Obtener todos los elementos
}
```

`ref` puede ser un objeto `Zotero.Item`, un ID numérico, o un Key de cadena.

**Ejemplo:**

```js
// Obtener elemento por ID
const item = hostApi.items.get(12345);

// Obtener elemento por Key de biblioteca
const item = hostApi.items.getByLibraryAndKey(1, "ABCD1234");
```

## Contexto (hostApi.context)

```ts
hostApi.context = {
  getCurrentView: () => ZoteroHostCurrentViewDto,  // Información de vista activa actual
  getSelectedItems: () => ZoteroHostItemSummaryDto[],  // Lista de elementos seleccionados actualmente
}
```

**Ejemplo:**

```js
const view = hostApi.context.getCurrentView();
// { libraryID: 1, selectedItems: [...], ... }

const selected = hostApi.context.getSelectedItems();
// [{ id, key, libraryID, title, ... }, ...]
```

## Operaciones de biblioteca (hostApi.library)

```ts
hostApi.library = {
  listItems: (args) => Promise<LibraryListResponse>,       // Listado paginado de elementos
  searchItems: (args) => Promise<ItemSummaryDto[]>,        // Buscar elementos
  getItemDetail: (ref) => Promise<ItemDetailDto | null>,   // Obtener información detallada del elemento
  getItemNotes: (ref, args?) => Promise<NoteDto[]>,        // Obtener lista de notas del elemento
  getNoteDetail: (ref, args?) => Promise<NoteDetailChunkDto>, // Obtener cuerpo de nota
  listNotePayloads: (ref) => Promise<NotePayloadDto[]>,    // Listar payloads incrustados de notas
  getNotePayload: (ref, args?) => Promise<NotePayloadDto>, // Obtener un payload específico
  getItemAttachments: (ref) => Promise<AttachmentDto[]>,   // Obtener lista de adjuntos del elemento
}
```

**Ejemplo:**

```js
// Buscar elementos
const results = await hostApi.library.searchItems({
  query: "transformer",
  limit: 10,
});

// Obtener notas del elemento
const notes = await hostApi.library.getItemNotes(ref);

// Obtener adjuntos del elemento
const attachments = await hostApi.library.getItemAttachments(ref);
```

## Operaciones de mutación (hostApi.mutations)

Se usa para crear, actualizar y eliminar datos en Zotero. Las operaciones de escritura requieren aprobación del usuario (confirmada en la UI de Zotero).

```ts
hostApi.mutations = {
  preview: (request) => Promise<MutationPreviewResponse>,   // Previsualizar efectos de mutación
  execute: (request) => Promise<MutationExecuteResponse>,   // Ejecutar mutación
}
```

### Operaciones de mutación soportadas

| `operation` | Propósito | Descripción |
|-------------|-----------|-------------|
| `item.updateFields` | Actualizar campos de elemento | Modificar título, autor, fecha y otros campos |
| `item.addTags` | Agregar etiquetas | Agregar una o más etiquetas a un elemento |
| `item.removeTags` | Eliminar etiquetas | Eliminar etiquetas especificadas de un elemento |
| `note.createChild` | Crear nota hija | Crear una nueva nota bajo un elemento padre |
| `note.update` | Actualizar nota | Modificar el contenido de una nota existente |
| `note.upsertPayload` | Actualizar payload incrustado | Actualizar el adjunto de payload de workflow de la nota |
| `literature.ingest` | Ingerir literatura | Importar un artículo a Zotero |
| `collection.addItems` | Agregar a colección | Agregar elementos a una colección |
| `collection.removeItems` | Eliminar de colección | Eliminar elementos de una colección |

**Ejemplo: Crear una nota**

```js
const result = await hostApi.mutations.execute({
  operation: "note.createChild",
  parentItem: parentItem.getField("id"),
  data: {
    content: htmlContent,
    tags: ["generated"],
  },
});
```

**Ejemplo: Agregar etiquetas**

```js
await hostApi.mutations.execute({
  operation: "item.addTags",
  item: itemId,
  data: { tags: ["field:computer_science", "method:deep_learning"] },
});
```

## Operaciones de notas (hostApi.notes)

```ts
hostApi.notes = {
  // ... Todos los métodos del handler de notas de bajo nivel
  importEmbeddedImage: (noteRef, image) => Promise<{
    attachmentKey: string;
    attachmentItem: Zotero.Item;
    mimeType: string;
    bytes: number;
  }>,
}
```

### Procesamiento de imágenes (hostApi.images)

```ts
hostApi.images = {
  prepareForNoteEmbedding: (source, options?) => Promise<PreparedNoteImage>,
}
```

Se usa para procesar imágenes en un formato adecuado para incrustar en notas:

```js
const prepared = await hostApi.images.prepareForNoteEmbedding(filePath, {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
});

const result = await hostApi.notes.importEmbeddedImage(noteRef, prepared);
```

## Operaciones de adjuntos (hostApi.attachments)

```ts
hostApi.attachments = {
  // Todos los métodos del handler de adjuntos de bajo nivel
  // Incluyendo: listar adjuntos, obtener rutas de adjuntos, crear adjuntos, etc.
}
```

## Operaciones de etiquetas (hostApi.tags)

```ts
hostApi.tags = {
  // Todos los métodos del handler de etiquetas de bajo nivel
  // Incluyendo: listar etiquetas, obtener etiquetas, crear etiquetas, etc.
}
```

## Operaciones de colecciones (hostApi.collections)

```ts
hostApi.collections = {
  // Todos los métodos del handler de colecciones de bajo nivel
  // Incluyendo: listar colecciones, obtener sub-colecciones, etc.
}
```

## Operaciones de archivos (hostApi.file)

```ts
hostApi.file = {
  readText: (path) => Promise<string>,                    // Leer archivo de texto
  writeText: (path, content) => Promise<void>,            // Escribir archivo de texto
  readBytes: (path) => Promise<Uint8Array>,               // Leer archivo binario
  writeBytes: (path, bytes) => Promise<void>,             // Escribir archivo binario
  copy: (source, target) => Promise<void>,                // Copiar archivo
  exists: (path) => Promise<boolean>,                     // Verificar si el archivo existe
  makeDirectory: (path) => Promise<void>,                 // Crear directorio (incluyendo directorios padre)
  pathToFile: (path) => nsIFile,                          // Convertir ruta a objeto de archivo de Zotero
  getTempDirectoryPath: () => string,                     // Obtener ruta del directorio temporal
  pickDirectory: (args?) => Promise<string | null>,       // Abrir selector de directorio
  pickFile: (args?) => Promise<string | null>,            // Abrir selector de archivo
  pickFiles: (args?) => Promise<string[] | null>,         // Abrir selector de múltiples archivos
}
```

**Ejemplo:**

```js
// Leer archivo
const content = await hostApi.file.readText("/path/to/file.md");

// Escribir archivo
await hostApi.file.writeText("/path/to/output.md", newContent);

// Abrir selector de directorio para que el usuario elija el directorio de exportación
const dir = await hostApi.file.pickDirectory({
  title: "Seleccionar directorio de exportación",
});
if (dir) {
  // El usuario seleccionó un directorio
  await hostApi.file.writeText(`${dir}/result.md`, content);
}
```

## Preferencias (hostApi.prefs)

```ts
hostApi.prefs = {
  get: (key, global?) => unknown,      // Leer preferencia
  set: (key, value, global?) => void,  // Escribir preferencia
  clear: (key, global?) => void,       // Limpiar preferencia
}
```

El prefijo es manejado automáticamente por el plugin; solo necesitas pasar el nombre de la clave.

**Ejemplo:**

```js
// Leer configuración
const vocab = hostApi.prefs.get("tagVocabularyJson");

// Escribir configuración
hostApi.prefs.set("mySetting", "myValue");
```

## Notificaciones de UI (hostApi.notifications)

```ts
hostApi.notifications = {
  toast: ({ text, type? }) => void,
}
// type: "default" | "success" | "error"
```

**Ejemplo:**

```js
hostApi.notifications.toast({
  text: "¡Procesamiento completado!",
  type: "success",
});
```

## Registro de ejecución (hostApi.logging)

```ts
hostApi.logging = {
  appendRuntimeLog: (input) => void,
}
```

Se usa para agregar información de diagnóstico al registrador de ejecución.

## Configuración del plugin (hostApi.addon)

```ts
hostApi.addon = {
  getConfig: () => ({ addonName, addonRef, prefsPrefix }),
}
```

## Versión de API (hostApi.version)

```ts
hostApi.version: number
```

El número de versión actual de la API del host. Úsalo para protegerte contra cambios disruptivos al escribir hooks que necesiten compatibilidad entre versiones del plugin.

## Operaciones de padre (hostApi.parents)

```ts
hostApi.parents = {
  // Operaciones del handler de elementos padre de bajo nivel
}
```

Proporciona acceso de nivel más bajo a la gestión de elementos padre. Prefiere usar `hostApi.library` y `hostApi.mutations` a menos que necesites la interfaz de handler de nivel más bajo.

## Operaciones de comandos (hostApi.command)

```ts
hostApi.command = {
  // Operaciones del handler de comandos de bajo nivel
}
```

Interfaz de nivel más bajo para ejecución de comandos. Típicamente no se necesita en hooks de workflow.

## Operaciones de editor (hostApi.editor)

```ts
hostApi.editor = {
  openSession: (args) => ReturnType<typeof openWorkflowEditorSession>,
  registerRenderer: (rendererId, renderer) => void,
  unregisterRenderer: (rendererId) => void,
}
```

Gestiona sesiones de editor de workflow. `registerRenderer` y `unregisterRenderer` permiten renderizadores personalizados para formatos de salida específicos de workflow.

## Operaciones de síntesis (hostApi.synthesis)

```ts
hostApi.synthesis?: SynthesisService
```

Proporciona acceso al servicio Synthesis Workbench (temas, conceptos, etiquetas, gráfico de citas, etc.). Disponible solo cuando el sistema de síntesis está inicializado.

## Ejemplo completo

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  const { hostApi, helpers } = runtime;

  // 1. Resolver elemento padre
  const parentItem = helpers.resolveItemRef(parent);

  // 2. Leer artefacto del bundle
  const markdownContent = await bundleReader.readText("result/output.md");

  // 3. Convertir a nota HTML
  const htmlContent = helpers.toHtmlNote("Resultado del procesamiento", markdownContent);

  // 4. Crear nota
  const noteResult = await hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  // 5. Agregar etiquetas
  await hostApi.mutations.execute({
    operation: "item.addTags",
    item: parentItem.getField("id"),
    data: { tags: ["processed"] },
  });

  // 6. Notificar al usuario
  hostApi.notifications.toast({
    text: `Procesamiento completado: ${parentItem.getField("title")}`,
    type: "success",
  });

  return { applied: true, noteId: noteResult.id };
}
```

## Próximos pasos

- [Empaquetado y despliegue](#doc/workflows%2Fcustom%2Fpackaging) — Publicar workflows personalizados
- [Depuración y pruebas](#doc/workflows%2Fcustom%2Fdebugging) — Verificar la corrección del workflow
