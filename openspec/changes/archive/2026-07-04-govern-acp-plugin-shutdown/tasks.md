## 1. OpenSpec

- [x] Add delta specs for ACP bridge, Chat, Skills recovery, and async lifecycle shutdown.
- [x] Validate `govern-acp-plugin-shutdown` strictly.

## 2. Implementation

- [x] Add bounded ACP WebSocket bridge shutdown and reuse it from test reset.
- [x] Make ACP transport close bounded after kill/close for Mozilla, Node, and WebSocket transports.
- [x] Make ACP Chat shutdown close adapters with timeout and always persist idle metadata.
- [x] Make ACP Skills shutdown detach controllers concurrently with timeout and persist recoverable state.
- [x] Wrap top-level plugin shutdown steps with bounded best-effort cleanup.

## 3. Tests

- [x] Cover ACP Chat shutdown when adapter close never resolves.
- [x] Cover ACP Skills shutdown when controller disconnect never resolves.
- [x] Cover ACP WebSocket bridge shutdown when `proc.wait()` never resolves.
- [x] Cover transport close timeout lifecycle markers.
- [x] Cover hook wiring for bounded shutdown and bridge shutdown.
- [x] Run TypeScript and targeted ACP shutdown regression tests.
