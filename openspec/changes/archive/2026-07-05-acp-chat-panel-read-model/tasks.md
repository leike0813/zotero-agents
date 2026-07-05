## 1. OpenSpec

- [x] 1.1 Add proposal, design, and task artifacts.
- [x] 1.2 Add a delta spec for ACP Chat panel read-model publication.

## 2. Tests

- [x] 2.1 Add source guards proving ordinary ACP Chat snapshot posting and page
  requests do not refresh backends.
- [x] 2.2 Add read-model coverage for structural ACP Chat snapshots with a
  selected transcript page.
- [x] 2.3 Add read-model coverage for page read failure returning panel chrome.
- [x] 2.4 Add typed change/filter coverage for active, background, and append
  changes.
- [x] 2.5 Preserve existing ACP Skills and SkillRunner virtualization smoke
  coverage.

## 3. Implementation

- [x] 3.1 Add `prepareAcpChatPanelSnapshot()` and shared ACP Chat page scope
  helpers.
- [x] 3.2 Add ACP Chat typed panel snapshot changes and subscription API.
- [x] 3.3 Replace ordinary ACP Chat host publication with no-refresh panel
  snapshot posting.
- [x] 3.4 Keep backend refresh only at explicit lifecycle/backend-selection
  boundaries.
- [x] 3.5 Keep shared frontend subscription metadata duties without driving ACP
  Chat transcript panel publication.

## 4. Validation

- [x] 4.1 Run focused ACP session manager/read-model tests.
- [x] 4.2 Run ACP UI smoke tests.
- [x] 4.3 Run TypeScript type check.
- [x] 4.4 Run OpenSpec validation and touched-file format/lint checks.
