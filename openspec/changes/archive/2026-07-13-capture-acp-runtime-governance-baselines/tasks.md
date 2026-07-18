## 1. Contract and Regression Tests

- [x] 1.1 Add failing tests for the debug feature switch, idle/recording/frozen capture lifecycle, sanitized baseline DTO, and atomic real-host save.
- [x] 1.2 Extend Dashboard and Assistant Workspace tests to lock profiler-tab visibility, selected-surface signature isolation, and absence from transcript/shared render keys.
- [x] 1.3 Extend release-elision tests to cover non-debug and source-switch-disabled builds.

## 2. Profiler Capture Core

- [x] 2.1 Add the hard-coded profiler feature switch in debugMode and make recorder activation honor both debug boundaries without allocating idle state.
- [x] 2.2 Implement the versioned governance baseline DTO, single R1/R2/R3 metric grouping, sanitized scenario metadata, and automated/host record builders.
- [x] 2.3 Implement the idle/recording/frozen capture controller, incomplete-capture warnings, immutable snapshots, atomic JSON save, and shutdown cleanup.

## 3. Dashboard Surface

- [x] 3.1 Add the conditional ACP Runtime Profiler tab, profiler-only snapshot/action handlers, and independent selected-surface signature.
- [x] 3.2 Add profiler-tab rendering, controls, grouped results, metric table, copy/save/open-folder feedback, localization, and styling without changing other tabs.

## 4. Deterministic Baseline and Documentation

- [x] 4.1 Replace the direct-recorder helper with a deterministic production-seam R1/R2/R3/buffered-work fixture and a narrow R3 test adapter.
- [x] 4.2 Add the guarded recording command and commit the generated before-governance JSON and Markdown artifacts.
- [x] 4.3 Document the Zotero 7/9 capture procedure and update the risk audit to reference the committed record and real-host mechanism.

## 5. Validation

- [x] 5.1 Run focused tests, baseline repeatability, release elision, build, lint, diff checks, and strict OpenSpec validation; resolve all task-scope failures.
