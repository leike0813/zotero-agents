# Verification — 2026-10-24

Baseline: `0b46a61e122635feb39c7f91b4c485d26629d8ea`, branch `dev`.
Existing note-payload changes were preserved. No commits, release, dependency
changes or real-library writes were performed.

## Diagnosis and implementation evidence

- Installed Zotero 7.0.32, 9.0.6 and 10.0.2 `app/omni.ja` use
  `@mozilla.org/zipwriter;1`. The old archive factory used
  `@mozilla.org/libjar/zip-writer;1`, bypassing native writing.
- The old stored ZIP encoder expanded every byte into numeric arrays. A 32 MiB
  input reproduced V8 heap OOM with `--max-old-space-size=192`; the new encoder
  passes the same constrained child-process test and independent CRC/ZIP checks.
- Native queue tests cover asynchronous completion, both callback layouts,
  failed writes, cancellation, changes before/during writing, temporary cleanup,
  destination preservation and callback failure isolation. The suite has 19 cases.
- Full/source-only exports in interactive/non-interactive modes pass through the
  declared hook. Modifying the original attachment after materialization leaves
  exported bytes intact. Feedback errors preserve the original business failure.
- Progress owner tests cover shared quota, independent callers, coalescing,
  invalid inputs, user dismissal, scope/global disposal, late calls and timer
  cleanup. Existing content-install progress callers retain their entry point.
- Stage copy lives in the package-local `literatureBundleProgress.mjs` resource
  for all 11 supported languages, with English fallback. Host copy remains owned
  by the existing notification UI. Product/request schemas are unchanged.

## Test results

The following combined command completed with **239 passing, 1 failing**:

```powershell
node_modules/.bin/tsx.cmd node_modules/mocha/bin/mocha tests/workflow-literature-workbench-package/47-workflow-literature-bundle.test.ts tests/workflows/48-workflow-execution-seams.test.ts tests/workflows/91-workflow-host-api-archive.test.ts tests/workflows/187-workflow-host-contract-governance.test.ts tests/workflows/builtin-skill-request-contracts.test.ts tests/tooling/194-research-bundle-service.test.ts tests/runtime/zip-store.test.ts --require tests/setup/zotero-mock.ts --timeout 15000 --reporter dot --exit
```

The failure is the existing `keeps official built-ins on exact v12 without native
escape hatches` static check: `lib/translatorArtifacts.mjs` and
`mineru/hooks/applyResult.mjs` contain `globalThis.Zotero` access. Both files are
unchanged here; `git show HEAD:<path>` confirms those accesses at baseline. The
exact Host callable projection and new API checks pass. The request suite validates
44 Skill/schema boundaries from 32 producers.

Also passed:

- `node_modules/.bin/tsc.cmd --noEmit`
- Changed TypeScript ESLint checks, repository-applicable Prettier checks and
  `git diff --check`.
- `openspec validate fix-literature-export-memory-and-progress --strict`
- `tsx scripts/run-node-test-shards.ts --list-shards`: the new ZIP test is assigned
  to `runtime-platform-persistence`.

## Encoder measurement

Local Node measurement of the actual encoder, one stored entry; elapsed time and
heap deltas are diagnostic observations, not acceptance thresholds. The updated
run used `--import tsx --expose-gc --max-old-space-size=192`.

| Input | Old elapsed | New elapsed | Old JS heap growth | New JS heap growth |
| --- | ---: | ---: | ---: | ---: |
| 8 MiB | 292 ms | 79 ms | ~154 MiB | 0.37 MiB |
| 32 MiB | 982 ms | 369 ms | ~806 MiB | 2.8 MiB |

Typed-array storage is outside the reported JS heap. The 32 MiB updated run's RSS
was about 163 MiB. These figures do not measure complete Zotero exports or native
compression; no end-to-end speedup percentage is claimed.

## Build preflight and remaining acceptance

Passed `npm run` checks:

- `check:synthesis-sidecar-runtime-freshness` — seven platforms.
- `check:host-bridge-cli-prebuild-freshness` — seven platforms, CLI 0.5.8.
- `check:host-bridge-content` and `check:host-bridge-doc-sync` — the latter emitted
  existing advisory instruction-depth warnings, with successful exit.
- `check:builtin-skill-contracts` — five packages byte-identical.
- `check:canonical-literature-validators`.
- `check:builtin-workflow-manifest` — 165 files, including the new stage resource.
- `check:acp-ws-bridge-freshness` — Windows executable/hash/build record aligned.

`npm run check:content-package-release -- --current-branch` fails:
`dev GitHub content feed does not match local generated package semantics`.
The current-branch check reconstructs a temporary package outside the workspace.
No published asset was changed. Newly added delivery files must also be included
when preparing the eventual release.

Under `.agents/skills/zotero-agents-build-preflight/SKILL.md`, this mismatch stops
plugin build. Updating the published package requires separate version/commit/push/
release authorization. Consequently no new XPI, real Zotero E2E run, 100-paper
end-to-end benchmark or real-window responsiveness verification is claimed.
After publication freshness is restored, use the existing isolated
`npm run test:zotero:e2e` runner with the current plugin and matching content package.
