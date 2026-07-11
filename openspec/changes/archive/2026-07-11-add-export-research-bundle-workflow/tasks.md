## 1. Prerequisite

- [x] 1.1 Complete and validate `support-binary-workflow-product-assets`.

## 2. Tests

- [x] 2.1 Add workflow/Skill manifest, parameter, gate, scoring, degradation, and cancellation tests.
- [x] 2.2 Add Product materialization tests for topic reports, all related metadata/payloads, core Markdown/images/PDF, warnings, provenance, and integrity.

## 3. Skill and workflow

- [x] 3.1 Add the gate-driven `export-research-bundle` skill schemas, scripts, and current-state instructions.
- [x] 3.2 Add the core workflow manifest, apply hook, shared package module, README, locales, and package registrations.

## 4. Verification

- [x] 4.1 Run focused and package workflow tests, typecheck, lint, manifest/localization checks, and strict validation for both changes.

## 5. Executable skill core

- [x] 5.1 Add behavior-first runtime tests for gate progression, Host discovery, semantic batches, deterministic scoring, and rendering.
- [x] 5.2 Replace the one-shot JSON shell with a SQLite gate/runtime, stage schemas, recovery views, and current-state instructions.
- [x] 5.3 Enforce the scoring and core-prefix contract again at the workflow apply boundary.
- [x] 5.4 Run focused runtime/workflow tests, typecheck, formatting, manifest checks, and strict OpenSpec validation.

## 6. Minimum complete skill contract

- [x] 6.1 Add contract tests for canonical stages, gate actions, payload schemas/enums, recovery, terminal outputs, and a reference-free package shape.
- [x] 6.2 Rewrite `SKILL.md` as the minimum complete executable contract, including schema-first payload examples and success/cancellation envelopes.
- [x] 6.3 Inline and remove the short runtime, discovery-planning, and paper-assessment references without retaining an empty references directory.
- [x] 6.4 Reduce the runner prompt to parameter injection and routing to the authoritative `SKILL.md` contract.
- [x] 6.5 Run focused and package tests, typecheck, Python compile, formatting, manifest checks, and strict OpenSpec validation.
