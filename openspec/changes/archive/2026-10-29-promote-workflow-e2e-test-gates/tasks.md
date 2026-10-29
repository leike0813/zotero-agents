# Tasks

## 1. Complete routine entrypoint

- [x] 1.1 Extend the existing gate plan/runner and package scripts without recursion; verify full membership, offline isolation, and failure propagation at the process boundary.
- [x] 1.2 Document complete versus narrow commands and required local prerequisites; verify the declared gate plans.

## 2. Required workflow CI cells

- [x] 2.1 Support explicit WF family selection and dedicated PR/main/release cells without changing existing promoted identities; run existing family and compatibility tests.
- [x] 2.2 Reuse portable Python preparation and initialize native/Skill prerequisites in required jobs; run research peer tests without a personal home project.
- [x] 2.3 Wire blocking job outcomes and retained evidence into CI/release; validate parsed workflows and actual compatibility plans.

## 3. Integration acceptance

- [x] 3.1 Run the complete local test entrypoint and repair in-scope failures; retain actual results and first-failure diagnostics.
- [x] 3.2 Run a compatibility-worker WF invocation with the CI environment and current-source candidate; require complete Manifest, cleanup and health.
- [x] 3.3 Run type/lint/format/OpenSpec checks and update project testing constraints and final evidence.

## Acceptance evidence

- Gate/Python peer tests: 7 passing. Family/compatibility tests: 146 passing,
  4 existing platform-specific pending cases.
- Synthesis Rust workspace, Host Bridge Rust (142 unit + 19 integration), and
  ACP bridge Rust (8) all passed. The Host Bridge argv test now compares its
  string path to a string, repairing the compilation failure exposed by the new entrypoint.
- Host capability runtime shard passed after resolver SSOT validation was moved
  before runtime acquisition. Installer/service tests: 9 passing after sharing
  Python selection and preventing environment synchronization under a fake HOME.
  The original installer test had already caused uv to recreate the shared local
  virtual environment; `UV_NO_SYNC` now prevents that side effect in these tests.
- Local compatibility worker: pinned Zotero 10.0.1, offline WF,
  current-source sidecar fingerprint
  `ce0b5b1ced07461965ac2770e1e377790b0dca40c1d9f1e9e0bcec7950798863`.
  Run Manifest `8f26bd6e-db4a-42f5-a44f-91a445c615fa` is complete, 2/2 passed,
  including WF-01; WF cleanup and health passed. Local invocation left the
  informational receipt flag at its default; planner tests separately verify
  WF cells are blocking, and CI supplies `ZOTERO_COMPAT_BLOCKING`.
- `npm test` executed the real full gate and correctly stopped at native
  stage1. Its first remaining failure is the orphan `TopicResolverProposal`
  schema definition. Native production also reported two research bundle
  fixtures without basic paper metadata and two runtime timeouts. These are
  failures, not accepted expected behavior.
- Full Node run completed all 28 shards: 21 passed and 7 failed. Resolver and
  installer failures have passing focused verification after repair. Remaining
  first-run failures were an export runtime timeout, a SkillRunner source-text
  assertion, cached Index loading state, a sidecar scheduler source-text
  assertion, and Workflow Host native-escape governance. None were skipped or
  changed into passing expectations. Logs: `/tmp/za-promote-node-all.log`.
- Independent host full verification passed core (25), UI (3), and workflow (1).
  Broad E2E reported PA-03 (local path in Topic hook output) and HB-03 (missing
  canonical mutation reconciliation) failures. That additional run was stopped
  with remaining cases incomplete; its verdict is not passing. Run Manifest:
  `4017ae5a-b5bd-4ece-80d9-00578b0ce2bf`. Log:
  `/tmp/za-host-full-final.log`. Task 3.1 remains open for a clean full-suite verdict.
- Root TypeScript, focused ESLint, Prettier, diff whitespace, and strict
  OpenSpec validation passed. Four additional tests now use the same Python
  helper, removing unconditional personal-project selection on clean CI runners.
  Their focused execution passed all 40 cases, including the export runtime
  case that timed out during the first full Node run. Four Node failures remain
  without a passing focused result: SkillRunner source text, cached Index
  loading state, scheduler source text, and Workflow Host native-escape governance.
- GitHub read-only inspection: main has deletion/non-fast-forward rules only;
  it has no required-status-check rule. Workflow changes do not enable that
  separate repository setting. No remote CI run, push, commit or publication
  was performed.
