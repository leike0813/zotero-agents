# Proposal

## Why

ACP currently owns a Windows-only stdio bridge even though the next native tool change needs the same long-lived process behavior. A shared process boundary lets both callers use one supervised bridge and gives callers honest stream and termination evidence.

## What Changes

- Add a project-owned long-lived stdio process interface for resolved executables, arguments, cwd, and sanitized environment. It exposes bounded streams, stdin EOF, wait, termination, and adapter/process evidence.
- Move ACP's Windows child launch onto that interface while preserving its public transport and connection behavior. Its existing POSIX process-group cleanup remains in place.
- Generalize the Windows loopback broker and packaging from ACP to stdio. Keep one daemon per plugin runtime, one child per socket, and the existing token, ready-file, checksum, timeout, and frame safeguards.
- Keep Linux/macOS Zotero on Mozilla Subprocess and Node tests on the Node adapter. No Pi dependency enters this change.

## Capabilities

### New Capabilities

- `long-lived-stdio-process`: Cross-runtime long-lived child ownership and stream/termination contract.

### Modified Capabilities

- `acp-windows-websocket-bridge`: ACP becomes a caller of the shared bridge, including separate stdin EOF and truthful termination evidence.
- `runtime-platform-services`: The platform layer owns long-lived stdio and packages the neutral Windows broker.

## Impact

`src/platform/`, ACP transport, Windows Rust broker, packaging scripts/assets, ACP and platform tests, root runtime guidance, and the Pi runtime handoff. Windows binary prebuild and Zotero canary are required before archiving.
