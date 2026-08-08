## Why

Host Bridge workflow submit currently exposes no general way to provide files to a workflow. Workflows that call the GUI file-selection APIs therefore open Zotero's picker when started from the CLI, which blocks non-interactive execution and prevents remote clients from supplying or receiving workflow files.

The workflow contract needs a transport-neutral resource model so local GUI calls, CLI calls, and remote calls can execute the same workflow path while reusing Host Bridge's existing opaque file upload and download handles.

## What Changes

- Add manifest-declared workflow resource requirements for external input and output slots.
- Add a versioned `resourceBindings` payload for workflow validation and submission.
- Accept uploaded opaque `fileId` handles as non-interactive inputs; never accept client paths in workflow requests.
- Register workflow outputs as Host Bridge download artifacts and return their descriptors in workflow results.
- Add process-scoped submission leases for uploaded inputs so queued, retried, multi-unit, and cancelled submissions retain correct file lifetime without persisting transfer handles across Host Bridge restarts.
- Expose resource requirements and non-interactive eligibility in workflow discovery and filter Host Bridge runnable workflows accordingly.
- Provide a runtime resource API used by workflow hooks; GUI adapters may still acquire resources interactively, while CLI/remote execution fails deterministically instead of opening a picker.
- Migrate the built-in literature bundle and notes import/export workflows, including structured non-interactive conflict handling for notes import.
- Extend the CLI command contract, HTTP payload schemas, OpenSpec specifications, and regression tests.

## Capabilities

### New Capabilities

- `workflow-resource-bindings`: Declares workflow resource slots, validates bindings, manages non-interactive resource resolution, and returns output resources.

### Modified Capabilities

- `host-bridge-workflow-control`: Workflow validate/submit accepts resource bindings, performs eligibility checks, and owns input leases.
- `host-bridge-cli-interface`: CLI and agent-facing schemas expose resource binding flags, discovery fields, and output descriptors.
- `host-bridge-file-downloads`: Workflow outputs are registered as downloadable artifacts using the existing opaque-handle contract.
- `host-bridge-output-boundaries`: Resource paths remain Host-owned and output registration is restricted to run-scoped managed locations.
- `workflow-execution-seams`: Workflow hooks receive bound resources through the runtime API and non-interactive runs cannot invoke GUI interaction seams.

## Impact

- TypeScript workflow manifest/runtime contracts, Host Bridge workflow control, file registry/server, capability broker, and workflow execution preparation.
- Rust CLI argument parsing, command dispatch, command-contract descriptors, and Agent Surface v6 schemas.
- Built-in workflow manifests and hooks under `workflows_builtin/literature-workbench-package`.
- Existing Host Bridge, workflow execution, file download, and built-in workflow tests.
- Agent-facing semantic review and source-driven generated surface validation; implementation updates generated targets only through the unified renderer and does not dispatch a release.
