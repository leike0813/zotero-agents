## 1. OpenSpec

- [x] 1.1 Add proposal, design, and task artifacts.
- [x] 1.2 Add a delta spec for ACP Chat selected transcript page rendering.

## 2. Tests

- [x] 2.1 Add ACP Chat child smoke coverage for ready-without-page loading.
- [x] 2.2 Add ACP Chat child smoke coverage for wrong-scope page rejection.
- [x] 2.3 Add ACP Chat child smoke coverage for matching page rendering and
  scoped page requests.
- [x] 2.4 Add host guard coverage proving ACP Chat page requests are separate
  from ACP Skills and do not introduce forbidden refresh mechanisms.

## 3. Implementation

- [x] 3.1 Add ACP Chat selected page preparation in the assistant workspace
  sidebar.
- [x] 3.2 Route ACP Chat `load-transcript-page` actions through the scoped page
  reader with active-scope validation.
- [x] 3.3 Add ACP Chat child selected-page guard and virtualized page render
  path.
- [x] 3.4 Preserve the existing full/eager ACP Chat fallback when the preference
  is disabled.

## 4. Validation

- [x] 4.1 Run focused ACP session manager tests.
- [x] 4.2 Run ACP UI smoke tests.
- [x] 4.3 Run TypeScript type check.
- [x] 4.4 Run OpenSpec validation and touched-file lint/format checks.
