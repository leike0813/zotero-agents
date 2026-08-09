## Context

The existing workflow submit contract accepts selection and workflow options, while workflow hooks can still reach GUI file-selection APIs. Host Bridge already owns opaque upload and download file handles, but those handles are not connected to workflow preparation, queue persistence, or workflow results.

## Goals / Non-Goals

**Goals:**

- Define one transport-neutral resource contract for workflow manifests, validation, submission, runtime execution, and results.
- Reuse broker-issued upload/download handles for local CLI and remote clients.
- Keep Host-local paths private and prevent non-interactive runs from opening GUI surfaces.
- Preserve GUI behavior by adapting interactive selection into the same runtime resource view.
- Make queued and retried submissions safe through explicit input leases and run-scoped output artifacts.

**Non-Goals:**

- Replacing the existing file upload/download transport or changing its authentication model.
- Supporting arbitrary client-supplied Host paths.
- Adding chunked upload, a new remote storage backend, or a general-purpose filesystem API.
- Removing GUI picker APIs for workflows that remain interactive-only.
- Persisting transfer handles, resource leases, output descriptors, or pending workflow submissions across Host Bridge restarts.

## Decisions

### Resource slots are manifest data, bindings are invocation data

Manifests declare `resourceRequirements` with stable slot ids, direction, file/archive kind, cardinality, requiredness, and acceptance constraints. Calls provide `resourceBindings` whose input values contain opaque `fileId` handles and whose output values select `bridge-download` delivery. This separates workflow capability discovery from transport-specific handles.

### Archive is the external representation of a directory

Remote directory inputs must be uploaded as an archive, and directory-like outputs must be packaged by Host before registration. This keeps the wire shape file-based and avoids exposing directory paths or inventing a second transfer protocol.

### Submission-level leases own input lifetime

Validation only checks handles. Accepted submission commits atomically to a process-scoped lease over all referenced inputs; the queue stores file ids and lease identity, not resolved paths. One lease can serve every prepared unit in the submission. Completion, failure, cancellation, and expiry release the lease. An idempotent retry in the same process reuses the same lease; another submission cannot acquire an active lease. Restart invalidates the transfer registry, leases, output descriptors, and pending submission projection instead of replaying workflow work.

### Runtime resources are mediated by a Host API

Workflow hooks receive an immutable resource view for the current unit. Inputs resolve only inside Host-managed temporary storage. Outputs are allocated and finalized through the resource API, which verifies that finalized files are within the run-scoped output root before registering artifacts.

### Non-interactive eligibility is explicit

Host Bridge discovery exposes only workflows that declare non-interactive support in its runnable projection. Submit and validate re-check the declaration and return a structured error before approval or queue admission when it is absent. GUI-only workflows remain available through GUI triggers.

### GUI and remote calls share the workflow hook path

The GUI adapter uses existing picker/save dialogs and converts the result into an internal binding. Remote calls use bridge handles. The workflow hook consumes `hostApi.resources`, so business logic does not branch on transport or call picker APIs directly.

### Existing download descriptors remain the result contract

Workflow outputs are registered through the current file registry and returned with the existing descriptor and integrity fields. Clients download them through `file download`; no output path is accepted or returned by workflow control.

## Risks / Trade-offs

- [Risk] A queued submission can outlive the normal upload TTL. -> The process-scoped submission lease pins every input until terminal cleanup; after restart the caller re-uploads and revalidates instead of relying on stale transfer or queue handles.
- [Risk] A workflow may still call a picker after declaring non-interactive support. -> The non-interactive Host API rejects picker/editor calls deterministically and tests assert no GUI invocation.
- [Risk] Large directories may exceed the existing upload limit. -> Remote callers archive directories and receive the current size-limit error; chunked transfer remains a separate change.
- [Risk] Output finalization could leak a Host path or accept an arbitrary path. -> The output API accepts only run-scoped managed locations and result sanitization removes local path data.

## Migration Plan

1. Add the new contract and runtime resource seam behind existing workflow control.
2. Migrate built-in literature bundle and notes import/export manifests and hooks.
3. Update CLI command contracts and generated agent-facing surfaces from their source definitions.
4. Run targeted TypeScript/Rust/spec and semantic-surface gates.

The change is additive for GUI execution. A workflow that does not declare non-interactive support is rejected by Host Bridge discovery/submit rather than opening a GUI. No release dispatch or generated-target hand edit is required.
