# Hook System

Hooks are the extensibility points of a workflow — at different stages of workflow execution, the plugin's Workflow Runtime calls the corresponding Hook scripts, allowing you to intervene in and control the execution flow with JavaScript.

A workflow can contain up to **3 Hooks**, of which `applyResult` is the only required one.

> **Note on input filtering:** The old `filterInputs` hook has been replaced by the declarative `validateSelection` mechanism. Use `validateSelection` in `workflow.json` to define input constraints without writing JavaScript. See [Manifest File Authoring](#doc/workflows%2Fcustom%2Fmanifest#selection-validation) for details.

## Hook Script Structure

Each Hook script is an `.mjs` (ES Module) file that exports named functions:

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, manifest, executionOptions, runtime }) {
  // Implementation logic
  return requestSpec;
}
```

## Runtime Context (runtime)

All Hooks receive a `runtime` parameter that provides direct access to Zotero and various tools.

```js
runtime = {
  zotero,           // Zotero global object
  handlers,         // Low-level data processing handlers
  hostApi,          // High-level Host API (recommended)
  helpers,          // Hook auxiliary utility functions
  addon,            // Plugin configuration

  workflowId,       // Current workflow ID
  workflowRootDir,  // Absolute path of the directory containing workflow.json
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // Owning package ID (only available within workflow packages)
  packageRootDir,   // Absolute path of the package root directory

  hostApiVersion,   // Host API version number
  hookName,         // Current hook name: "buildRequest" | "applyResult" | ""
  debugMode,        // Whether in debug mode

  fetch,            // Global fetch (if available)
  Buffer,           // Node.js Buffer (if available)
  btoa,             // Base64 encode (if available)
  atob,             // Base64 decode (if available)
  TextEncoder,      // Text encoder (if available)
  TextDecoder,      // Text decoder (if available)
  FileReader,       // File reader (if available)
  navigator,        // Navigator object (if available)
}
```

**Best Practice:** Prefer `runtime.hostApi` (high-level API); only use `runtime.handlers` or `runtime.zotero` when `hostApi` does not meet your needs.

## 1. buildRequest — Build Request

When the declarative `request` in `workflow.json` is insufficient to describe a complex request, use `buildRequest` to dynamically construct the request payload.

**Signature:**

```ts
function buildRequest({
  selectionContext,  // Filtered selection context
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Runtime context
}): unknown
```

**Relationship with Declarative Request:** `buildRequest` is mutually exclusive with the `request` field in `workflow.json`. If both exist, `buildRequest` takes priority.

**Example: Pass-through Request**

```js
export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

**Example: Multi-step Sequence Request**

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

## 2. normalizeSettings — Normalize Parameters

Normalize parameters before settings are persisted or before execution.

**Signature:** This Hook receives different parameters depending on the phase:

```ts
function normalizeSettings(args: {
  // persisted phase: when parameters are saved to preferences
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  // execution phase: before execution
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**Use Cases:**

- Cross-validation between parameters (e.g., when option A is set to a certain value, the default for option B should change)
- Parameter downgrade handling (e.g., migrating old parameters to new versions)
- Clean up invalid values before execution

## 3. applyResult — Handle Result (Required)

This is the **only required Hook** for a workflow, responsible for writing the backend's execution results into Zotero.

**Signature:**

```ts
function applyResult({
  parent,           // Parent Zotero item
  bundleReader,     // Result bundle reader
  resultContext,    // Structured result context
  sequenceStep,     // Sequence step metadata (present in sequence runs)
  productStorage,   // Artifact storage API
  request,          // Original request sent
  runResult,        // Run result metadata
  manifest,         // workflow.json
  runtime,          // Runtime context
}): unknown

// sequenceStep shape:
// {
//   id: string;           // Step ID
//   index: number;        // Zero-based index in the sequence
//   workflowId: string;   // Sub-workflow ID for this step
//   skillId: string;      // Skill ID executed in this step
//   finalStep: boolean;   // Whether this is the final step
//   phase: "sequence-step";
// }
```

**Using bundleReader:**

```js
// Read files in the artifact ZIP bundle
const digestMd = await bundleReader.readText("artifacts/digest.md");

// Get the path to the extracted artifact directory
const extractedDir = await bundleReader.getExtractedDir();
```

**Example: Write notes from a bundle**

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

**Example: Extract files from a bundle to disk (MinerU-style)**

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

## Hook Helper Functions (helpers)

`runtime.helpers` provides a set of auxiliary functions:

| Function | Description |
|----------|-------------|
| `getAttachmentParentId(entry)` | Get the parent item ID of an attachment |
| `getAttachmentFilePath(entry)` | Get the local file path of an attachment |
| `getAttachmentFileName(entry)` | Get the attachment filename |
| `getAttachmentFileStem(entry)` | Get the attachment filename (without extension) |
| `getAttachmentDateAdded(entry)` | Get the attachment's `dateAdded` timestamp |
| `basenameOrFallback(path, fallback)` | Extract basename or return a fallback string |
| `isMarkdownAttachment(entry)` | Check if it is a Markdown attachment |
| `isPdfAttachment(entry)` | Check if it is a PDF attachment |
| `pickEarliestPdfAttachment(entries)` | Select the earliest PDF from an attachment list |
| `cloneSelectionContext(ctx)` | Deep copy the selection context |
| `withFilteredAttachments(ctx, items)` | Keep only the specified attachments in the context |
| `resolveItemRef(ref)` | Resolve an item reference to a Zotero.Item |
| `toHtmlNote(title, body)` | Convert Markdown to HTML note content |
| `normalizeReferenceAuthors(value)` | Normalize the reference author list |
| `normalizeReferenceEntry(entry, index)` | Normalize a single reference entry |
| `normalizeReferencesArray(value)` | Normalize an array of references |
| `normalizeReferencesPayload(payload)` | Normalize a references payload object |
| `replacePayloadReferences(payload, refs)` | Replace references in a payload |
| `resolveReferenceSource(entry)` | Resolve the source field of a reference |
| `renderReferenceLocator(entry)` | Render volume/issue/pages locator string |
| `renderReferencesTable(references)` | Render references as an HTML table |

## Next Steps

- [Selection Context](#doc/workflows%2Fcustom%2Fselection-context) — Detailed structure of selectionContext
- [Host API Reference](#doc/workflows%2Fcustom%2Fhost-api) — Complete API reference
- [Packaging & Deployment](#doc/workflows%2Fcustom%2Fpackaging) — How to package and deploy workflows
