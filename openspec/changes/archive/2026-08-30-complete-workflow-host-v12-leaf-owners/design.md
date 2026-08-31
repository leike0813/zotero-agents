## Context

See `proposal.md` for motivation. The completed v12 vertical slices own contract foundations, runtime adaptation, library reads/snapshots, mutations/notes/attachments, research product I/O, and Synthesis. The frozen exact manifest also contains eight smaller modules that those slices did not fully implement. Some have mature internal behavior but the wrong public shape (`images`, `editor`, `notifications`, `logging`, `addon`); others have useful primitives without a named owner (`bibliography`) or no owner at all (`environment`, `clipboard`).

The active production surface remains v11 throughout this change. New owner interfaces are staged and tested directly, while existing v11 adapters continue to work until `harden-workflow-host-api-v12` migrates consumers and performs the atomic projection cutover. The architecture record at [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md) remains authoritative when abbreviated artifact wording differs.

## Goals / Non-Goals

**Goals:**

- Give every frozen leaf member one implementation-ready owner with a complete input, result, error, bound, variant, and cleanup contract.
- Reuse existing conversion, translator, editor, notification, and runtime-log machinery behind deeper interfaces rather than duplicating behavior.
- Make run/caller identity an explicit trusted dependency for prepared images, editor concurrency, toast limits, and logging.
- Preserve v11 behavior during staging and give the activation change a mechanical explicit-projection step.

**Non-Goals:**

- Changing `WORKFLOW_HOST_API_VERSION`, the active v11 shape, the exact 23/21/87 manifest, runtime/loader injection, built-in package guards, or official workflow consumers.
- Reopening owners completed by changes 03–07, adding Host Bridge/MCP exposure, or deleting any legacy public member.
- Adding durable prepared-image storage, cross-run refs, generic clipboard MIME support, a bibliography file writer, a renderer plugin registry, UI handles, or a second log store.

## Decisions

### Leaf owners expose narrow interfaces and receive trusted scope separately

Each owner factory receives only the dependencies it needs. Workflow run or caller scope is passed by trusted composition, not accepted inside portable DTOs. `hostApi.ts` remains an explicit composition root and compatibility adapter; it does not own registries, bounds, native translation, runtime-global selection, UI queues, or sanitization.

A single generic “leaf capability service” was rejected. Its interface would mix unrelated lifetimes and dependencies, make fail-closed test doubles difficult, and recreate a shallow composition layer with no domain depth.

### Prepared images deepen the existing conversion owner

The existing note-image conversion pipeline remains the sole resize/encode policy. It gains portable source normalization, immutable prepared records, per-run byte accounting, opaque unguessable refs, digest metadata, lookup for note operations, and idempotent terminal cleanup. File reads remain late-bound through `runtimePersistence`; managed resource reads use the resources owner; base64 is size-checked before decode.

The registry is process-local and workflow-run scoped. It does not persist temp paths or refs and exposes no release operation. A note operation borrows immutable prepared content through a trusted resolver; attachment creation and mutation receipts remain in the notes/mutation owner. This avoids moving mutation authority into image conversion or duplicating prepared bytes in caller DTOs.

### Bibliography wraps the existing native translator seam behind a stable registry

The current Zotero text exporter is retained as the native execution primitive. A bibliography owner adds the only stable format registry, availability resolution, per-format option schema, portable-item resolution, ordered caller-declared selection, complete-output limits, cancellation checks, and stable issue/error mapping. Research Bundle consumes this interface but continues to own filenames and bundle manifests.

Stable refs are code-owned semantic identities; native translator UUIDs and optional-extension globals stay private. The owner never writes a file or archive. Automatic fallback outside the caller's preference list was rejected because it would hide output-format changes.

### Runtime identity and UI adapters are late-bound and fail closed

Addon identity is assembled from trusted addon metadata. Environment reads current runtime facts on every call and reuses the existing platform and locale normalization seams. Clipboard operations use an injected adapter selected per call; Node tests receive an in-memory adapter. Interactive and non-interactive shapes are identical, with deny adapters returning stable `interaction_required` failures.

Editor sessions own inline renderers, actions, timers, and DOM references. Existing sequential execution is retained, while concurrency becomes caller-scoped and public renderer registration is removed from the staged contract. Notification projection validates a portable request before using the existing feedback/Notification Hub owner and tracks only caller-owned visible toasts. Neither adapter returns native UI objects.

### Workflow logging is an adapter over the existing runtime log pipeline

The workflow logging owner validates the small caller DTO, attaches trusted execution identity, sanitizes, then appends through the current runtime log manager. It does not create another log model, buffer, persistence path, or retention policy. Test-only performance and leak probes move behind the existing internal harness boundary rather than remaining callable members.

### Staging conformance forbids premature activation

Focused tests exercise owner interfaces and both interaction variants while a governance assertion continues to require the active v11 version and shape. V11 adapters may normalize legacy inputs into owners, but owner contracts never accept raw Zotero objects, Blob/typed-array image sources, native translator identities, renderer ids, UI handles, or caller-supplied log identity.

## Risks / Trade-offs

- [Prepared bytes outlive a failed workflow path] → Register cleanup with the workflow terminal lifecycle at admission time and make cleanup idempotent; test success, failure, cancellation, and repeated cleanup.
- [Per-run accounting copies large buffers] → Store one immutable prepared record per ref and lend it only through the trusted note seam; enforce encoded, decoded, result, and aggregate limits before admission.
- [Bibliography availability changes between list and render] → Treat `listFormats` as observation only and resolve availability again during render; report the actual selected format.
- [Legacy adapters become a compatibility layer inside owners] → Keep legacy normalization outside owner interfaces and delete it only in the activation change.
- [UI limits interfere with existing lifecycle notifications] → Scope the five-toast limit to workflow-callable toasts and preserve the existing lifecycle-toast owner and Notification Hub behavior.
- [Eight leaves create many shallow files] → Deepen existing owners where they already own semantics; create a module only for a missing independent lifecycle or native policy.

## Migration Plan

1. Add failing interface tests for exact DTOs, bounds, ref/run scope, cancellation, variants, trusted identity, and v11 non-activation.
2. Deepen prepared-image conversion and lifecycle, then bind note operations to opaque refs without changing public v11 callers.
3. Establish the bibliography owner over the existing exporter and migrate internal Research Bundle rendering to consume it.
4. Implement addon/environment and clipboard owners with late binding and deny adapters.
5. Refactor editor, notifications, and workflow logging around their existing deep modules and migrate only internal staging adapters.
6. Run focused owner suites, type/lint/build gates, strict OpenSpec validation, and verify the production identity is still v11.

Rollback removes the staged owner projections and restores their direct internal callers together. No persisted data, public version, or package compatibility identity changes, so rollback requires no data migration.
