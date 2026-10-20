# Tasks

## 1. Pre-merge baseline and evidence

- [x] 1.1 Record all 136 baseline methods, current owners, consumers, and approved changes in a source-fixed fixture and audit; verify no baseline entry is omitted or inferred from names alone.
- [x] 1.2 Reconcile seven domain behavior suites with the baseline and repair confirmed semantic regressions using red/green tests; report uncovered behavior explicitly.

## 2. Complete artifact operations

- [x] 2.1 Add a delayed real-route artifact regression, allocate manifest-owned 120-second budgets, document policy, and verify complete results beyond ten seconds.
- [x] 2.2 Add capacity regression through delivery/materialization ports, derive 401-entry capacity from the public schema, and verify byte/path bounds and manifest completion.
- [x] 2.3 Preserve typed native failures and Host Bridge status mapping with regression tests for timeout, unavailable, validation, conflict, and internal failures.
- [x] 2.4 Project artifact deadlines into CLI/MCP waiting windows and verify unrelated operations retain their previous waiting policy.
- [x] 2.5 Exercise complete local/remote exports, failure cleanup, and the 24-paper Planned Topic prepare producer; verify manifest/content correspondence and no successful handoff after failure.
- [x] 2.6 Restore the missing explicit Concept alias audit through the native application, grouped client, and Workbench; preserve idempotence, canonical facts, review actions and reopen behavior, and repair Concept query window semantics.

## 3. Integration acceptance

- [x] 3.1 Run focused TS/Rust behavior suites, cross-language/production checks, type checks, and OpenSpec validation; record commands and results.
- [x] 3.2 Run plugin build preflight and isolated current-source Zotero acceptance for the 24-paper preparation path; record any freshness or environmental blockers without claiming completion.
- [x] 3.3 Update current behavior documentation and final audit evidence with closed findings, remaining coverage, and final source status; verify no production fallback or unrequested release/commit.

## Acceptance status

Task 3.1 records completed execution, not an all-green gate claim: cross-language
coverage remains incomplete and service-boundary still reports the pre-existing
runtime_reset production-opener conflict.

Task 3.2 completed after the stale seven-platform sidecar and CLI fingerprints
were rebuilt and synchronized, the dev content package was republished as
`0.8.10-dev.9`, and the plugin build succeeded. The first isolated Windows
Zotero 10.0.2 acceptance run failed PA-03 with `reverse_host_result_invalid`;
the root cause was that the new host artifact descriptor note fields were
accepted by the contract but still rejected by the native reference host DTO
and the TypeScript refresh prepare rebuild. Both were aligned with the
contract, covered by a Rust and a TypeScript regression test, and the acceptance
then passed: PA-03 alone and the RH+PA family set (foundation, RH-01, RH-02,
PA-01, PA-02, PA-03) with a `complete` run manifest.

The audit distinguishes the captured 136-method source inventory, verified
current behavior, and missing historical consumer/E2E evidence; it does not
claim full behavioral equivalence.

Detailed commands and evidence: artifacts/synthesis-behavior-parity-audit-2026-10-20.md.
