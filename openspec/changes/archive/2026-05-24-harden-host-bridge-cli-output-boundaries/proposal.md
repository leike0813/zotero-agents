## Why

Host Bridge CLI testing showed that workflow/task responses and CLI download
summaries can expose local filesystem paths. These outputs are agent-facing API
boundaries, so they must preserve useful status and diagnostic information
without leaking host-local paths or encouraging agents to depend on them.

## What Changes

- Add a Host Bridge output-boundary hardening contract for workflow/task DTOs,
  error text, manifest CLI metadata, and CLI download summaries.
- Redact path-like workflow/task fields before they leave Host Bridge endpoints.
- Redact path-like substrings from externally returned workflow/task errors.
- Replace CLI download success/error `output` details with path-safe
  `outputName`.
- Clarify Host Bridge manifest CLI support metadata.
- Clarify CLI install/PATH result messaging, especially after Windows user PATH
  updates.

## Capabilities

### New Capabilities

- `host-bridge-output-boundaries`: External Host Bridge and CLI responses
  expose stable agent-facing metadata without leaking local filesystem paths.

### Modified Capabilities

- None.

## Impact

- Code:
  - Host Bridge workflow control DTO projection and manifest response.
  - Rust CLI file download result/error payloads.
  - CLI installer status/message output.
- APIs:
  - Host Bridge manifest `cli` metadata changes from unsupported to protocol
    supported.
  - CLI `file download` output no longer includes absolute output paths.
- Tests:
  - Host Bridge workflow/task response redaction.
  - Host Bridge manifest CLI metadata.
  - Rust CLI download output redaction.
  - CLI installer PATH restart messaging.
