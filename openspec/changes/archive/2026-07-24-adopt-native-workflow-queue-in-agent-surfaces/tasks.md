## 1. Contract and regression tests

- [x] 1.1 Add shared submission-seam tests that preserve Input Planning v2 units and hold queue slots through terminal apply
- [x] 1.2 Add Host Bridge tests for queued submit results, host options, active submission inspection, pending cancellation, and submission-scoped tasks
- [x] 1.3 Add CLI parser/route tests for host options, queue commands, submission inspection, and submission task filters
- [x] 1.4 Replace Librarian external plan-entry tests with native queue delegation, authority, receipt, and retained resident-domain tests
- [x] 1.5 Add semantic parity and relative materialized-depth validator tests pinned to e63

## 2. Shared runtime admission

- [x] 2.1 Add the prepared-workflow submission seam and migrate UI queue/direct execution into it
- [x] 2.2 Migrate Host Bridge Zotero-managed submit to the shared seam and remove the batch-flatten bypass
- [x] 2.3 Extend queue controllers with safe active pending/admitted submission snapshots
- [x] 2.4 Propagate opaque submission lineage into job/task metadata without exposing member identities or provider payloads
- [x] 2.5 Parse request-scoped Host queue options through the workflow host-options SSOT

## 3. Host Bridge and CLI controls

- [x] 3.1 Add queue list, pending cancel, active submission, and submission task-filter workflow control operations
- [x] 3.2 Add authenticated HTTP routes and queued/direct submit status handling
- [x] 3.3 Add Rust CLI commands and payload/result mapping
- [x] 3.4 Extend the Agent Surface catalog with exact command, handle, effect, approval, and recovery facts

## 4. Librarian state ownership

- [x] 4.1 Remove profile-owned workflow plan/entry schema, commands, reservation, batching, and replay logic while leaving old data inert
- [x] 4.2 Preserve and verify watched runs, notifications, attention, catalog/index, maintenance, receipts, and read-only cron behavior

## 5. Agent-facing semantics and governance

- [x] 5.1 Update project and semantic-review hard constraints for no compression and relative baseline depth
- [x] 5.2 Update Minimum queue/submission operating guidance without changing unaffected instructions
- [x] 5.3 Update Generic bounded workflow handoff guidance while preserving all Input Planning v2 and task-policy depth
- [x] 5.4 Replace only Hermes external queue instructions with equally detailed native submission, observation, and recovery guidance
- [x] 5.5 Extend the existing package validator for pinned materialized baseline comparison

## 6. Verification and governed outputs

- [x] 6.1 Run focused TypeScript, profile, CLI, and OpenSpec validation and resolve failures
- [x] 6.2 Complete semantic review with zero unmapped, downgraded, duplicate, unauthorized dropped, or depth-regression results
- [x] 6.3 Render and check Host Bridge content and release-set drift without publishing
- [x] 6.4 Refresh and validate the Chinese Host Bridge ownership review mirror
- [x] 6.5 Run final relevant repository gates and record results
