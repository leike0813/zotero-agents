## 1. Lightweight Synthesis Options

- [x] 1.1 Add a Synthesis service facade for bounded workflow topic options.
- [x] 1.2 Route `synthesis.topics` workflow parameter resolution through the bounded facade instead of full Workbench snapshots.

## 2. UI Descriptor Callers

- [x] 2.1 Add a descriptor option to skip dynamic option resolution.
- [x] 2.2 Use the lightweight descriptor path in workflow menu preflight and dashboard summaries.
- [x] 2.3 Keep full dynamic options for editable workflow settings views.

## 3. Verification

- [x] 3.1 Add or update tests proving menu/dashboard paths do not call full Synthesis snapshots.
- [x] 3.2 Validate OpenSpec change, run targeted tests, typecheck, and format check.
