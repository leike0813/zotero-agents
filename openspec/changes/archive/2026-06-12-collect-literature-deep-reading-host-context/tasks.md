## 1. OpenSpec Contract

- [x] Create proposal/design/tasks for `collect-literature-deep-reading-host-context`.
- [x] Add a `literature-deep-reading-skill` delta spec for Stage 10 Host context collection.

## 2. Runtime and Schemas

- [x] Add `context-request.schema.json`.
- [x] Extend `deep_reading_runtime.py` with `submit-context-request` and `validate-context-request`.
- [x] Generate Host Context Layer views and diagnostics.
- [x] Keep Host Bridge collection best-effort and non-blocking.

## 3. Renderer and Generated Package

- [x] Update renderer to copy nested schema assets.
- [x] Regenerate `skills_builtin/literature-deep-reading/`.
- [x] Update package instructions and runner prompt.

## 4. Verification

- [x] Add focused tests for context request validation, fake Host Bridge calls, layout handling, and no-Host fallback.
- [x] Run focused literature deep-reading tests.
- [x] Run OpenSpec strict validation.
- [x] Run TypeScript no-emit check or targeted equivalent if full check is blocked by unrelated repository state.

