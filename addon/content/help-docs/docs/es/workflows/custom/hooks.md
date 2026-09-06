# Sistema de Hooks

Los hooks son los puntos de extensibilidad de un workflow — en diferentes etapas de la ejecución del workflow, el Workflow Runtime del plugin llama a los scripts de Hook correspondientes, permitiéndote intervenir y controlar el flujo de ejecución con JavaScript.

Un workflow puede contener hasta **4 Hooks**, de los cuales `applyResult` es el único obligatorio.

> **Nota sobre el filtrado de entrada:** El antiguo hook `filterInputs` ha sido reemplazado por el mecanismo declarativo `validateSelection`. Usa `validateSelection` en `workflow.json` para definir restricciones de entrada sin escribir JavaScript. Consulta [Redacción del archivo de manifiesto](#doc/workflows%2Fcustom%2Fmanifest#selection-validation) para más detalles.

## Estructura del script de Hook

Cada script de Hook es un archivo `.mjs` (módulo ES) que exporta funciones nombradas:

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, preflight, manifest, executionOptions, runtime }) {
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
  hookName,         // Nombre del hook actual: "preflight" | "buildRequest" | "applyResult" | ""
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
  preflight,         // Plan/unidad/contexto opcional de preflight
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Contexto de ejecución
}): unknown
```

**Relación con la solicitud declarativa:** `buildRequest` es mutuamente excluyente con el campo `request` en `workflow.json`. Si ambos existen, `buildRequest` tiene prioridad.

Cuando un workflow declara `hooks.preflight`, el runtime pasa el contexto de preflight normalizado a `buildRequest` como `preflight`. Este contexto no se fusiona dentro de `selectionContext`; trátalo como metadatos de planificación de ejecución independientes.

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

**Ejemplo: Solicitud usando el contexto de unidad de preflight**

```js
export async function buildRequest({ selectionContext, preflight, runtime }) {
  const selected = selectionContext.items.find((item) => item.kind === "attachment");
  if (!selected) throw new Error("Source attachment is required");
  const detail = await runtime.hostApi.library.getItemDetail(selected.ref);
  if (detail.kind !== "attachment" || detail.item.file.state !== "available") {
    throw new Error("Source attachment file is unavailable");
  }
  return {
    kind: "generic-http.steps.v1",
    file: {
      path: detail.item.file.path,
      page_ranges: preflight?.unit?.context?.page_ranges,
    },
  };
}
```

**Ejemplo: Solicitud de secuencia de múltiples pasos**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const selected = selectionContext.items.find((item) => item.kind === "attachment");
  if (!selected) throw new Error("Source attachment is required");
  const detail = await runtime.hostApi.library.getItemDetail(selected.ref);
  if (detail.kind !== "attachment" || detail.item.file.state !== "available") {
    throw new Error("Source attachment file is unavailable");
  }
  const sourcePath = detail.item.file.path;
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

## 2. preflight — Planificar o cortocircuitar la ejecución

`preflight` se ejecuta después de la resolución declarativa de la selección y antes de `buildRequest` o la construcción declarativa de la solicitud. Úsalo para decisiones locales ligeras que necesitan la unidad de entrada resuelta pero no deben formar parte de la habilitación del menú.

`preflight` no debe escribir datos de Zotero, no debe construir solicitudes del proveedor y no debe reemplazar `validateSelection`. Todas las escrituras de Zotero siguen perteneciendo a `applyResult`, y todos los payloads de solicitudes del proveedor siguen perteneciendo a `buildRequest` o al campo `request` del manifiesto.

**Firma:**

```ts
function preflight({
  selectionContext,  // Contexto de unidad de entrada resuelto
  parent,            // Elemento padre de la unidad actual, si está disponible
  attachment,        // Elemento adjunto de la unidad actual, si está disponible
  note,              // Elemento nota de la unidad actual, si está disponible
  manifest,          // workflow.json
  executionOptions,  // { workflowParams, providerOptions }
  runtime,           // Contexto de ejecución
}): PreflightOutcome
```

**Resultado: Continuar**

Continúa con la construcción normal de la solicitud y opcionalmente adjunta contexto de planificación:

```js
export async function preflight({ parent }) {
  return {
    kind: "continue",
    context: {
      doi: parent?.DOI || "",
      source: "selected-parent",
    },
  };
}
```

`context` está disponible como `preflight.context` en `buildRequest` y como `resultContext.preflight.context` en `applyResult`.

**Resultado: Omitir**

Omite solo la unidad de entrada actual:

```js
export function preflight({ parent }) {
  if (!parent?.DOI) {
    return { kind: "skip", reason: "missing DOI" };
  }
  return { kind: "continue" };
}
```

Si cada unidad de entrada es omitida, la ejecución termina sin enviar trabajos al proveedor.

**Resultado: Cortocircuitar a Apply**

Omite la ejecución del proveedor y llama directamente a la ruta estándar de `applyResult`:

```js
export async function preflight({ parent, runtime }) {
  const metadata = await lookupMetadataLocally(parent?.DOI, runtime);
  if (!metadata) {
    return { kind: "continue" };
  }
  return {
    kind: "short-circuit-apply",
    apply: {
      result: { ok: true, source: "local-metadata", item: metadata },
      request: { kind: "local.metadata.preflight.v1" },
      runResult: { status: "success" },
    },
    context: { source: "local-metadata" },
  };
}
```

Esto es útil para workflows como un curador de metadatos: si una búsqueda de identificador confiable tiene éxito localmente, `applyResult` puede actualizar el elemento padre sin llamar a un backend. Si la búsqueda falla o es de baja calidad, devuelve `continue` y deja que `buildRequest` construya la solicitud normal al backend.

**Resultado: Reemplazar unidades**

Reemplaza una unidad de entrada resuelta con múltiples unidades de solicitud virtuales:

```js
export function preflight({ attachment }) {
  const chunks = [
    { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
    { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
  ];
  return {
    kind: "replace-units",
    units: chunks,
  };
}
```

Cada unidad virtual pasa por la ruta normal de `buildRequest`. El contexto específico de la unidad está disponible en `preflight.unit.context`.

**Apply único agregado**

Para workflows de entrada dividida que deben fusionar varios resultados del proveedor en una sola escritura final de Zotero, añade un plan agregado:

```js
export function preflight() {
  return {
    kind: "replace-units",
    units: [
      { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
      { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
    ],
    aggregate: {
      id: "pdf-pages",
      mode: "single-apply",
      applyWhen: "all-succeeded",
      orderBy: "unit.order",
    },
  };
}
```

En v1, el apply agregado solo admite `mode: "single-apply"`, `applyWhen: "all-succeeded"` y `orderBy: "unit.order"`. Los trabajos hijo del proveedor se recopilan y `applyResult` se llama una vez después de que todos los hijos tengan éxito. Si algún hijo falla, no se realiza ningún apply agregado parcial.

## 3. normalizeSettings — Normalizar parámetros

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

## 4. applyResult — Manejar resultado (requerido)

Este es el **único Hook requerido** para un workflow, responsable de escribir los resultados de ejecución del backend en Zotero.

**Firma:**

```ts
function applyResult({
  parent,           // Elemento padre de Zotero
  bundleReader,     // Lector de bundle de resultados
  resultContext,    // Contexto de resultado estructurado, incluyendo metadatos de preflight/aggregate
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

Cuando se declara `preflight`, `resultContext.preflight` expone el plan de ejecución, el id de unidad, el contexto de unidad y el contexto compartido para la llamada actual de apply. `selectionContext` no es mutado por preflight.

Cuando `replace-units` usa `aggregate.single-apply`, `resultContext.aggregate.children` contiene los resultados hijo ordenados:

```ts
resultContext.aggregate.children = [
  {
    unitId: "part-1",
    order: 0,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
  {
    unitId: "part-2",
    order: 1,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
];
```

Un `applyResult` agregado debe leer cada bundle hijo desde `child.bundleReader`, fusionar los artefactos en orden y escribir el resultado final en Zotero una sola vez. Por ejemplo, un workflow estilo MinerU puede enviar un PDF como varios trabajos de `page_ranges`, luego fusionar los archivos `full.md` y asignar espacio de nombres a las rutas de imágenes antes de crear un adjunto Markdown final.

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
| `basenameOrFallback(path, fallback)` | Extraer el nombre base o devolver una cadena alternativa |
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

- [Contexto de selección](#doc/workflows%2Fcustom%2Fselection-context) — Estructura detallada de selectionContext
- [Referencia de la API del host](#doc/workflows%2Fcustom%2Fhost-api) — Referencia completa de la API
- [Empaquetado y despliegue](#doc/workflows%2Fcustom%2Fpackaging) — Cómo empaquetar y desplegar workflows
