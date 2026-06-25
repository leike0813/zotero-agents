# Sistema de Hooks

Los hooks son los puntos de extensibilidad de un workflow — en diferentes etapas de la ejecución del workflow, el Workflow Runtime del plugin llama a los scripts de Hook correspondientes, permitiéndote intervenir y controlar el flujo de ejecución con JavaScript.

Un workflow puede contener hasta **3 Hooks**, de los cuales `applyResult` es el único obligatorio.

> **Nota sobre el filtrado de entrada:** El antiguo hook `filterInputs` ha sido reemplazado por el mecanismo declarativo `validateSelection`. Usa `validateSelection` en `workflow.json` para definir restricciones de entrada sin escribir JavaScript. Consulta [Redacción del archivo de manifiesto](manifest#selection-validation) para más detalles.

## Estructura del script de Hook

Cada script de Hook es un archivo `.mjs` (módulo ES) que exporta funciones nombradas:

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, manifest, executionOptions, runtime }) {
  // Lógica de implementación
  return requestSpec;
}
```

## Contexto de ejecución (runtime)

Todos los Hooks reciben un parámetro `runtime` que proporciona acceso directo a Zotero y a diversas herramientas.

```js
runtime = {
  zotero,           // Objeto global de Zotero
  handlers,         // Handlers de procesamiento de datos de bajo nivel
  hostApi,          // API del host de alto nivel (recomendada)
  helpers,          // Funciones auxiliares de Hook
  addon,            // Configuración del plugin

  workflowId,       // ID del workflow actual
  workflowRootDir,  // Ruta absoluta del directorio que contiene workflow.json
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // ID del paquete propietario (solo disponible dentro de paquetes de workflow)
  packageRootDir,   // Ruta absoluta del directorio raíz del paquete

  hostApiVersion,   // Número de versión de la API del host
  hookName,         // Nombre del hook actual: "buildRequest" | "applyResult" | ""
  debugMode,        // Si está en modo de depuración

  fetch,            // Fetch global (si está disponible)
  Buffer,           // Buffer de Node.js (si está disponible)
  btoa,             // Codificación Base64 (si está disponible)
  atob,             // Decodificación Base64 (si está disponible)
  TextEncoder,      // Codificador de texto (si está disponible)
  TextDecoder,      // Decodificador de texto (si está disponible)
  FileReader,       // Lector de archivos (si está disponible)
  navigator,        // Objeto Navigator (si está disponible)
}
```

**Mejor práctica:** Prefiere `runtime.hostApi` (API de alto nivel); solo usa `runtime.handlers` o `runtime.zotero` cuando `hostApi` no satisfaga tus necesidades.

## 1. buildRequest — Construir solicitud

Cuando la `request` declarativa en `workflow.json` no es suficiente para describir una solicitud compleja, usa `buildRequest` para construir dinámicamente el payload de la solicitud.

**Firma:**

```ts
function buildRequest({
  selectionContext,  // Contexto de selección filtrado
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Contexto de ejecución
}): unknown
```

**Relación con la solicitud declarativa:** `buildRequest` es mutuamente excluyente con el campo `request` en `workflow.json`. Si ambos existen, `buildRequest` tiene prioridad.

**Ejemplo: Solicitud pass-through**

```js
export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

**Ejemplo: Solicitud de secuencia de múltiples pasos**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const sourcePath = resolveAttachmentPath(selectionContext, runtime);
  const language = executionOptions?.workflowParams?.language || "en-US";

  return {
    kind: "skillrunner.sequence.v1",
    sequence: {
      steps: [
        {
          id: "step1",
          skill_id: "my-analysis-skill",
          mode: "auto",
          workspace: "new",
          parameter: { language, source_path: sourcePath },
        },
        {
          id: "step2",
          skill_id: "my-enrichment-skill",
          mode: "auto",
          workspace: "reuse-workflow",
          handoff: {
            bindings: [
              {
                kind: "value",
                source: "output_field_name",
                target: "/input/field_name",
                step: "step1",
              },
            ],
          },
        },
      ],
    },
  };
}
```

## 2. normalizeSettings — Normalizar parámetros

Normaliza los parámetros antes de que se persistan las configuraciones o antes de la ejecución.

**Firma:** Este Hook recibe diferentes parámetros dependiendo de la fase:

```ts
function normalizeSettings(args: {
  // fase persisted: cuando los parámetros se guardan en las preferencias
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  // fase execution: antes de la ejecución
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**Casos de uso:**

- Validación cruzada entre parámetros (p. ej., cuando la opción A se establece en un valor determinado, el valor por defecto de la opción B debería cambiar)
- Manejo de downgrade de parámetros (p. ej., migrar parámetros antiguos a nuevas versiones)
- Limpiar valores inválidos antes de la ejecución

## 3. applyResult — Manejar resultado (requerido)

Este es el **único Hook requerido** para un workflow, responsable de escribir los resultados de ejecución del backend en Zotero.

**Firma:**

```ts
function applyResult({
  parent,           // Elemento padre de Zotero
  bundleReader,     // Lector de bundle de resultados
  resultContext,    // Contexto de resultado estructurado
  sequenceStep,     // Metadatos del paso de secuencia (presente en ejecuciones de secuencia)
  productStorage,   // API de almacenamiento de artefactos
  request,          // Solicitud original enviada
  runResult,        // Metadatos del resultado de ejecución
  manifest,         // workflow.json
  runtime,          // Contexto de ejecución
}): unknown

// Forma de sequenceStep:
// {
//   id: string;           // ID del paso
//   index: number;        // Índice basado en cero en la secuencia
//   workflowId: string;   // ID del sub-workflow para este paso
//   skillId: string;      // ID del skill ejecutado en este paso
//   finalStep: boolean;   // Si este es el paso final
//   phase: "sequence-step";
// }
```

**Uso de bundleReader:**

```js
// Leer archivos en el bundle ZIP de artefactos
const digestMd = await bundleReader.readText("artifacts/digest.md");

// Obtener la ruta al directorio de artefactos extraídos
const extractedDir = await bundleReader.getExtractedDir();
```

**Ejemplo: Escribir notas desde un bundle**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const parentItem = runtime.helpers.resolveItemRef(parent);
  const digestMd = await bundleReader.readText("artifacts/digest.md");

  const htmlContent = runtime.helpers.toHtmlNote("Paper Digest", digestMd);
  const newNote = await runtime.hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  return { applied: true, noteId: newNote.id };
}
```

**Ejemplo: Extraer archivos de un bundle al disco (estilo MinerU)**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const extractedDir = await bundleReader.getExtractedDir();
  const { file } = runtime.hostApi;

  const mdContent = await bundleReader.readText("full.md");
  const targetPath = `/path/to/output.md`;
  await file.writeText(targetPath, mdContent);

  return { applied: true, output_path: targetPath };
}
```

## Funciones auxiliares de Hook (helpers)

`runtime.helpers` proporciona un conjunto de funciones auxiliares:

| Función | Descripción |
|---------|-------------|
| `getAttachmentParentId(entry)` | Obtener el ID del elemento padre de un adjunto |
| `getAttachmentFilePath(entry)` | Obtener la ruta local del archivo de un adjunto |
| `getAttachmentFileName(entry)` | Obtener el nombre de archivo del adjunto |
| `getAttachmentFileStem(entry)` | Obtener el nombre de archivo del adjunto (sin extensión) |
| `getAttachmentDateAdded(entry)` | Obtener la marca de tiempo `dateAdded` del adjunto |
| `basenameOrFallback(path, fallback)` | Extraer el nombre base o devolver una cadena alternativa |
| `isMarkdownAttachment(entry)` | Comprobar si es un adjunto Markdown |
| `isPdfAttachment(entry)` | Comprobar si es un adjunto PDF |
| `pickEarliestPdfAttachment(entries)` | Seleccionar el PDF más antiguo de una lista de adjuntos |
| `cloneSelectionContext(ctx)` | Copia profunda del contexto de selección |
| `withFilteredAttachments(ctx, items)` | Mantener solo los adjuntos especificados en el contexto |
| `resolveItemRef(ref)` | Resolver una referencia de elemento a un Zotero.Item |
| `toHtmlNote(title, body)` | Convertir Markdown a contenido de nota HTML |
| `normalizeReferenceAuthors(value)` | Normalizar la lista de autores de referencia |
| `normalizeReferenceEntry(entry, index)` | Normalizar una sola entrada de referencia |
| `normalizeReferencesArray(value)` | Normalizar un array de referencias |
| `normalizeReferencesPayload(payload)` | Normalizar un objeto de payload de referencias |
| `replacePayloadReferences(payload, refs)` | Reemplazar referencias en un payload |
| `resolveReferenceSource(entry)` | Resolver el campo source de una referencia |
| `renderReferenceLocator(entry)` | Renderizar la cadena localizadora de volumen/número/páginas |
| `renderReferencesTable(references)` | Renderizar referencias como una tabla HTML |

## Próximos pasos

- [Contexto de selección](selection-context) — Estructura detallada de selectionContext
- [Referencia de la API del host](host-api) — Referencia completa de la API
- [Empaquetado y despliegue](packaging) — Cómo empaquetar y desplegar workflows
