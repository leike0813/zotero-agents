# Verification

## Status

C09 remains active at 8/9 tasks. The Windows build host is unavailable, so the renamed Rust source has no new Windows executable, synchronized checksum, or real Zotero canary yet. The old ACP executable must not be renamed as a substitute. Do not archive or claim the C10 dependency is ready until those gates pass.

## Evidence collected on Linux

- `openspec validate generalize-windows-stdio-process-bridge --strict` — passed.
- `npx tsc --noEmit --pretty false` — passed after source integration.
- `npx mocha --require tsx tests/runtime/164-runtime-platform-services.test.ts tests/acp/98-acp-transport.test.ts` — 96 passed after the final process status correction. The running snapshot now reports `running`; failed or unobserved termination reports `unknown`.
- `cargo test --manifest-path rust/stdio-bridge/Cargo.toml` — 13 passed on Linux; `cargo build --release` and `cargo fmt --check` passed. These do not prove the Windows target.
- Final `cargo test --manifest-path rust/stdio-bridge/Cargo.toml` and `cargo fmt --check --manifest-path rust/stdio-bridge/Cargo.toml` rerun — 13 passed, format clean.
- Packaging tests with `--require tests/setup/zotero-mock.ts` — 62 passed, 2 Windows-gated pending. Direct Mocha without this project setup first produced three unrelated Zotero-global errors; the setup run cleared them.
- `npm run build` reached plugin packing and failed on the expected missing `zotero-stdio-bridge.exe` and `.sha256` plus the still-packaged legacy ACP asset. No Windows binary was fabricated. The generated help-docs manifest timestamp was restored to its prior value.
- `npm run lint:check` — passed on the clean sequential rerun after fixing the test's `no-this-alias` lint error.
- `npm run test:node -- --shard acp-runtime`, `runtime-platform-persistence`, and `host-bridge-surface-release` — all passed after integration (24, 10, and 13 files respectively).
- `npm run test:node` — completed with failures in other domains, including Host Bridge runtime, SkillRunner runtime, Synthesis application, tooling, and literature/workflow packages. The ACP runtime and platform/persistence shards passed in this full run. Re-running `host-bridge-runtime` showed a capability import timeout and a canonical mutation receipt assertion (`repair_required` versus `committed`); re-running `tooling-runtime` showed Host attachment/migration timeouts, a runtime-log count assertion, and teardown failure. None of these failing assertions touches the C09 process or packaging files; no full Node pass is claimed.
- `timeout 180s npm run test:zotero:core` — real Linux Zotero launched and the runtime-platform tests preceding library page query passed; the suite then stopped progressing in the existing library page query stage and exited 124 at the timeout. No full Zotero core pass is claimed.
- `ZOTERO_TEST_GREP='streams a long-lived stdio process' timeout 150s npm run test:zotero:core` — real Linux Zotero passed the new long-lived stdin/stdout/stderr/exit test (1 passed, 115 ms test time). This does not replace the Windows canary.
- Final `npx tsc --noEmit --pretty false`, `npm run lint:check`, `openspec validate ... --strict`, and `git diff --check` — passed.

## Remaining checks

- Windows prebuild from `rust/stdio-bridge`, new asset checksum, and real Windows Zotero canary.
