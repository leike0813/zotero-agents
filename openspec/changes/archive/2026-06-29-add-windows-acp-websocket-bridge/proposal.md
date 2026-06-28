## Why

Windows Zotero runtime cannot reliably use Mozilla Subprocess stdio for ACP
backends launched through user runtime shims. Field diagnostics on Windows 10
LTSC showed that GUI-launched Zotero could resolve commands and inject the
login environment correctly, yet ACP subprocess stdio still closed or produced
incomplete protocol behavior when launched directly from the plugin process.
Linux GUI and terminal launch paths did not exhibit the same transport failure.

ACP is a long-lived JSON-RPC protocol over stdio, so failed stdio semantics
break backend option refresh, ACP chat, SkillRunner-compatible runs, recovery,
and diagnostic probes. The plugin needs a Windows-only transport implementation
that preserves the ACP surface while avoiding the Mozilla Subprocess stdio path
for backend children.

## What Changes

- Add an independent Windows-only Rust sidecar binary,
  `zotero-acp-bridge.exe`, under `native/acp-ws-bridge/`.
- Package the binary as `addon/bin/win32-x64/zotero-acp-bridge.exe` with a
  `.sha256` sidecar and copy it to a content-addressed runtime path before
  launch.
- Start one localhost WebSocket bridge daemon per Zotero plugin runtime and
  reuse it for multiple ACP transports.
- Keep the public ACP transport abstractions unchanged: ACP backend probing,
  refresh-cache, chat, SkillRunner-compatible runs, session resume, recovery,
  and close semantics continue through `AcpTransport` and
  `AcpConnectionAdapter`.
- Use the WebSocket bridge only on Windows Zotero/Mozilla runtime. Node tests
  and non-Windows Zotero runtime keep their existing transports.
- Send the existing runtime launch plan and environment overlay to the bridge;
  the bridge spawns exactly that command without performing command discovery
  or real executable resolution.
- Add debug-mode-only run-local ACP update, timeline, bridge, and transport
  audit files so developers can correlate plugin-visible ACP behavior with
  child process stdio and WebSocket frames without growing normal-mode runtime
  storage.

## Capabilities

### New Capabilities

- `acp-windows-websocket-bridge`: Windows ACP transports use a localhost
  WebSocket sidecar to bridge Zotero WebSocket traffic to backend child stdio.

### Modified Capabilities

- `runtime-platform-services`: Runtime platform packaging and launch services
  now own the ACP bridge binary placement, bridge daemon launch, and runtime
  environment overlay used by the bridge child process.
- `acp-skillrunner-compatible-runner`: ACP SkillRunner-compatible runs record
  run-local bridge and transport audit evidence under their existing `.acp`
  runtime namespace.

## Impact

- Affects Windows ACP transport selection in `src/modules/acpTransport.ts`.
- Adds bridge lifecycle management in
  `src/modules/acpWebSocketBridgeService.ts`.
- Adds an independent Rust sidecar under `native/acp-ws-bridge/`.
- Adds build/package scripts for the ACP bridge binary.
- Extends ACP backend refresh/probe diagnostics and ACP SkillRunner-compatible
  audit trails with bridge/transport evidence.
- Does not change Host Bridge CLI crates, protocols, release pipeline, or
  runtime ownership.

## Non-Goals

- Do not make the bridge a general host capability bridge.
- Do not merge the bridge with Host Bridge CLI.
- Do not use Node.js as a required runtime dependency for ACP transport.
- Do not resolve `.cmd`/`.ps1` shims inside the bridge; launch plans remain the
  platform layer's source of truth.
- Do not enable the bridge automatically on Linux or macOS.
