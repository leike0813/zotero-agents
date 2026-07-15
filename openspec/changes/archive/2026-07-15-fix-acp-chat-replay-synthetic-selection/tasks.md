## 1. Synthetic Chat Activation TDD

- [x] 1.1 Add session-manager tests for prepared synthetic activation with an empty registry while the ordinary selector remains fail-closed.
- [x] 1.2 Add lease tests for real/empty foreground selection, repeated cleanup, stale token, partial activation failure, cancellation, and cleanup exceptions.
- [x] 1.3 Implement the debug/replay-only synthetic activation lease and finally-safe restoration/cleanup ordering.

## 2. Replay Target Lifecycle TDD

- [x] 2.1 Add target tests for Chat, Workflow, and synthetic target activation call count, owner identity, and strict lifecycle order across all surfaces.
- [x] 2.2 Add a production-shaped Chat `target-active` test that reaches replay, R2, R3, and drain without a registered synthetic backend.
- [x] 2.3 Add required idempotent `activate()` to Replay targets, centralize source owner identity, and invoke activation only for `target-active` before Workspace preparation.

## 3. Matrix Failure Evidence TDD

- [x] 3.1 Add matrix/report tests for phase-specific primary failure, cleanup warnings, not-run drain/stages, and setup-failure R1/R2/R3 coverage.
- [x] 3.2 Implement optional matrix v2 failure evidence and first-error/warning lifecycle handling without breaking legacy result reads.
- [x] 3.3 Tighten R1 captured criteria to completed positive replay with exact semantic counts, retaining transport not-applicable semantics.

## 4. Validation and Documentation

- [x] 4.1 Update Replay profiler documentation for target-owned activation, independent restoration, and stage-accurate failure evidence.
- [x] 4.2 Run focused replay/session/UI tests, TypeScript, ESLint, Prettier, strict OpenSpec, and `git diff --check`.
- [x] 4.3 Run runtime diagnostics release-elision and verify activation/lease markers contribute zero bytes to production and Replay-disabled bundles.
- [x] 4.4 Rerun the original Chat trace logical nine-run matrix and record exact R1/R2/R3/drain acceptance evidence when a Zotero host is available.

  Failed host acceptance on 2026-07-15: closed completed 3/3; open-inactive completed 2/3 with the cold warm-up failing `workspace-publication-timeout:acp-skills`; target-active failed 3/3 with `workspace-owner-ready-timeout:acp-chat`. Result: `/home/joshua/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/runtime/profiles/acp-replay/acp-replay-2026-07-15t10-41-23-627z-1__pre-governance__logical__2026-07-15T12-01-19-968Z-1.json`. A post-fix nine-run host result is still required.

## 5. Real-host Readiness Follow-up TDD

- [x] 5.1 Add session-manager regressions proving empty/real registry refresh and backend settings pruning cannot replace or delete a foreground owner held by the active synthetic lease; Chat panel availability still projects it and exact-owner public selectors remain fail-closed.
- [x] 5.2 Add publication-sidecar regressions proving a cold forced build that returns without a revision is retried, acknowledged by a later build, and never overlaps an in-flight build.
- [x] 5.3 Preserve lease-owned runtime/foreground during backend cache refresh and pruning, validate public selectors before their same-owner fast path, and retry idempotent Workspace diagnostics publication without overlapping builds.
- [x] 5.4 Rerun focused tests, TypeScript, formatting/lint, strict OpenSpec, release-elision, and diff checks after the real-host follow-up.

  Validation: 181 related Node tests passed and 2 real-Zotero-only tests remained pending under the Node mock; TypeScript, changed-file Prettier/ESLint, strict OpenSpec, release-elision, and `git diff --check` passed. Repository-wide `npm run lint:check` still stops on pre-existing formatting drift in unmodified `test/core/172-export-research-bundle-skill-runtime.test.ts` and `test/core/173-collection-collector-skill-runtime.test.ts`.

