# Workflow Hook Runtime API Reference

This document describes the current hook runtime boundary. The complete
Workflow Host API v12 identity is owned by
`src/workflows/workflowHostContract.ts`; protocol and package rules are in
`doc/components/workflows.md`.

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
use the `resources` group. Stored or linked attachments are created through
`attachments.create`; stored-file companions are validated and staged before
the Zotero attachment is created, and post-create failures trigger best-effort
rollback. Note images use `images.prepareForNoteEmbedding`, which returns an
opaque run-scoped prepared-image reference.

## Runtime Context Fields

Hook receives `runtime` with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `hostApi` | `WorkflowHostApiV12` | Exact 23-top-level/21-module/87-callable host projection |
| `hostApiVersion` | `12` | Exact API version |
| `invocationMode` | `"interactive" \| "non-interactive"` | Current invocation mode |
| `debugMode` | `boolean \| undefined` | Debug mode flag |
| `workflowId` | `string \| undefined` | Current workflow ID |
| `packageId` | `string \| undefined` | Package ID (workflow packages only) |
| `workflowRootDir` | `string \| undefined` | Workflow root directory path |
| `packageRootDir` | `string \| undefined` | Package root directory path (workflow packages only) |
| `workflowSourceKind` | `”builtin” \| “user” \| “”` | Source location type |
| `hookName` | `"preflight" \| "buildRequest" \| "applyResult" \| ""` | Current hook name |
| `locale` | `string \| undefined` | Resolved display locale |
| `signal` | `AbortSignal \| undefined` | Read-only per-hook-run execution signal; aborts when the run ends or an upstream caller signal fires |
| `fetch` | `typeof fetch \| null` | Fetch API (if available) |
| `Buffer` | `typeof Buffer \| null` | Node Buffer (if available) |
| `btoa` | `typeof btoa \| null` | Base64 encode (if available) |
| `atob` | `typeof atob \| null` | Base64 decode (if available) |
| `TextEncoder` | `typeof TextEncoder \| null` | Text encoder (if available) |
| `TextDecoder` | `typeof TextDecoder \| null` | Text decoder (if available) |
| `FileReader` | `typeof globalThis.FileReader \| null` | FileReader API (if available) |

## Maintenance Checklist

- If `WorkflowRuntimeContext` or `WorkflowHostApiV12` changes in
  `src/workflows/types.ts`, update this document in the same change.
- If the code-native manifest changes, keep the 23/21/87 metrics and group list
  synchronized here and in `doc/components/workflows.md`.
