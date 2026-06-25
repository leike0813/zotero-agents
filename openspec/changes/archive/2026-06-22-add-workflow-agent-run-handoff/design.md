## Overview

`workflow agent-run` is a context handoff, not a workflow execution mode. Host Bridge remains responsible only for resolving the requested workflow, validating explicit selection, collecting available context, and delivering a bundle. The agent remains responsible for reading the workflow and skill instructions, choosing parameters and branches, running tools, and deciding whether any separate write-back step is needed.

## Decisions

### No workflow protocol expansion

The implementation must not add `agentContext`, new manifest fields, or workflow-specific materializers. The bundle is assembled from current-state artifacts: `workflow.json`, workflow package files, skill packages, selection context, selected files, existing output validation/finalization materials, and generated protocol guidance.

### Agent-run request shape

The Host Bridge endpoint accepts only:

```json
{
  "workflowId": "workflow-id",
  "selection": { "kind": "items", "items": [] },
  "delivery": { "mode": "bundle" }
}
```

`selection` follows the existing submit selection rules. `delivery` is optional and may be used by the CLI to request local bundle delivery or bridge-download delivery according to the active connection mode. The request must reject `workflowOptions`, `providerProfile`, `input`, and `agentEngine`.

### Bundle contents

The bundle should be predictable and agent-readable:

- `workflow/workflow.json`: raw loaded workflow manifest.
- `workflow/`: other workflow package files that are safe to expose, including hooks and output validation/finalization materials when present.
- `skills/`: referenced skill packages copied as-is when available.
- `selection/context.json`: explicit selection refs, resolved item metadata, and attachment metadata.
- `selection/files/`: exported selected item files or download descriptors for remote delivery.
- `workflow-protocol.md`: concise current workflow protocol and sequence/handoff execution guidance.
- `INSTRUCTIONS.md`: short entrypoint telling the agent how to use the bundle and where to place outputs.

For local profiles, the CLI may ask Host Bridge to materialize a local bundle under `--output-dir`. For remote profiles, Host Bridge should register a zip bundle with the existing file registry and return a `file download` command.

### Sequence and dynamic workflows

Sequence candidate steps from `request.sequence.steps` are context for the agent. Host Bridge must not evaluate `include_if`, run `buildRequest`, or decide which branch is active. For hook-driven workflows, the raw hook files and candidate step metadata are included so the agent can inspect the workflow's own logic if needed.

### Permissions and safety

Agent-run is read-only and should not require workflow submit approval. It still requires authenticated Host Bridge access and must obey existing workflow visibility rules, debug-only filtering, file-handle boundaries, path redaction, and connection-mode behavior. The bundle must not include bearer tokens, backend auth, provider profiles, or arbitrary local paths.

## Open Points Resolved

- `literature-analysis` and `literature-deep-reading` receive no special Host Bridge branches.
- Workflow options are intentionally absent; the agent infers or chooses parameters from workflow and skill instructions.
- Apply-back is out of the default agent-run flow. If added later, it should be a separate explicit write endpoint.
