## Why

Windows test runs have accumulated stale `zotero-acp-bridge` processes, and the plugin shutdown path can await ACP controller, adapter, transport, or bridge close promises without a hard bound. A single stuck ACP subprocess or WebSocket close can keep command-line launched Zotero from exiting cleanly.

## What Changes

- Add explicit ACP WebSocket bridge shutdown for plugin shutdown and test reset.
- Make ACP transport close best-effort and bounded after kill/close requests.
- Make ACP Chat and ACP Skills shutdown detach live connections/controllers with fixed timeouts while still persisting local idle/recoverable state.
- Make top-level plugin shutdown run cleanup steps with bounded best-effort semantics so one failing step does not block later cleanup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-windows-websocket-bridge`: bridge daemon shutdown must be explicit and bounded.
- `acp-chat-session-management`: ACP Chat shutdown must persist idle state and release slots even if adapter close stalls.
- `acp-skills-session-recovery`: ACP Skills shutdown must detach local controllers recoverably even if disconnect stalls.
- `skillrunner-async-lifecycle-contract`: plugin shutdown steps must be bounded and best-effort.

## Impact

- Affected runtime modules: ACP WebSocket bridge service, ACP transport, ACP Chat session manager, ACP Skill run store, and plugin lifecycle hooks.
- No user-facing schema or transcript storage changes.
- No dependency changes.
