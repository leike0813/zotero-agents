# Design

## Context

See proposal.md. Native factory selection currently asks for `@mozilla.org/libjar/zip-writer;1`; installed Zotero 7.0.32, 9.0.6 and 10.0.2 use `@mozilla.org/zipwriter;1`. The fallback encoder expands bytes into number arrays. Existing `showWorkflowProgressToast` already updates a toolkit ProgressWindow, while the public notification owner has only a fire-and-forget toast. Leaf scope disposal currently releases prepared images alone.

## Goals / Non-Goals

- Preserve product schemas, missing-file policies, integrity validation, atomic output and run cancellation.
- Keep the new controller scoped to one hook/run and reuse the existing UI. No task-cancel button, new renderer or dependency.
- Integrate only literature export; do not change the separate research export or unrelated uncommitted note-payload work.

## Decisions

- Use the real native writer contract and enqueue/process entries asynchronously, awaiting each completion before reporting progress. Close and verify before replacing the destination. A Zotero runtime with missing native support fails unavailable; only Node uses the in-memory ZIP32 encoder.
- Keep ZIP32 encoding in its current module, precompute output size and use one typed byte buffer. Reject unrepresentable ZIP32 dimensions instead of silently truncating.
- Add `notifications.createProgress({text, progress?}) -> {update({text?, progress?}), close()}`. Validate finite 0..100 progress, share caller notification quotas, coalesce updates every 100 ms, and expose no native objects. UI absence returns an inert controller. Non-interactive invocation remains a typed interaction failure. Scope/window/plugin disposal and user dismissal are terminal for controllers.
- Add `WorkflowCallControl.onProgress` with `{phase, completed, total?, unit: 'items'|'bytes'}`. Materializer and archive emit actual observations through an exception-isolating helper. Existing explicit-control versus default-control semantics remain; package callers pass runtime signal alongside their observer.
- Remove the unused legacy snapshot integrity pass in the internal literature product builder. Preserve final integrity checks and verified materialized copies, without a global hash cache or broader materializer redesign.
- Package-local export stages own localized text and timing diagnostics. Best-effort UI does not change business results; existing workflow settlement remains the sole terminal notification owner.

## Risks / Trade-offs

- Native queue callbacks differ across Gecko versions: support both observed callback argument layouts and verify the three supported host lines.
- Cancellation must wait for an active native request to settle before cleanup; never close/delete an in-flight writer.
- Correct native selection and removal of one redundant checksum pass should reduce cost, but actual gains require an isolated workload comparison.
- Official content and plugin are separate delivery units: local validation must use the changed package with the changed Host API. No release is authorized.

## Migration Plan

No data migration or schema version change. Ship the additive v12 member and updated package together through existing delivery workflows. Retain the active OpenSpec record and verification evidence; do not publish or commit in this task.
