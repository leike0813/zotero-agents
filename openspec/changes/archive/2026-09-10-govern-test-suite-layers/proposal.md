## Why

The test suite had accumulated one oversized `core` bucket, duplicated suite-selection logic, Node-only checks in Zotero runs, and brittle assertions over source text and instructions. This made failures slow to locate and weakened the real-Zotero layer as evidence of host compatibility.

## What Changes

- Replace the shared `tests/core` bucket with production-ownership directories and independently runnable Node shards.
- Make each regular deterministic Node test belong to exactly one shard, with `npm test` running the complete Node inventory.
- Select Zotero tests directly from `tests/zotero/{core,ui,workflow}/{lite,full}`; `full` includes `lite` and no aggregate suite or title allowlist controls membership.
- Move stable Zotero API, SQLite, XPCOM, filesystem, subprocess, Reader, and main-window behavior into the real-host layer.
- Remove static instruction/source assertions, redundant environment-neutral copies, brittle private-host monkeypatches, and obsolete test-governance meta-tests.
- Make Node plus Zotero `lite` blocking for pull requests and Zotero `full` blocking for releases while retaining the Zotero 7/9/10 compatibility matrix.
- **BREAKING** Remove the former `test:node:{lite,full,core:*}` command family and the `tests/core` import paths used by test tooling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `test-suite-gating-strategy`: Define ownership-based Node shards, direct Zotero directory membership, and the blocking PR/release gate composition.
- `test-runtime-affinity-governance`: Define which behavior belongs in Node versus real Zotero and prohibit toxic/meta-test assertion classes.

## Impact

- Affects test files, test runners, package scripts, CI/release gate planning, Zotero test configuration, and testing documentation.
- Does not change production APIs or add dependencies.
- Developers use domain commands such as `test:node:runtime` and direct shard reruns instead of the former broad core/lite/full aliases.
