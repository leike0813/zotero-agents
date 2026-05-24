## Context

The project currently exposes Zotero host capabilities to agents primarily
through MCP descriptor injection. Recent stabilization work improved smoke
tests and descriptor wrapping, but the underlying problem remains: MCP
transport/session behavior is not stable enough to be the core communication
mechanism for Zotero host access.

The codebase already has a better internal boundary. `zoteroHostCapabilityBroker`
returns JSON-safe DTOs for Zotero context, library, note, attachment, and
mutation capabilities. `zoteroMcpProtocol` adapts those capabilities into MCP
tools. Workflow execution already has preparation, execution, apply, task
runtime, and history seams that can be reused for bridge workflow control.

## Goals / Non-Goals

**Goals:**

- Make Host Bridge HTTP JSON the primary agent-facing host communication path.
- Add a Rust `zotero-bridge` CLI contract that agents can call reliably.
- Support local and explicitly enabled LAN access with bearer authentication.
- Add workflow listing, explicit-input submission, and run/task status queries.
- Add broker-issued remote download file handles.
- Inject `zotero-bridge` into ACP agent runs through `PATH`, profile, token
  environment variable, prompt guidance, and workspace documentation.
- Keep MCP as a compatibility adapter over broker capabilities during
  migration, then deprecate it as the default host access path.

**Non-Goals:**

- Do not implement plugin-side gRPC in v1.
- Do not expose arbitrary local filesystem paths.
- Do not use current Zotero UI selection for remote workflow submission.
- Do not remove MCP support in the initial migration.
- Do not add public internet exposure, relay, or tunnel management in v1.

## Decisions

### Decision 1: Host Bridge uses HTTP JSON, not plugin-side gRPC

The plugin Host Bridge will expose `/bridge/v1/*` over local HTTP JSON. Rust CLI
commands call this API directly. gRPC remains a possible future Rust-daemon
interface, but not a plugin transport.

Rationale: Zotero plugin runtime support for native gRPC/HTTP2 is uncertain and
would add dependency and packaging risk. HTTP JSON matches existing local server
patterns and is easier to debug from CLI and tests.

### Decision 2: Broker is the primary capability SSOT

Host Bridge capability calls must route through broker-owned JSON-safe APIs.
MCP tool handlers remain adapters over the same broker rather than owning
separate business behavior.

Rationale: This avoids duplicate Zotero host access logic and keeps external
surfaces from leaking Zotero native objects.

### Decision 3: Remote workflow submission requires explicit input

Bridge workflow submission will reject missing explicit input units. It will not
fall back to the current Zotero selection.

Rationale: Remote automation needs deterministic inputs. Current UI selection is
useful for menu-triggered workflows but unsafe and surprising for remote or CLI
calls.

### Decision 4: Downloads use opaque broker-issued handles

The bridge will maintain a file handle registry. Download endpoints accept only
`fileId`, never a path.

Rationale: Zotero attachment paths and workflow artifact paths can expose local
filesystem layout. Opaque handles allow policy checks, expiry, source tracking,
and streaming without arbitrary path reads.

### Decision 5: LAN access is opt-in

The default bind mode is loopback. LAN binding requires an explicit plugin
setting and still requires bearer authentication.

Rationale: Local bridge servers can be attacked by other processes or LAN
clients if exposed accidentally. Default-local behavior matches the safest
agent workflow.

### Decision 6: CLI is semantic and agent-first, not a generic RPC shell

The CLI command tree will expose explicit commands such as `status`,
`manifest`, `item search`, `item get`, `note payload`, `workflow list`,
`workflow submit`, `task list`, and `file download`. A generic
`call <capability>` command remains available only for advanced diagnostics.
Every command level must provide detailed `--help` output so agents can
self-discover usage.

Rationale: The CLI is primarily for agents, but agent-first does not conflict
with human usability. Semantic commands reduce prompt burden and avoid making
agents reason over raw capability names for common tasks.

### Decision 7: CLI stdout is the stable machine interface

The CLI will print exactly one final JSON object to stdout. Stderr is reserved
for non-structured human hints such as approval waits, progress, or short
diagnostics. Exit codes are coarse categories; agents should use stdout
`ok/error/meta` JSON as the primary contract.

Rationale: Agents need a deterministic parse target. Human hints and progress
must not contaminate stdout.

### Decision 8: Approval is required only for workflow submit and writes

Read commands, mutation preview, run/task status queries, and registered file
downloads do not require approval. Workflow submission and mutation execution
require approval in Zotero UI. Run-scoped ACP calls use the ACP Skills
permission UI; human CLI, LAN clients, and calls without ACP run scope use a
global Host Bridge approval UI.

Rationale: Approval should protect actions that can change Zotero state or
launch work with side effects, without adding friction to read-only host access.

### Decision 9: The plugin carries CLI binaries and injects PATH

The plugin distribution will carry platform `zotero-bridge` binaries. ACP agent
runs receive a temporary `PATH` entry pointing to the bundled CLI directory,
plus `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN`. The prompt and workspace
docs mention `zotero-bridge`, not absolute binary paths.

Rationale: Agents are expected to have stable local command execution. PATH
injection keeps command usage portable and avoids requiring user-level CLI
installation for agent runs.

### Decision 10: Settings expose only minimal Host Bridge controls

Host Bridge settings expose only LAN enablement, token rotation, endpoint
display, and CLI installation. They do not expose fine-grained protocol toggles
or a custom CLI path. Development overrides use explicit run/profile/runtime
configuration or `ZOTERO_BRIDGE_CLI`.

Rationale: Host Bridge should be predictable for users. Debug controls should
not expand the normal settings surface.

## Risks / Trade-offs

- [Risk] Maintaining MCP and Host Bridge together may duplicate tests.
  → Mitigation: test shared broker behavior once, keep MCP as compatibility
  adapter during migration, and deprecate MCP default startup/injection after
  Host Bridge CLI is complete.
- [Risk] Workflow explicit-input context may not match every existing
  selection-driven workflow assumption.
  → Mitigation: implement a bridge input-context adapter and add workflow
  submission tests before moving agent prompts to CLI.
- [Risk] LAN binding increases attack surface.
  → Mitigation: default loopback, bearer auth, manifest redaction, and no
  arbitrary path downloads.
- [Risk] Rust CLI introduces a new toolchain and cross-platform packaging
  surface.
  → Mitigation: keep CLI as a separate subproject, build platform binaries via
  GitHub Actions matrix, and let agent runs use bundled binaries through PATH.

## Migration Plan

Implementation should follow runnable vertical slices rather than building all
modules in parallel. The first milestone is a read-only Host Bridge + CLI path;
workflow, approval, downloads, packaging, and MCP deprecation build on that
stable channel.

### Phase 0: Preparation and boundaries

- Confirm this OpenSpec change as the implementation contract.
- Use `cli/zotero-bridge/` for the Rust CLI subproject.
- Establish Host Bridge module boundaries for server, protocol, auth,
  capability registry, workflow control, file registry, and permission
  management.

Exit criteria: module/type boundaries exist without committing to broad business
logic.

### Phase 1: Host Bridge service foundation

- Implement `/bridge/v1/health`, `/bridge/v1/manifest`, bearer auth, loopback
  default bind, LAN opt-in, token redaction, structured errors, and minimal
  settings controls.

Exit criteria: health works without auth; manifest requires auth; no token or
local path is leaked; default binding is loopback-only.

### Phase 2: Capability registry and read-only broker access

- Add explicit capability registry and bridge calls for common read-only Zotero
  context, library, note, attachment metadata, and note payload access.
- Defer mutation execution.

Exit criteria: bridge read responses are JSON-safe and MCP can still coexist as
a compatibility adapter.

### Phase 3: Rust CLI skeleton and semantic read commands

- Add profile/env/endpoint/token loading, protocol checks, `status`,
  `manifest`, item/note read commands, advanced `call <capability>`, detailed
  `--help`, and the stdout/stderr/exit-code error model.

Exit criteria: CLI can query the local Host Bridge read path; stdout contains
only final JSON; tokens are never printed.

### Phase 4: ACP agent-run injection

- Inject bundled CLI directory into `PATH`, write `.zotero-bridge/profile.json`
  and `.zotero-bridge/README.md`, inject `ZOTERO_BRIDGE_PROFILE` and
  `ZOTERO_BRIDGE_TOKEN`, add concise prompt guidance, and run plugin-side
  deterministic preflight without agent-side smoke.

Exit criteria: ACP agents can call `zotero-bridge` without absolute paths or
token exposure; Host Bridge CLI is the preferred path and MCP remains only a
migration fallback.

### Phase 5: Workflow control

- Implement workflow list, submit, run status, and task list through existing
  workflow seams.
- Require explicit input and approval for submit; keep list/status read-only.

Exit criteria: CLI can submit explicit-input workflow runs and query run/task
status without using current Zotero selection.

### Phase 6: Approval UI integration

- Route run-scoped approval to ACP Skills permission UI.
- Route human CLI, LAN, and no-run-scope approval to a global Host Bridge
  approval UI.
- Enforce approval only for workflow submit and mutation execute.

Exit criteria: CLI cannot approve its own operations, waits through stderr-only
hints, and returns final JSON for approval success, denial, timeout, or UI
unavailability.

### Phase 7: File downloads

- Add file registry, attachment handles, workflow artifact handles, bridge
  export handles, `/bridge/v1/files/{fileId}`, and CLI `file download`.

Exit criteria: only registered handles can be downloaded; descriptors do not
leak absolute paths; file bytes are not carried in JSON bodies; downloads do not
require approval.

### Phase 8: CLI packaging and installation

- Build and package Windows x64, macOS x64, macOS arm64, and Linux x64 binaries
  through release automation.
- Add settings-page CLI installation, including explicit Windows user PATH
  confirmation.

Exit criteria: agent runs use bundled CLI without user installation; humans can
install CLI for terminal use; missing platform binaries produce
`cli_binary_unavailable`.

### Phase 9: MCP deprecation

- After Host Bridge CLI covers the ACP host access path, retain MCP code and
  capabilities but stop starting MCP by default, injecting descriptors, using
  MCP as fallback, running MCP preflight, or showing ACP MCP indicators.

Exit criteria: new ACP runs use Host Bridge CLI by default; MCP remains only as
explicit compatibility/developer tooling.

## Open Questions

- Exact UI layout and preference key names are implementation details, but the
  exposed setting set is fixed to LAN enablement, token rotation, endpoint
  display, and CLI installation.
