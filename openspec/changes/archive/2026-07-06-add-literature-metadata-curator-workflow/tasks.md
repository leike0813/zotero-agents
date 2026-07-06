## 1. OpenSpec

- [x] 1.1 Add proposal, design, delta specs, and task list for the metadata curator workflow.
- [x] 1.2 Validate the change with strict OpenSpec validation.

## 2. Handler

- [x] 2.1 Add `handlers.parent.updateMetadata(parentRef, { fields, creators })`.
- [x] 2.2 Add focused handler tests for fields, creators, invalid-field skipping, and existing `updateFields` behavior.

## 3. Workflow and Skill

- [x] 3.1 Add `literature-metadata-curator` workflow manifest, hooks, README, package entries, locale keys, and builtin manifest entries.
- [x] 3.2 Add `skills_builtin/literature-metadata-search/SKILL.md`.
- [x] 3.3 Implement preflight DOI/ISBN Translate Search fast path and fallback context.
- [x] 3.4 Implement fallback `buildRequest` and canonical `applyResult`.

## 4. Tests and Verification

- [x] 4.1 Add focused workflow tests for preflight success/fallback, buildRequest, applyResult, loader, and packaging.
- [x] 4.2 Run focused tests and TypeScript validation.

## 5. Skill Contract Hardening

- [x] 5.1 Add automation-facing `literature-metadata-search` input/output schemas and runner metadata.
- [x] 5.2 Rewrite `literature-metadata-search/SKILL.md` with generic source-record semantics, metadata search strategy, evidence rules, and output discipline.
- [x] 5.3 Expand `literature-metadata-curator` README to match adjacent workflow documentation style.
- [x] 5.4 Add `literature-metadata-search` to ACP Chat injected skill materialization.
- [x] 5.5 Add focused tests for skill assets, schema validation, workflow input compatibility, ACP Chat injection, and content package eligibility.
- [x] 5.6 Run strict OpenSpec validation, focused tests, and TypeScript validation.
