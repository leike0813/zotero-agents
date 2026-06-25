## 1. Lightweight Read Models

- [x] 1.1 Add SkillRunner lightweight projection storage/query APIs with active-only, backendId, requestId, limit, and archived/sequence-root filtering.
- [x] 1.2 Add run-store diagnostics for full SkillRunner payload reads and lightweight projection reads.
- [x] 1.3 Add ACP skill-run summary APIs for active/count/list use cases without transcript or event cloning.

## 2. Scoped UI Refresh Paths

- [x] 2.1 Move dashboard home and periodic refresh paths to active lightweight task summaries and scoped backend/history reads.
- [x] 2.2 Move workspace/sidebar attention counts and waiting toasts to lightweight active summaries.
- [x] 2.3 Move active task popover reads to a visible-row-limited active summary query.
- [x] 2.4 Keep selected run, backend detail, recovery, and explicit diagnostic flows on full record APIs.

## 3. Background Timer Governance

- [x] 3.1 Add a background refresh governance helper or registry for long-lived timers and documented exemptions.
- [x] 3.2 Register or exempt all long-lived host-side interval timers.
- [x] 3.3 Ensure service health timers remain scoped to their own service/runtime/workspace state.

## 4. Verification

- [x] 4.1 Add unit tests for SkillRunner lightweight projection filtering and diagnostics.
- [x] 4.2 Add unit tests for ACP summary APIs excluding transcript/events.
- [x] 4.3 Add integration tests proving dashboard home, workspace attention, sidebar badge, and popover refreshes avoid full SkillRunner payload reads with many retained runs.
- [x] 4.4 Add governance tests covering long-lived interval registration/exemptions.
- [x] 4.5 Run targeted tests and OpenSpec validation for the change.

## 5. Follow-up Scoped Read Hardening

- [x] 5.1 Add metadata-only SkillRunner history summary counts and scoped/unscoped projection diagnostics.
- [x] 5.2 Move dashboard home refresh to active summaries plus aggregate history counts, with backend rows limited to selected backend scope.
- [x] 5.3 Add lightweight workflow task change subscriptions so UI refresh hooks do not build full task snapshots.
- [x] 5.4 Scope SkillRunner workspace model refreshes to active rows by default, keeping full records for selected/detail flows.
- [x] 5.5 Add tests for unscoped projection row reads and task change notification reads.

## 6. Third-pass Periodic O(N) Governance

- [x] 6.1 Add diagnostics for cache hits, dirty gates, metadata counts, and model builds on background refresh paths.
- [x] 6.2 Cache backend registry and workflow settings reads by raw preference text.
- [x] 6.3 Add active task and ACP run summary paths that avoid completed-record enumeration.
- [x] 6.4 Add dashboard home read cache and dirty gates so periodic/noisy refreshes do not rebuild unchanged metadata.
- [x] 6.5 Extend governance tests to assert no-op periodic refreshes avoid O(N) metadata/query/model-build work.
