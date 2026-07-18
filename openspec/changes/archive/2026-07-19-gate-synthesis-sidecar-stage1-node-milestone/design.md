## Context

The PR and release workflows already converge on `scripts/run-ci-gate.ts`, but
that orchestrator only runs governance checks and Zotero suites. The generic
Node shard runner already owns test discovery, setup files, isolated data
roots, cross-platform child processes, and summaries, so the milestone can be
added there without another runner implementation. A direct Core 175–217
baseline passes 346 tests but exposes the known Core 202 load-sensitive timeout
and the obsolete Core 213 source-order assertion.

## Goals / Non-Goals

**Goals:**

- Make all Core 175–217 tests a fail-closed, blocking milestone in PR and
  release gates.
- Keep one inventory source of truth and preserve deterministic diagnostics.
- Isolate Core 202 from prior in-process load without weakening or excluding
  it.
- Replace source-location and cleanup-order assertions with observable
  persistence and lifecycle behavior.

**Non-Goals:**

- Running the known-failing full Node suite in CI.
- Changing product APIs, storage, runtime assets, package dependencies, or
  GitHub workflow routing.
- Fixing unrelated localization governance or runtime freshness failures.

## Decisions

1. Extend `run-node-test-shards.ts` with a named suite instead of creating a
   second process runner. The suite resolver scans `test/core`, requires one
   Synthesis test for every number from 175 through 217, and rejects missing,
   duplicate, or misnamed members.
2. Execute three child-process segments: 175–201, Core 202 alone, and 203–217.
   Process isolation releases the earlier suites' memory and workers before
   the 100,000-reference profile while preserving the existing timeout and
   assertions.
3. Export pure suite resolution and CI gate-plan functions behind main-module
   guards. Governance tests can validate structured values rather than reading
   implementation source strings.
4. Add the milestone once to the shared gate stage plan. Existing PR, main,
   and tag workflows inherit it without duplicating membership or commands.
5. Remove the Core 213 source-order test because its stable claims are already
   covered by behavioral drain, cleanup-continuation, and capability-contract
   tests. Move Core 125's authors persistence claim into Core 207's existing
   create/read/reopen behavior test.

## Risks / Trade-offs

- [The milestone adds roughly two minutes to PR and release gates] → Keep the
  range limited to the Stage 1 proof and isolate only the demonstrated heavy
  case.
- [A new test number inside the closed range could be selected implicitly] →
  Require exactly one Synthesis file for each fixed number and test the
  fail-closed resolver.
- [The full gate cannot currently reach the Node stage locally] → Verify the
  pure gate plan and direct milestone, then record the unrelated localization
  failure without expanding this change.
