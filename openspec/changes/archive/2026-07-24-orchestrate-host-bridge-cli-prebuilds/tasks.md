## 1. Contracts and tests

- [x] 1.1 Add focused tests for source gates, exact request matching, resume, structured result validation, and no-dispatch local builds.
- [x] 1.2 Add synchronization tests for stale local aggregate recovery, identity conflicts, seven-platform completeness, and no partial local mutation.

## 2. Shared workflow orchestration

- [x] 2.1 Add the shared GitHub workflow-run helper for request ids, dispatch, exact run lookup, watch, validation, and artifact download.
- [x] 2.2 Migrate Host Bridge release and content-package workflow callers without changing their command-specific gates.

## 3. CLI prebuild flow

- [x] 3.1 Add the development-branch prebuild orchestrator with attached/clean/upstream/source/version gates and resume support.
- [x] 3.2 Extend the prebuild workflow with required request id, exact run naming, and the structured result artifact.
- [x] 3.3 Make prebuild synchronization validate and stage the explicit result identity before replacing local binaries and manifests.
- [x] 3.4 Split package commands between remote seven-platform prebuild orchestration and the existing local single-platform build.

## 4. Governance and guidance

- [x] 4.1 Update Host Bridge release Skill guidance at equal or greater semantic depth against baseline `1f27ba34c890678e4f158fc90b4f507338ae2ed9`, with an empty deletion inventory.
- [x] 4.2 Validate the OpenSpec change and record the build-only/publication isolation contract.

## 5. Verification

- [x] 5.1 Run focused Node and CLI packaging tests, TypeScript/lint/format checks, and prebuild freshness validation.
- [x] 5.2 Run Host Bridge content, Skill-package depth, semantic parity, review-mirror, and four-count gates without dispatching a remote workflow.

## Verification result

- Focused and expanded Host Bridge suites passed with 166 tests passing and 1
  existing pending test. The content-package release-script suite passed with
  26 tests.
- TypeScript, ESLint, Prettier, OpenSpec validation, content, documentation,
  review-mirror, and baseline Skill-package gates passed.
- The prebuild freshness command was executed and correctly rejected the
  pre-existing stale CLI fingerprint: the manifest records
  `7332a3f4c286d5d7c3d4571c5bcfec9cdfd7faee0abec14a98d91947d3944822`,
  while current build inputs produce
  `4ea784f06aa297105abac0ad2ba8b66f35d6e33dcb0755cb51d472aed3f28505`.
  This change does not bump the version or replace binaries without an
  authorized remote prebuild.
- No GitHub workflow, Host Bridge publication, source commit, push, or Gitee
  synchronization was triggered.
