# Tasks

## 1. Owner invalidation and local drain

- [x] 1.1 Red/green 220: production RPC with non-cooperative fetch cancels in-flight calls on invalidation; add the private operation owner and same-promise disposal barrier, preserving audit/error semantics and rejecting stale admission before connection access.
- [x] 1.2 Red/green 220 and 176: bound recovery without native AbortController, suppress late recovery effects, prove fresh/shutdown drain and replacement-generation isolation through public lifecycle interfaces.

## 2. Shared staging and total capability budget

- [x] 2.1 Red/green parameterized 220 large-plan/assets staging cancellation: consolidate staging, register known-session cleanup, prohibit later pages/seal/mutation, and prove dispose waits for independent bounded cleanup.
- [x] 2.2 Red/green parameterized 220 budget exhaustion and partial consumption: preparation/staging/business RPC share the manifest transport deadline; remove incidental exact facade deadline assertions and retain manifest/grace contract assertions.

## 3. Output cancellation and durable isolation

- [x] 3.1 Red/green 220 output cancellation, page expiry, and invalid-manifest/hash primary-error preservation: pass optional signal through output reads, use a bounded native RPC adapter, independently bound cleanup, and verify 225 retained-session behavior.
- [x] 3.2 Build current Rust sidecar and run 229 accepted-maintenance-disposal scenario: replacement reads the same operation ID through completion, with exactly one started/terminal event and no implicit durable cancellation.

## 4. Integration evidence

- [x] 4.1 Run direct Mocha regression suites 220/176/225/182/231 and selected 229 large-content/replay/disposal routes; record actual outcomes and any uncovered prerequisite.
- [x] 4.2 Run ephemeral loopback HTTP smoke using production composition/RPC: page-gated invalidation yields unavailable/request_canceled, zero mutations, one input cancel, and completed disposal; release gate and verify no late mutation.
- [x] 4.3 Update existing lifecycle documentation with verified budget/cleanup/local-versus-durable semantics, verify strict OpenSpec validation, and leave the change unarchived and uncommitted.

## Verification evidence

- Direct Mocha with `--require tests/setup/zotero-mock.ts --timeout 10000 --exit` over suites 220/176/225/182/231: 114 passing.
- `npm run build:synthesis-rust-sidecar`: current workspace built successfully with the declared `nightly-2026-07-25` toolchain and locked dependencies.
- Direct 229 Mocha selection `moves large Topic and artifact content|replays one public maintenance request|keeps accepted maintenance work observable after native composition disposal`: 3 passing against that build.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- Ephemeral Node/tsx loopback HTTP smoke using production composition/RPC: `unavailable`, `request_canceled`, zero mutation dispatches, one input cancel, completed disposal; releasing the page gate did not dispatch a mutation. Temporary script removed after execution.
- `npx openspec validate fix-synthesis-native-operation-lifecycle --strict`: passed.
- No plugin build, Zotero real-library execution, archive, commit, or release was performed. Local cancellation does not prove remote rollback; unknown begin sessions remain subject to server reaping.
