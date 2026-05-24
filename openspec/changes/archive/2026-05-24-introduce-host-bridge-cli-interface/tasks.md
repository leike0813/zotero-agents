## Phase 0: Preparation And Boundaries

- [x] 0.1 Confirm this OpenSpec change is the implementation contract.
- [x] 0.2 Add Rust CLI subproject skeleton under `cli/zotero-bridge`.
- [x] 0.3 Establish Host Bridge module boundaries for server, protocol, auth, capability registry, workflow control, file registry, and permission management.
- [x] 0.4 Add shared bridge protocol/types for envelopes, errors, manifest metadata, approval policy, and file handles.

## Phase 1: Host Bridge Service Foundation

- [x] 1.1 Add Host Bridge service module with `/bridge/v1/health` and authenticated request routing.
- [x] 1.2 Add bearer-token generation, storage, redaction, rotation, and authorization checks.
- [x] 1.3 Add loopback default bind behavior and explicit LAN enablement setting.
- [x] 1.4 Add `/bridge/v1/manifest` response with capability, workflow, file, and CLI metadata.
- [x] 1.5 Add structured bridge error response helpers for auth, validation, routing, and execution failures.
- [x] 1.6 Add settings entries for enable LAN, token rotate, show endpoint, and install CLI only.
- [x] 1.7 Verify health is unauthenticated, manifest is authenticated, and manifest leaks no token or local path.

## Phase 2: Capability Registry And Read-Only Broker Access

- [x] 2.1 Add explicit bridge capability registry over existing `zoteroHostCapabilityBroker` APIs.
- [x] 2.2 Implement `POST /bridge/v1/call` for read-only context, library, note payload, attachment metadata, and diagnostic capabilities.
- [x] 2.3 Defer mutation execute while allowing mutation preview as a no-approval read-like operation.
- [x] 2.4 Add DTO safety checks or tests proving bridge responses do not expose Zotero native objects.
- [x] 2.5 Keep MCP tool handlers as compatibility adapters over broker capabilities during migration.

## Phase 3: Rust CLI Skeleton And Semantic Read Commands

- [x] 3.1 Implement bridge endpoint, token, profile, environment-variable, and protocol-version loading.
- [x] 3.2 Implement semantic `status`, `manifest`, `item search`, `item get`, `item notes`, `item attachments`, `note get`, `note payloads`, and `note payload` commands.
- [x] 3.3 Keep `call <capability>` as an advanced diagnostic command, not the primary agent interface.
- [x] 3.4 Add detailed `--help` output for every command level.
- [x] 3.5 Add stable `ok/data/meta` and `ok/error/meta` JSON stdout, stderr-only human hints, and coarse exit codes.
- [x] 3.6 Add `incompatible_bridge_protocol`, auth, config, permission, validation, capability, workflow, and download error handling.
- [x] 3.7 Verify CLI read commands can query a local Host Bridge and never print token values.

## Phase 4: ACP Agent-Run Injection

- [x] 4.1 Update ACP skill-run materialization to inject bundled CLI directory into `PATH`.
- [x] 4.2 Write `.zotero-bridge/profile.json` with token-ref auth and stable run scope.
- [x] 4.3 Inject `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN` into ACP agent runs.
- [x] 4.4 Generate `.zotero-bridge/README.md` with complete CLI usage guidance, error model, approval behavior, and prohibitions.
- [x] 4.5 Update ACP prompt guidance to include concise `zotero-bridge` usage and self-discovery instructions.
- [x] 4.6 Add plugin-side deterministic preflight without agent-side CLI smoke.
- [x] 4.7 Record run state showing Host Bridge CLI availability and migration fallback reason when applicable.

## Phase 5: Workflow Control

- [x] 5.1 Add workflow listing endpoint backed by the loaded workflow registry.
- [x] 5.2 Add explicit input unit parser for bridge workflow submission.
- [x] 5.3 Add bridge workflow submit path using existing preparation, execution, provider, queue, and apply seams.
- [x] 5.4 Reject workflow submissions that omit explicit input units without reading current Zotero selection.
- [x] 5.5 Add run status endpoint backed by workflow run metadata, task runtime, and dashboard history.
- [x] 5.6 Add task listing endpoint with workflow, backend, request, and state filters.
- [x] 5.7 Require Zotero-side approval for workflow submit while keeping workflow list/run/task status read-only.
- [x] 5.8 Implement CLI `workflow list`, `workflow submit`, `workflow run`, and `task list` commands.

## Phase 6: Approval UI Integration

- [x] 6.1 Apply bridge approval policy: read commands, mutation preview, file download, and status queries do not require approval.
- [x] 6.2 Require approval for `mutation.execute` and workflow submit.
- [x] 6.3 Route run-scoped approval requests to the existing ACP Skills permission UI.
- [x] 6.4 Add global Host Bridge approval UI for human CLI, LAN clients, and no-run-scope requests.
- [x] 6.5 Ensure CLI cannot self-approve and only waits for bridge results.
- [x] 6.6 Return structured JSON for approval success, denial, timeout, and UI-unavailable cases.

## Phase 7: File Downloads

- [x] 7.1 Add broker-owned file handle registry with opaque `fileId`, source kind, metadata, and expiry.
- [x] 7.2 Register downloadable handles for Zotero attachments exposed by broker capabilities.
- [x] 7.3 Register downloadable handles for workflow artifacts and bridge exports.
- [x] 7.4 Implement `GET /bridge/v1/files/{fileId}` with auth, expiry, existence, and source-policy validation.
- [x] 7.5 Stream or chunk file responses without returning file bytes through JSON bodies.
- [x] 7.6 Ensure remote file metadata does not expose internal absolute paths.
- [x] 7.7 Implement CLI `file download` with safe output handling, no default overwrite, and explicit `--force`.
- [x] 7.8 Ensure registered file downloads do not require approval and never accept arbitrary path parameters.

## Phase 8: CLI Packaging And Installation

- [x] 8.1 Add bundled platform binary resolution and `cli_binary_unavailable` diagnostics.
- [x] 8.2 Add GitHub Actions matrix or release workflow for Windows x64, macOS x64, macOS arm64, and Linux x64 CLI binaries.
- [x] 8.3 Package platform binaries into `addon/bin/<platform>/`.
- [x] 8.4 Add settings-page install action that copies the current platform binary to a user-level bin directory.
- [x] 8.5 On Windows, require explicit confirmation before adding the user-level bin directory to user PATH.
- [x] 8.6 Add platform binary checksum or release integrity handling as appropriate for the packaging workflow.

## Phase 9: MCP Deprecation

- [x] 9.1 Keep MCP descriptor injection available as a compatibility path during migration.
- [x] 9.2 Add diagnostics showing whether a run used Host Bridge CLI guidance or MCP compatibility guidance.
- [x] 9.3 After Host Bridge CLI is stable, stop MCP default startup, descriptor injection, and fallback.
- [x] 9.4 Remove MCP preflight from normal ACP run preparation.
- [x] 9.5 Remove the MCP indicator from the ACP panel normal run status surface.
- [x] 9.6 Preserve MCP diagnostics as explicit developer or compatibility tooling.
- [x] 9.7 Update docs to describe Host Bridge as primary and MCP as compatibility/developer tooling.

## Verification

- [ ] 10.1 Add Host Bridge auth, manifest redaction, settings, and capability call tests.
- [x] 10.2 Add approval policy tests for read/preview/download no-approval and workflow submit/mutation execute approval.
- [x] 10.3 Add workflow submit and task status tests for explicit input and missing-input rejection.
- [x] 10.4 Add file handle tests for valid, unknown, expired, and path-like download requests.
- [ ] 10.5 Add CLI command mapping, help output, JSON stdout, stderr hygiene, and error exit behavior tests.
- [ ] 10.6 Add agent injection tests for PATH/profile/token/README/prompt guidance.
- [x] 10.7 Add packaging/install tests or scripted checks for bundled binary resolution and install behavior.
- [x] 10.8 Add migration tests showing MCP adapter and Host Bridge coexist during migration and MCP defaults are disabled after deprecation.
- [x] 10.9 Run relevant node/core/workflow tests and `openspec validate introduce-host-bridge-cli-interface --strict`.
