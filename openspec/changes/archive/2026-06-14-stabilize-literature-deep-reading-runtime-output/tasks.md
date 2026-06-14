## 1. OpenSpec

- [x] 1.1 Add delta spec for literature deep reading runtime output stability.
- [x] 1.2 Validate the change with OpenSpec strict mode.

## 2. Runtime Output

- [x] 2.1 Generate translation batch view and batch input files after reading enrichment.
- [x] 2.2 Summarize command stdout and avoid returning large views/content inline.
- [x] 2.3 Normalize Preface cards to four stable slots.
- [x] 2.4 Add citation graph render diagnostics to final sections data.

## 3. Agent Instructions

- [x] 3.1 Update `SKILL.md` and runner prompt to use runtime-created translation batches.
- [x] 3.2 Strengthen subagent translation quality and main-agent review instructions.

## 4. Renderer

- [x] 4.1 Make Citation Graph a stable full-width section with non-cramped stage sizing.
- [x] 4.2 Add standalone graph DOM status and failure diagnostics.
- [x] 4.3 Regenerate `skills_builtin/literature-deep-reading`.

## 5. Tests

- [x] 5.1 Extend focused runtime tests for batching, stdout summaries, Preface slots, and graph diagnostics.
- [x] 5.2 Extend browser regression for graph render status and stage visibility.
- [x] 5.3 Run focused tests, Python compile, TypeScript check, OpenSpec validate, and diff checks.
