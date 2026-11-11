# Tasks

## 1. Current-instance readiness and delivery

- [x] 1.1 Add a failing owner regression for automatic replacement before the next call, then update readiness/binding and remove cached export connection; verify focused supervisor tests.
- [x] 1.2 Cover initialization supersession, shutdown, and replacement failure through existing owner interfaces; verify no old ready result/binding is published and document the lifecycle boundary.

## 2. Transfer diagnostics

- [x] 2.1 First add cause-preservation regressions, then preserve safe RPC/transfer causes and normalize known transfer failures through the existing client error type; verify RPC, Reverse Host, and audit tests including privacy checks.
- [x] 2.2 Correct the business audit test that asserts reason loss and document safe availability reasons; verify the existing business log fields carry the cause without raw error text.

## 3. Production composition coverage

- [x] 3.1 Extend the existing native export harness/scenario to exercise real handlers/broker and delivered manifests/files; verify local exports across instance replacement without fixture-supplied delivery success.
- [x] 3.2 Extend Zotero SL-01 to export synthetic managed artifacts through the default Bridge after automatic recovery, with existing family cleanup; document the distinction between discovery probes and default production acceptance.

## 4. Integration validation

- [x] 4.1 Run related tests, TypeScript/format/lint checks and OpenSpec validation; record actual counts and any failed checks.
- [x] 4.2 Complete build preflight and run the existing isolated Zotero recovery E2E entrypoint; verify current source identity, manifest/files, cleanup and health, recording any prerequisite that prevents acceptance.

## Workflow follow-up

- Archive or commit only when separately requested.

## Verification evidence (2026-11-10)

- Owner regressions first failed on the stale readiness connection, a shutdown waiter timeout, and a pre-initialization replacement Promise cycle; the final owner file has 32 passing tests.
- Cause regressions first failed on the transfer-only wrapper, business audit reason loss, and the missing native-consumed `details.reason`. The shared normalizer and HTTP projection preserve the cause through the real Rust receiver.
- Direct Mocha runs use `node node_modules/tsx/dist/cli.mjs node_modules/mocha/bin/mocha <files> --require tests/setup/zotero-mock.ts --timeout 30000 --exit`.
- Files 220, 225, 226, 228 and 231 (debug observability): 129 passing together. Files 182, 222 and 230: another 27 passing, from the earlier combined run with 226/228. Distinct coverage totals 156 before the native export scenarios below.
- File 229 with `--grep 'artifact export|production Reverse Host composition|moves large Topic and artifact content'`: 9 passing. This includes real-process replacement, production handlers/broker/HTTP/transfer, delivered file hashes, and a failed transfer whose safe cause survives Rust without creating an output directory. Total distinct related tests: 165.
- `cargo +nightly-2026-07-25 build --locked --offline --manifest-path rust/synthesis-sidecar/Cargo.toml -p synthesis-sidecar`: passed with current source; no Rust files changed.
- `node node_modules/typescript/bin/tsc --noEmit`, and the same command with `-p tsconfig.sidebar.json`, `-p tsconfig.dashboard.json`, `-p tsconfig.synthesis.json`: all passed.
- ESLint and Prettier checks on all changed TypeScript/tests/docs/change artifacts, `git diff --check`, and `openspec validate fix-synthesis-export-after-runtime-recovery --strict`: passed. SL-01 was linted but has not run in Zotero.

## Initial build / acceptance prerequisite

Preflight at `c2587796c2b5caa81314a1e2051f2d1aade7ddcf` on `dev`:

| Component check | Result |
| --- | --- |
| Synthesis sidecar runtime freshness | fresh, all seven platforms |
| Host Bridge CLI prebuild freshness | fresh, all seven platforms |
| Host Bridge content and doc sync | fresh; existing advisory depth warnings only |
| Builtin skill contracts, canonical validators, workflow manifest | fresh |
| Windows ACP bridge freshness | fresh |
| `npm run check:content-package-release -- --current-branch` | failed: dev GitHub feed does not match locally generated package semantics |

The existing `skills_builtin/literature-analysis` checkout is `c5951a302ef052dee67f8acec2ca570eda4b7851`, while its index gitlink is `68afd7ad2cecfbe7d12ad29815249e4407a2ce46`. Its pre-existing content changes are preserved. The content check generated dev version `0.8.10-dev.21` with ZIP digest `d726e659833389d63b4245fa8f408ec189bf2ea47e0730924aa72843117ac86f` before rejecting the feed comparison; this does not isolate the submodule as the only difference.

The build-preflight contract stops plugin builds while required content is stale. No version bump, commit, push, release, submodule reset, plugin build, or Zotero E2E was performed. Task 4.2 remains open. After the content input is aligned with the approved dev release, rerun preflight, then use the existing isolated `npm run test:zotero:e2e` with `ZOTERO_TEST_GREP='System E2E runner foundation|SL-01'` and the selected test Zotero binary. No acceptance claim is made for the currently installed plugin or the original topic run.

## Content alignment and build follow-up (2026-11-10)

The user authorized updating literature-analysis to its latest published package branch, bumping one dev patch, publishing to dev, and rerunning preflight. The upstream `skill/literature-analysis` head is `68afd7ad2cecfbe7d12ad29815249e4407a2ce46` (2026-11-05), already the parent gitlink; the earlier local `c5951a302` checkout was older (2026-10-19). The submodule is now clean at that verified latest SHA, with no gitlink change required.

Only `content-package.version.json` was committed and pushed as `00dfc1bce9488e452db8c48dabba83186ddf7a78`, changing dev `0.8.10-dev.21` to `0.8.10-dev.22` while formal `0.8.9` remains unchanged. Synthesis source/tests/docs remain uncommitted. The original dispatcher ran from a clean temporary checkout of that commit so the publication source is reproducible without changing the primary workspace's pending work.

- Content publication: https://github.com/leike0813/zotero-agents/actions/runs/42813609380 — success at the exact source SHA above.
- Release: https://github.com/leike0813/zotero-agents-workflows/releases/tag/official-workflows-v0.8.10-dev.22.
- ZIP: 5,197,034 bytes; SHA-256 `bd9ccc2c77ac645df7419fdd5eea2bb3eaa7d33f04e4ad5c518d5273333357c2`.
- `npm run check:content-package-release -- --current-branch`: passed for dev, including byte/checksum verification against GitHub.
- Builtin Skill contracts and workflow manifest: passed after submodule alignment. Content release script tests: 45 passing.
- All native freshness, Host Bridge content/doc sync and canonical validator preflight checks: passed again. No prebuild, Host Bridge publication, plugin release or Gitee synchronization was needed.
- `npm run build`: passed, including the package and four plugin/page TypeScript checks. `npm run check:help-docs`: passed.
- `npm run check:synthesis-sidecar-runtime-xpi -- --xpi=.scaffold/build/zotero-agents.xpi`: passed for all seven platforms. XPI SHA-256 `1f09db02387360082be2a874b658c75d144565a1570273bbbafc2303a604216f`.
- SL-01 acceptance passed with the existing isolated runner, Zotero 10.0.2, Committed Seed, and explicitly installed dev content `0.8.10-dev.22`: 2 selected, 2 passed, terminal state `complete`, cleanup and health both passed. Manifest: `artifacts/test-diagnostics/system-e2e/d2569216-f417-47c9-8499-1b91518b3a67/run-manifest.json`. It verifies automatic replacement followed by a default CLI export, delivered manifest, and synthetic managed digest body.
- Initial E2E attempts exposed two fixture mistakes: starting a separately bundled Bridge with no production owner, and treating filtered reference JSON as the original canonical payload. The final case obtains the actual plugin Bridge through its public preferences event and checks a managed digest's delivered text. Failed manifests are retained at run IDs `ca9e0133-7bcb-4908-8d5c-68e9cb961b0b`, `aec76eab-811b-4077-bcb5-66ec84aeab87`, and `2bcaf517-123f-4db9-98bc-d8add4b7f6fd`; none is counted as passed.
- E2E rebuilds the shared scaffold in test mode. The final production `npm run build` completed after acceptance; help-doc checks and the seven-platform XPI audit passed again. The deployable `.scaffold/build/zotero-agents.xpi` has SHA-256 `08d64b5ccaddad3718e43ea83124c63684a7b3e61d77ad8b5213f42d24aa918e`. This does not publish or install the plugin, and the original user topic run remains untouched.
