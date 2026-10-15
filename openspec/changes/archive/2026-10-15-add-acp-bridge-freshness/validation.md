# Validation

## Implemented behavior

- Public command: `npm run check:acp-ws-bridge-freshness` (JSON, read-only, nonzero on failure).
- Windows `prebuild:acp-ws-bridge` uses locked Cargo compilation and an explicit target output directory, invalidates local evidence before compilation, checks unchanged inputs, packages verified bytes and rechecks freshness.
- `package:acp-ws-bridge` requires source-bound local evidence; it cannot certify an old executable against changed inputs.
- Preflight defaults to a single final build after all required checks pass. Explicit check-only/preparation-only requests and an outer build retain their ownership.

## Successful checks

- `npm exec --no -- tsx node_modules/mocha/bin/mocha tests/acp/166-acp-websocket-bridge-packaging.test.ts --require tests/setup/zotero-mock.ts --timeout 10000`: 31 passing. Includes source addition/deletion/modification, unrelated work/line endings, malformed/missing evidence, binary/sidecar tampering, CLI status, failed/changing-input builds preserving packaged output, standalone packaging and existing XPI checks.
- Prettier check and ESLint on ACP scripts and the changed test: passed. `package.json` formatting and `git diff --check`: passed.
- `openspec validate add-acp-bridge-freshness --strict`: passed.
- Actual Windows `prebuild:acp-ws-bridge`, independent `package:acp-ws-bridge`, and freshness check: passed. Cargo used its valid incremental cache; no Rust source change was required.
- ACP build fingerprint: `9650b9ecc7dded2b283c1f5a8a8154769e046d6829187a461db786591eaca059`; source HEAD: `9d4fc974f1e2c4c55fd4172fa5957d32158fc39d`.
- Packaged exe: 562688 bytes, SHA-256 `5efa9797146c430e09bef7af442ff7bc3168d0273e22e3c69c71a9b381bd6e06`. Exe and `.sha256` remain byte-equal to tracked files; `zotero-acp-bridge.build.json` is newly generated.
- Existing native-asset backup: `C:\Users\leike\AppData\Local\Temp\zs-acp-native-backup-C1z5TL`.
- `check:host-bridge-cli-prebuild-freshness`: passed on all seven platforms; `check:host-bridge-content` and `check:host-bridge-doc-sync`: passed (27 existing advisory depth warnings).
- `check:canonical-literature-validators` and `check:builtin-workflow-manifest`: passed (162 files).
- `check:help-docs`: passed (504 docs, 53 assets). This validates existing help output, not a new build.
- Four `check:synthesis-*` package typechecks and root/sidebar/dashboard/synthesis `tsc --noEmit`: passed.
- `test:node:shards:list`: passed; existing ACP test remains covered by the normal shard runner.
- Isolated topic-synthesis rendering: all four packages match their path inventories and file bytes (11/11, 10/10, 10/10, 10/10 files; 41 total).
- Isolated literature-deep-reading rendering from an 890-file source snapshot: graph templates 13/13 and built-in package 23/23 match. Only the existing Python bytecode cache was excluded. Input hashes before/after rendering match; snapshot/current `package.json` SHA-256 is `268223f0fd7fb41f441f39a6c35003ee721c725f188cc0045ae7ec38dc04dc6b`.
- External skill checkouts match index gitlinks and have no internal changes: literature-analysis `5748a71ed2acb6614c071e0ddc81a6ad6bcf969c`, literature-explainer `0a7306d12b42732747503c5d77f02cf3af3de88b`, literature-translator `11c3b3579d8e3e9d308b94dcfce445dd1e8dcc40`.
- Isolated comparison evidence is retained at `C:\Users\leike\AppData\Local\Temp\za-preflight-20261015\logs\preflight-isolation-report.md` and `commands.log`. Generated comparisons did not modify workspace files.

## Full-build blocker

`check:synthesis-sidecar-runtime-freshness` fails on all seven platforms: current build fingerprint is `ca60e06b2bbaaee85b905b844db8a6bd1f60dd0698e4b9e9f10aade141e4c0ea`, while packaged bundles record `375c285fb1397ac7940db2fbeeb78a4e6758424372babbebf7f83a7915fc7914`.

The existing Synthesis build identity hashes the entire `package.json`. Recomputing with only the HEAD version of that file substituted in memory reproduces the packaged fingerprint exactly, proving the new ACP npm command/description is the cause. No identity input, manifest or source file was reverted or weakened.

The preflight correctly stops before `npm run build`; no new XPI was produced or validated. Completion requires separately authorized commit/push of this change and an exact seven-platform Synthesis prebuild/synchronization for the pushed source. No commit, push or remote dispatch was performed.
