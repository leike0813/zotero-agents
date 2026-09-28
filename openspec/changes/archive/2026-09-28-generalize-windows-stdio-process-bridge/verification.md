# Verification

## Status

C09 has 9/9 tasks complete. The Windows binary was built from `rust/stdio-bridge` and the real Zotero 10.0.2 Windows canary passed. The change remains active pending a separate sync/archive action.

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

## Windows completion evidence (2026-09-28)

- `npm run prebuild:stdio-bridge` built `x86_64-pc-windows-msvc` from the renamed Rust source and packaged `addon/bin/win32-x64/zotero-stdio-bridge.exe`.
- The binary SHA-256 and its `.sha256` sidecar agree: `fb7e8f1d9f0fea7cc6a88078a7a72c4fdc143d5c490ce4b25a71fbb6d0cebdd7`. The two legacy `zotero-acp-bridge.exe` assets were removed.
- `npm run build` passed with the new packaged asset. The staged build contains the new executable and sidecar and neither legacy ACP asset. `npx mocha --require tsx --require tests/setup/zotero-mock.ts tests/acp/166-stdio-bridge-packaging.test.ts` passed all 5 cases, including the now required on-disk Windows asset check.
- `ZOTERO_PLUGIN_ZOTERO_BIN_PATH=<Windows Zotero 10.0.2 executable>` and `ZOTERO_TEST_GREP='streams a long-lived stdio process'` with `npm run test:zotero:core` reported `1 passed` in the real Windows host. The test now copies raw bytes through PowerShell standard streams. The first run exposed a PowerShell text-stream byte truncation: the bridge received all 15 input bytes, but PowerShell returned 14. The raw byte-stream canary passed in 1601 ms.
- After the passing canary, the test command waited for an orphaned stdio daemon after Zotero exited. Stopping that specific daemon allowed the command to exit 0. This teardown observation does not affect the canary assertion; it should be investigated before relying on automatic cleanup after abrupt host exit.
- Final `npm run lint:check`, `openspec validate generalize-windows-stdio-process-bridge --strict`, and `git diff --check` passed. `openspec instructions apply` reports `all_done`, 9/9 tasks.
