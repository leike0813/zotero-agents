## 1. Contract And Runtime Tests

- [x] 1.1 Add focused gate-runtime tests for the two interactive decisions,
  stage ordering, automatic post-scope progression, metadata acceptance, PDF
  route coverage, idempotent retries, and corrupt-state blockers.
- [x] 1.2 Replace brittle Literature Search Ingest prompt-text assertions with
  package, interactive runner, schema, and current contract assertions.
- [x] 1.3 Add Host Broker regression tests for native DOI mapping,
  unsupported-type Extra storage, and conflicting DOI rejection.

## 2. Interactive Gate Runtime

- [x] 2.1 Add the runtime action schema and stage playbook for search-plan,
  discovery, ingest-scope, metadata, PDF, payload preparation, and ingest
  receipts.
- [x] 2.2 Implement the dependency-free JSON stage runtime with atomic state
  updates, payload hashes, deterministic validation, and per-paper typed ingest
  payload generation.
- [x] 2.3 Implement the gate entrypoint that exposes the next legal action,
  exactly two waiting states, recovery information, and automatic progression
  after ingest-scope approval.

## 3. Skill And Workflow Contract

- [x] 3.1 Rewrite the current-state Skill as an interactive gate-first workflow
  with explicit LLM/script responsibilities and no SQLite or result renderer.
- [x] 3.2 Update runner and workflow versions/configuration while keeping
  SkillRunner execution and workflow request modes interactive.
- [x] 3.3 Update package documentation for the two decision gates and automatic
  post-scope stages.

## 4. Host DOI Normalization

- [x] 4.1 Map normalized DOI identifiers to the native DOI field when supported,
  preserve Extra only for unsupported item types, and reject conflicting DOI
  representations.

## 5. Verification

- [x] 5.1 Run focused runtime/workflow/Host tests and fix regressions.
- [x] 5.2 Run builtin manifest and SSOT checks, TypeScript checks, formatting,
  and strict OpenSpec validation.
- [x] 5.3 Review the finished Skill against Skill Smith trigger, thickness,
  reference routing, LLM/script boundary, failure recovery, current-state, and
  safety gates.

## 6. Semantic-preserving Skill Rewrite

- [x] 6.1 Add a rule-group semantic preservation matrix using only
  `preserved_in_main`, `strengthened_in_main_and_reference`, and
  `authorized_correction`.
- [x] 6.2 Make `SKILL.md` independently executable with complete Stage 10-70
  commands, payloads, completion conditions, recovery rules, typed payloads,
  and completed/canceled outputs.
- [x] 6.3 Replace the generic stage playbook with deep planning/discovery,
  metadata, PDF, and ingest/output/recovery references directly routed by the
  gate.
- [x] 6.4 Update runner and workflow documentation for cumulative discovery,
  two waiting stages, and automatic post-scope execution.

## 7. Strict Schema And Round-aware Runtime

- [x] 7.1 Implement a strict Draft-07 `oneOf` schema for every agent-authored
  action, including qualified/not-attempted metadata conditions and exact PDF
  route coverage.
- [x] 7.2 Add round-matched cumulative discovery, Stage 30 expansion, legal
  cancellation, stage-specific references, allowed actions, and terminal kind
  reporting.
- [x] 7.3 Add and run focused tests for every action branch, cumulative rounds,
  cancellation, post-scope automation, replay/tampering/input-drift blockers,
  reference routing, and skill structure.
- [x] 7.4 Run TypeScript, Prettier, ESLint, Ruff, workflow manifest, SSOT,
  strict OpenSpec, and diff validation gates; record only verified completion.
