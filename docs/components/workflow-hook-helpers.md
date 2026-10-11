# Workflow Hook Runtime API Reference

This document describes the current hook runtime boundary. The complete
Workflow Host API v12 identity is owned by
`src/workflows/workflowHostContract.ts`; protocol and package rules are in
`docs/components/workflows.md`.

Hooks receive the closed `runtime.hostApi` projection and declared execution
context. They do not receive `runtime.helpers`, `runtime.handlers`,
`runtime.zotero`, `IOUtils`, `Components`, or the addon object. Reusable pure
functions belong in package-local modules and are imported with relative paths.

## Editor Sessions

`runtime.hostApi.editor.openSession(input)` is the only hook-facing editor
entry point. The Workflow editor owner keeps renderer registration and global
bridge details private. Sessions are queued, opened one at a time, and return
`saved: false` when the user cancels or closes the editor.

## Files, Archives, Resources, and Attachments

`runtime.hostApi.file` exposes the exact v12 file group: `readText`,
`writeText`, `readBytes`, `writeBytes`, `copy`, `exists`, `makeDirectory`,
`materializeWorkflowInputFile`, `getTempDirectoryPath`, `pickDirectory`,
`pickFile`, `pickSaveFile`, `pickFiles`, `stat`, `list`, `move`, and `remove`.
All filesystem adapter selection is late-bound by
`src/modules/runtimePersistence.ts`.

Archive access uses `archive.measureEntries`, `archive.writeZipAtomic`, and
callback-scoped `archive.withExtractedZip`. Opaque workflow input/output files
use the `resources` group. File attachments are created through
`attachments.create` as stored files, and URL
attachments may use `linked_url`. Creation of `linked_file` attachments is
unsupported. Stored-file companions are validated and staged before the
Zotero attachment is created, and post-create failures trigger best-effort
rollback. Note images use `images.prepareForNoteEmbedding`, which returns an
opaque run-scoped prepared-image reference; note payloads have their own note
mutation path. `docs/components/attachment-file-lifecycle.md` documents
shared ownership and workflow replacement behavior.

## Library Enumeration

`hostApi.library.listItems` and `hostApi.library.traverseItems` accept the
optional string `filter` for deterministic literal enumeration. It is matched
independently against title, creator, date, publication, abstract, tag, or item
key under Zotero SQLite `NOCASE` semantics; `%`, `_`, and backslash are literal
characters. Omitted, empty, or whitespace-only filters add no text predicate.
Listing and traversal retain stable item-identity order and the existing
opaque-cursor contract; consumers that need the full matching set must follow
every continuation through completion. Pass `WorkflowCallControl` with the
call, and stop work when its signal is canceled.

This enumeration filter is distinct from the `library.search_items` `query`
input used by Host Bridge. Workflow hooks use the explicit
`hostApi.library.searchItems({ query, ...scope, sourceKinds? }, control?)`
projection, which returns `SynthesisSearchResult<LibraryItemSearchHit>` with
source-aware matches, coverage, structured issues, and opaque continuation.
Search follows lexical relevance and the shared C2 result contract; it does not
change list ordering or snapshot membership. If the Broker search owner is
unavailable, the result has `status: "unavailable"`, a `source_unavailable`
issue and `total: null`; hooks must inspect status before consuming results.
An empty completed search has `status: "completed"` and `total: 0`.
Synthesis reverse-host metadata
page reads accept no filter or search query.

## Runtime Context Fields

Hook receives `runtime` with these fields:

| Field                | Type                                                   | Description                                                                                                                           |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `hostApi`            | `WorkflowHostApiV12`                                   | Exact 24-top-level/22-module/96-callable host projection                                                                               |
| `hostApiVersion`     | `12`                                                   | Exact API version                                                                                                                     |
| `invocationMode`     | `"interactive" \| "non-interactive"`                   | Current invocation mode                                                                                                               |
| `debugMode`          | `boolean \| undefined`                                 | Debug mode flag                                                                                                                       |
| `workflowId`         | `string \| undefined`                                  | Current workflow ID                                                                                                                   |
| `packageId`          | `string \| undefined`                                  | Package ID (workflow packages only)                                                                                                   |
| `workflowRootDir`    | `string \| undefined`                                  | Workflow root directory path                                                                                                          |
| `packageRootDir`     | `string \| undefined`                                  | Package root directory path (workflow packages only)                                                                                  |
| `workflowSourceKind` | `”builtin” \| “user” \| “”`                            | Source location type                                                                                                                  |
| `hookName`           | `"preflight" \| "buildRequest" \| "applyResult" \| ""` | Current hook name                                                                                                                     |
| `locale`             | `string \| undefined`                                  | Resolved display locale                                                                                                               |
| `signal`             | `CancellationSignal \| undefined`                      | Read-only per-hook-run signal for cooperative Workflow Host cancellation; aborts when the run ends or an upstream caller signal fires |
| `fetch`              | `typeof fetch \| null`                                 | Fetch API (if available)                                                                                                              |
| `Buffer`             | `typeof Buffer \| null`                                | Node Buffer (if available)                                                                                                            |
| `btoa`               | `typeof btoa \| null`                                  | Base64 encode (if available)                                                                                                          |
| `atob`               | `typeof atob \| null`                                  | Base64 decode (if available)                                                                                                          |
| `TextEncoder`        | `typeof TextEncoder \| null`                           | Text encoder (if available)                                                                                                           |
| `TextDecoder`        | `typeof TextDecoder \| null`                           | Text decoder (if available)                                                                                                           |
| `FileReader`         | `typeof globalThis.FileReader \| null`                 | FileReader API (if available)                                                                                                         |

`runtime.signal` is a runtime-owned, host-independent `CancellationSignal`.
It exposes only `aborted`, `addEventListener("abort", ...)`, and
`removeEventListener("abort", ...)` for cooperative Workflow Host
cancellation. It does not promise `reason`, `onabort`, `throwIfAborted()`, or
`dispatchEvent()`, and it is not guaranteed to be usable as a native `fetch`
signal. A caller-supplied native `AbortSignal` remains structurally compatible
where an upstream or `WorkflowCallControl` signal is accepted.

## Maintenance Checklist

- If `WorkflowRuntimeContext` or `WorkflowHostApiV12` changes in
  `src/workflows/types.ts`, update this document in the same change.
- If the code-native manifest changes, keep the 24/22/94 metrics and group list
  synchronized here and in `docs/components/workflows.md`.
