# Tasks

## 1. Channel identity and preparation

- [x] 1.1 Import verified stable completion history and independent stable/dev version counters without changing active binaries.
- [x] 1.2 Implement isolated version preparation, channel-specific baseline planning, and exact-version prebuild freshness with packaging regression coverage.
- [x] 1.3 Preserve dev prerelease identity across all surfaces and bind channel/ref identity in release-set rendering with surface regression coverage.

## 2. Publication adapters

- [x] 2.1 Add channel-aware dispatch validation, receipt identity, recovery, and corresponding coordinator regression cases.
- [x] 2.2 Update the existing publication workflow to route all three mutable refs, serialize publication safely, and finalize only the selected source branch and channel history.
- [x] 2.3 Update all affected prebuild, plugin-build, schema, and history consumers without weakening exact-identity validation.

## 3. Verification and operation guidance

- [x] 3.1 Update release/prebuild operational Skills and release documentation for the approved dual-track workflow without changing agent-facing instruction semantics.
- [x] 3.2 Run relevant behavior suites, actual plan/temporary-fixture smoke, channel rejection checks, and OpenSpec validation; record observed evidence and limitations.
