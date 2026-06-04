## 1. Contract Documentation

- [x] 1.1 Update `SKILL.md` to document the ACP final envelope, fallback business result file, and host-unavailable cancel exception.
- [x] 1.2 Update `assets/runner.json` to declare `entrypoint.result_json_filename` and align the runner prompt with the new output boundary.

## 2. Runtime Result Boundary

- [x] 2.1 Change `persist_final_draft` to write `manuscript-literature-framing.result.json` and stop writing `result/result.json`.
- [x] 2.2 Change `cancel` to write `manuscript-literature-framing.result.json` and stop writing `result/result.json`.

## 3. Payload Gates

- [x] 3.1 Add deterministic minimum field-group validation for the four framing analysis actions.
- [x] 3.2 Add paragraph-level minimum field validation for `persist_writing_plan`.

## 4. Validation

- [x] 4.1 Run focused runtime checks for final draft, cancel, analysis rejection/acceptance, and writing-plan rejection/acceptance.
- [x] 4.2 Run OpenSpec validation for `harden-manuscript-literature-framing-runtime-contract`.
