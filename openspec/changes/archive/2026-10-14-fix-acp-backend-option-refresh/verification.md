# Verification

Executed on Windows, 2026-10-14, working tree based on `d03aafa89c9a753ad18f1ef2b2aba805360a492a`. No commit, dependency installation, saved-profile migration or user OpenCode configuration change was performed.

## Changes and targeted checks

- Complete provider drafts use replacement semantics through descriptor, persistence and execution. Backend switching clears schema-owned backend options; workflow parameters, timeout, approval and Host queue settings survive.
- Both forms separate observed current from explicit overrides, prepare selected reasoning catalogs without prompting, preserve input during refresh and reject unavailable selections in place. Preparation is serialized per form and canceled on selection replacement or close.
- Reasoning catalogs use raw model, effective mode, configuration fingerprint and parent revision, capped to 16 contexts. Startup/recovery validate reasoning after applying mode/model, preserving backend RPC errors.
- Presets and multilingual documentation use `OpenCode ACP` / `OpenCode ACP (Legacy)`; new modern profiles use `acp-opencode2` with existing suffixes. Existing IDs and isolation roots remain unchanged.

Targeted Mocha checks use `node --import tsx node_modules/mocha/bin/mocha ... --require tests/setup/zotero-mock.ts --timeout 10000 --exit`:

| Group | Files | Result |
| --- | --- | --- |
| Settings, dashboard, provider profile, presets | UI 35/50, dashboard 242/250/251, runtime 57/181, workflows 49 | 172 passing |
| ACP runtime integration | ACP 111/96/167 and SkillRunner 107 | 241 passing |
| Final probe checks, including cleanup total-budget regression | ACP 111 | 23 passing |

Tests first reproduced complete-draft resurrection, selected-model reasoning removal/addition, stale descriptor replies and stalled cleanup beyond the total budget. Existing raw-ID, explicit provider-switch and `-32601`/`-32602`/`-32603` checks pass in the targeted groups.

Changed TypeScript source/tests pass ESLint and Prettier checks; `git diff --check` passes. Change and affected main OpenSpec specifications validate; existing placeholder Purpose and long-requirement warnings remain outside this change.

The wider ACP-domain run reported nine failures in ACP 100 (npx/environment assertions), 178 (trace payload count), and 249 (missing fixture evidence). Their baseline status was not independently established; this report does not label that wider run successful.

## Build preparation and artifact

The project build-preflight verified seven-platform Synthesis sidecar and Host Bridge CLI freshness, Host Bridge content/doc synchronization, validators, builtin workflow manifest and external skill gitlinks. Isolated rendering and byte comparison of topic-synthesis and literature-deep-reading produced no drift.

- Synthesis sidecar fingerprint: `375c285fb1397ac7940db2fbeeb78a4e6758424372babbebf7f83a7915fc7914`.
- Host Bridge CLI fingerprint: `0e18bc9d76f0135bc4cff1ce38b363a7036e5f73c776ee2423ef4faf99e88f65`.
- Windows ACP bridge was built with `cargo build --release --locked --manifest-path rust/acp-ws-bridge/Cargo.toml --target x86_64-pc-windows-msvc` and synchronized with `npm run package:acp-ws-bridge`. SHA-256: `5efa9797146c430e09bef7af442ff7bc3168d0273e22e3c69c71a9b381bd6e06`.
- Original Windows bridge and generated help were backed up under the local temporary directory `zs-acp-build-backup-65b194b248cb4b7cb52becc2c4a12f88` before synchronization/generation.

`npm run build` passes, including shared package checks and the main/sidebar/dashboard/synthesis TypeScript configurations. The production XPI is `.scaffold/build/zotero-agents.xpi`. `npm run check:help-docs` passes for 504 documents and 53 assets; XPI sidecar verification confirms all seven required targets and no missing/forbidden entries.

## Isolated Zotero acceptance

The existing `npm run test:zotero:e2e` runner used Zotero 10.0.2 / Windows, an isolated profile/data, current-source local sidecar and `ZOTERO_TEST_GREP='System E2E runner foundation|AC-01|AO-01|AP-01'`.

- Passed: runner foundation and AP-01 skill materialization readiness.
- Failed: AC-01 stopped at Skill catalog preparation. The runtime log reports `NS_ERROR_FILE_NOT_FOUND` copying an existing builtin reference into a target path exceeding 260 characters, before mode/model/reasoning application. Long-path involvement is plausible, not proven.
- Failed: AO-01 assertion plus cleanup `NS_ERROR_FILE_IS_LOCKED`; family health became indeterminate.
- Overall: 4 selected, 2 passed, 2 failed; terminal state `incomplete`. This is not successful host acceptance.

Sanitized manifest: `artifacts/test-diagnostics/system-e2e/448b9d7c-7a29-48c1-81f6-8959256cafe1/run-manifest.json`. Raw isolated runtime data was not committed.

## Remaining limit

The user's current npx OpenCode version and real MiniMax `high` configuration were not exercised. OpenCode 2.0.27 upstream can omit MiniMax effort metadata; the plugin reports an unavailable explicit value rather than promising that version accepts `high`.
