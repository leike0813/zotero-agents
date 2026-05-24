## Why

The current agent-facing Zotero host capability path depends on MCP descriptor
injection, but MCP transport and session behavior is not stable enough to be
the core communication mechanism for Zotero host access. The project already
has a JSON-safe host capability broker, so the next step is to expose that
broker through a stable Host Bridge and Rust CLI while keeping MCP as a
compatibility adapter.

## What Changes

- Add a plugin-side Host Bridge HTTP JSON API for local and LAN agent access.
- Add a Rust `zotero-bridge` CLI contract that calls the Host Bridge instead of
  relying on MCP.
- Add workflow control endpoints for listing workflows, submitting runs with
  explicit input, and inspecting run/task status.
- Add remote-safe file downloads through broker-issued file handles only.
- Modify the host capability broker contract so it is the primary SSOT for
  Host Bridge, CLI, workflow package, and MCP adapter capabilities.
- Add ACP agent-run injection for the CLI through `PATH`, connection profile,
  bearer-token environment variable, prompt guidance, and workspace usage docs.
- Add CLI packaging/install expectations so the plugin carries platform
  binaries while still supporting one-click terminal installation.
- Preserve MCP behavior as a compatibility path during migration, then
  deprecate MCP as the default host access path once Host Bridge CLI is fully
  implemented and stable.
- Do not implement plugin-side gRPC in v1; Rust may expose future gRPC outside
  the plugin boundary if needed.

## Capabilities

### New Capabilities

- `host-bridge-service`: Local/LAN HTTP JSON bridge, bearer authentication,
  health, manifest, and capability call behavior.
- `host-bridge-cli-interface`: Rust CLI command surface, JSON input/output, and
  error behavior.
- `host-bridge-workflow-control`: Workflow listing, explicit-input submission,
  and run/task status inspection through the bridge.
- `host-bridge-file-downloads`: Broker-issued file handles and remote-safe
  file download behavior.

### Modified Capabilities

- `zotero-host-capability-broker`: Promote the broker from MCP/workflow helper
  to the primary JSON-safe Host Bridge capability SSOT.

## Impact

- Code:
  - Host capability broker, MCP adapter, and future Host Bridge service modules.
  - Workflow runtime, workflow execution seams, task runtime, and dashboard
    history readers for bridge workflow control.
  - Rust CLI subproject and packaging integration.
- APIs:
  - New `/bridge/v1/*` HTTP JSON API.
  - New `zotero-bridge` CLI command contract.
- Security:
  - Bearer token authentication for bridge calls.
  - LAN binding disabled by default.
  - File downloads restricted to broker-issued handles.
  - Workflow submission and mutation execution require plugin-side approval;
    read commands, mutation preview, and registered file downloads do not.
- Tests:
  - Host Bridge auth, manifest redaction, capability calls, workflow control,
    file handle downloads, CLI command mapping, approval policy, and MCP
    deprecation/coexistence coverage.
