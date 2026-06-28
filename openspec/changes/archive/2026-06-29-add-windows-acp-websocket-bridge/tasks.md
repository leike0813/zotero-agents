## 1. OpenSpec Contracts

- [x] 1.1 Add a Windows ACP WebSocket bridge capability spec.
- [x] 1.2 Add runtime platform service deltas for bridge binary packaging,
  singleton startup, environment propagation, and explicit failure.
- [x] 1.3 Add ACP SkillRunner-compatible runner deltas for bridge/transport
  audit files under run-local `.acp` namespaces.

## 2. Native Bridge

- [x] 2.1 Add independent Rust crate `native/acp-ws-bridge`.
- [x] 2.2 Implement `zotero-acp-bridge.exe --serve --host 127.0.0.1 --port 0
  --token <token> --ready-file <path> --log-file <path>`.
- [x] 2.3 Implement localhost WebSocket handshake and token validation.
- [x] 2.4 Implement spawn request parsing and one child process per WebSocket
  connection.
- [x] 2.5 Forward client binary frames to child stdin and child stdout bytes
  back as binary frames.
- [x] 2.6 Forward child stderr and lifecycle events as text control frames.
- [x] 2.7 Clean up child processes when the WebSocket closes.
- [x] 2.8 Write low-level bridge audit events when `auditFile` is supplied.

## 3. Plugin Transport

- [x] 3.1 Add ACP WebSocket bridge service lifecycle management.
- [x] 3.2 Select WebSocket bridge transport for Windows Zotero/Mozilla runtime.
- [x] 3.3 Preserve Node test transport and non-Windows Mozilla Subprocess
  transport.
- [x] 3.4 Build bridge spawn requests from existing runtime launch plans and
  environment overlays.
- [x] 3.5 Preserve `AcpTransport` and `AcpConnectionAdapter` public behavior.
- [x] 3.6 Report bridge lifecycle fields in transport diagnostics.
- [x] 3.7 Fail explicitly when the bridge binary or WebSocket connection is
  unavailable.

## 4. Diagnostics and Audit

- [x] 4.1 Add plugin-side transport audit events correlated by `spawnId`.
- [x] 4.2 Write bridge/transport audit files for ACP SkillRunner-compatible
  runs only when debug mode is enabled.
- [x] 4.3 Write bridge/transport audit files for ACP refresh-cache and backend
  probe diagnostics only when debug mode is enabled.
- [x] 4.4 Redact secret-bearing environment keys and payload previews.
- [x] 4.5 Keep stdout protocol consumption single-owner in the plugin transport.
- [x] 4.6 Keep high-volume ACP update and timeline audit files debug-only.

## 5. Packaging

- [x] 5.1 Add `scripts/build-acp-ws-bridge.mjs`.
- [x] 5.2 Add `scripts/package-acp-ws-bridge.mjs`.
- [x] 5.3 Add package scripts `prebuild:acp-ws-bridge` and
  `package:acp-ws-bridge`.
- [x] 5.4 Package `addon/bin/win32-x64/zotero-acp-bridge.exe` and
  `zotero-acp-bridge.exe.sha256`.

## 6. Verification

- [x] 6.1 Run `cargo test --manifest-path native/acp-ws-bridge/Cargo.toml`.
- [x] 6.2 Run `cargo fmt --manifest-path native/acp-ws-bridge/Cargo.toml
  --check`.
- [x] 6.3 Run `npm run prebuild:acp-ws-bridge`.
- [x] 6.4 Run `npx tsc --noEmit --pretty false`.
- [x] 6.5 Run `npm run build`.
- [x] 6.6 Run focused Node tests for ACP transport, backend probe, and
  SkillRunner-compatible audit behavior.
- [x] 6.7 Run strict OpenSpec validation for
  `add-windows-acp-websocket-bridge`.
- [x] 6.8 Add bridge edge/performance regression tests for large frames,
  unsupported stdout frames, capture isolation, and singleton startup.
