## Why

The current product-owned Node sidecar produces roughly 40 MB per platform and would make a universal offline XPI approximately 200 MB, while downloading Node after installation is explicitly unacceptable. Stage 1 is still before WS6 shadow verification and WS7 production ownership cutover, so pivoting now prevents additional Node-only sunk cost and avoids migrating the production writer twice.

## What Changes

- Freeze the Node sidecar as a migration oracle: no new Node-only capability, production ownership cutover, formal XPI inclusion, or long-term runtime distribution work.
- Pause the existing WS6/WS7 sequence and replace it with Rust parity, native packaging, and one atomic production cutover.
- Establish versioned language-neutral wire schemas and canonical gold corpora before cross-language implementation.
- Define an incremental Rust migration order beginning with Citation Graph metrics, followed by deterministic kernels, complex engines, layout v2, repository/canonical/application parity, and the native service control plane.
- Require independent Rust worker processes for bounded CPU work and forbid per-request Node fallback or shared Node/Rust database ownership.
- **BREAKING** Replace the Node-coupled runtime bundle, launch, installer, discovery, and handshake identities with a native runtime manifest v2 at final cutover.
- **BREAKING** Remove the Node service tree, Node runtime prebuilds, JavaScript worker implementation, and D3 runtime packaging after Rust parity and native cutover gates pass.
- Add measured package-size, cross-platform fault-injection, compatibility, lifecycle, and real-machine acceptance gates for the Rust runtime.

## Capabilities

### New Capabilities

- `synthesis-rust-sidecar-migration-governance`: Defines the Node freeze, cross-language contract order, Rust migration workstreams, native cutover gates, deletion policy, and package-size budget.

### Modified Capabilities

- `synthesis-layer-doc-system`: Active Synthesis documentation must identify Rust as the approved sidecar target, Node as a frozen migration oracle, and the previous WS6/WS7 Node route as paused rather than current next work.

## Impact

- Planning artifacts: Stage 1 detailed plan, WS5 self-review follow-up, and a new dedicated Rust migration plan.
- Active documentation: Synthesis README, runtime/rebuild, persistence ownership, and runtime packaging documents.
- Future implementation areas: `native/synthesis-sidecar`, language-neutral schemas and fixtures, Synthesis contracts/engine/application/repository packages, plugin installer/supervisor/control clients, build and release workflows, and Stage 1 tests.
- Dependencies: future Rust changes may add `serde`, `serde_json`, `sha2`, bundled SQLite, and a bounded async HTTP runtime, subject to per-change review and binary-size measurement.
- Compatibility: production database and canonical bytes/hashes remain compatible; Force layout moves only through an explicit layout v2 contract; Node-to-Rust runtime downgrade is not supported after native cutover.
