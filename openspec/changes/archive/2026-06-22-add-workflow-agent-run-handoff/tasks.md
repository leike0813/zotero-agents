## 1. Host Bridge agent-run handoff

- [x] 1.1 Add workflow agent-run request parsing that reuses explicit selection validation and rejects `workflowOptions`, `providerProfile`, `agentEngine`, and legacy `input`.
- [x] 1.2 Add a read-only Host Bridge route for `POST /bridge/v1/workflows/agent-run` and advertise it in the workflow control manifest.
- [x] 1.3 Build a handoff bundle from raw workflow package files, referenced skill packages, resolved selection context, selected files, output validation/finalization materials, and generated protocol instructions.
- [x] 1.4 Reuse existing file registry/download behavior for remote bundle delivery and avoid exposing arbitrary local paths or secrets.

## 2. Rust CLI

- [x] 2.1 Add `zotero-bridge workflow agent-run --workflow <id> (--items <JSON_OR_FILE> | --none) [--output-dir <dir>]`.
- [x] 2.2 Map the command to `/workflows/agent-run` without workflow options, provider profile, or agent-engine fields.
- [x] 2.3 Return agent-friendly JSON plus a short instruction field that explains the bundle purpose and execution requirements.

## 3. Documentation and generated surfaces

- [x] 3.1 Update Host Bridge CLI docs, wrapper skill guidance, generated reference, and surface checks for `workflow agent-run`.
- [x] 3.2 Document that agent-run is a read-only context handoff and does not extend workflow manifests or execute `buildRequest`.

## 4. Verification

- [x] 4.1 Add Host Bridge tests for valid handoff, rejected host-owned fields, no-selection validation, sequence candidate context, and absence of workflow-id-specific branches.
- [x] 4.2 Add Rust CLI tests for flag parsing, request mapping, file/stdin item input, and help output.
- [x] 4.3 Run the focused Host Bridge workflow/packaging tests, `cargo test -q` in `cli/zotero-bridge`, host bridge doc-sync/surface checks, and TypeScript check.
