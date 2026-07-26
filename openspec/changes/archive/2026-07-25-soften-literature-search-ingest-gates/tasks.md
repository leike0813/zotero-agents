## 1. OpenSpec and semantic baseline

- [x] 1.1 Correct proposal, design, and delta specs to preserve the existing
  literature workflow while changing only gate mechanics.
- [x] 1.2 Record the baseline, semantic migration map, approved deletion
  boundary, direct-payload contract, and optional audit behavior.

## 2. Behavior-first tests

- [x] 2.1 Replace package-local gate runtime tests with stable tests for the two
  user decisions, mandatory metadata/PDF work, flexible delegation,
  independent payloads, incremental collection, and serial mutation.
- [x] 2.2 Update workflow/package tests for the new file inventory, runner
  prompt, unchanged parameter/output contracts, and apply behavior.

## 3. Skill and references

- [x] 3.1 Refactor `SKILL.md` to approximately 500 lines while preserving every
  business rule outside the approved deletion boundary.
- [x] 3.2 Update the search, metadata, PDF, and ingest/recovery references as
  current-state guidance with no obsolete gate protocol.
- [x] 3.3 Verify the static subagent prompt supports agent-chosen candidate sets,
  one output path per paper, direct Host payloads, and optional stdout audit.

## 4. Runner, workflow, and runtime assets

- [x] 4.1 Update runner prompt, workflow description, and workflow README
  without changing versions, schemas, or apply behavior.
- [x] 4.2 Delete `gate_runtime.py`, `stage_runtime.py`, `batch_runtime.py`, and
  `runtime-action.schema.json` after all retained responsibilities are mapped.

## 5. Validation

- [x] 5.1 Run OpenSpec, focused core tests, workflow tests, manifest and help-doc
  checks, TypeScript, Prettier, ESLint, and `git diff --check`.
- [x] 5.2 Complete semantic parity and current-state-only audits over the final
  Skill package.
