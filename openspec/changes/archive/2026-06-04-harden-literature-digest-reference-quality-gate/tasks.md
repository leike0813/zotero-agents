## 1. OpenSpec and Docs

- [x] 1.1 Add proposal, design, delta specs, and tasks for the reference quality gate.
- [x] 1.2 Add/update active docs and the skill upgrade recommendation artifact.

## 2. Workflow Apply Gate

- [x] 2.1 Add a workflow-local deterministic reference quality classifier.
- [x] 2.2 Filter references before generated references notes are written.
- [x] 2.3 Return structured `reference_quality` diagnostics from apply without changing the references artifact shape.

## 3. Synthesis Sidecar Fallback

- [x] 3.1 Add the same deterministic invalid-reference predicate to Synthesis sidecar ingestion.
- [x] 3.2 Skip invalid rows for legacy/imported/direct service inputs without filtering warning-only rows.

## 4. Tests and Validation

- [x] 4.1 Add classifier, workflow apply, and Synthesis sidecar tests.
- [x] 4.2 Run OpenSpec validation, targeted tests, TypeScript check, and build.
