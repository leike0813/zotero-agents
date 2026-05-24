## 1. OpenSpec

- [x] 1.1 Create `harden-host-bridge-lifecycle-and-status`.
- [x] 1.2 Add proposal, design, and spec deltas.

## 2. Host Bridge Lifecycle

- [x] 2.1 Start Host Bridge supervision during plugin startup.
- [x] 2.2 Stop Host Bridge supervision during plugin shutdown.
- [x] 2.3 Add delayed self-recovery after unexpected socket stops.
- [x] 2.4 Add controlled restart path for Host Bridge preference changes.

## 3. Pin Port

- [x] 3.1 Add pin port preferences and typing.
- [x] 3.2 Add preferences UI controls and localized labels.
- [x] 3.3 Prefer the configured fixed port when pinning is enabled.
- [x] 3.4 Disable pinning and fall back to random ports when the fixed port is unavailable.

## 4. ACP Indicators

- [x] 4.1 Add Host Bridge status to ACP Chat and ACP Skills snapshots.
- [x] 4.2 Render Host Bridge indicators in ACP Chat and ACP Skills banners.
- [x] 4.3 Keep MCP indicators hidden while preserving MCP approval title compatibility.

## 5. Verification

- [x] 5.1 Extend Host Bridge server tests for pin port and supervisor behavior.
- [x] 5.2 Extend ACP UI smoke tests for Host Bridge indicators.
- [x] 5.3 Run targeted node tests.
- [x] 5.4 Run `openspec validate harden-host-bridge-lifecycle-and-status --strict`.
- [x] 5.5 Run `npm run build`.
