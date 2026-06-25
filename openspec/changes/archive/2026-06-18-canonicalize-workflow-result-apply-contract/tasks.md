# Tasks

- [x] 1. Add OpenSpec delta specs for provider result normalization, workflow result resolution, apply hook consumption, and sequence handoff.
- [x] 2. Keep/formalize SkillRunner `/result` normalization in provider and reconciler paths.
- [x] 3. Tighten `WorkflowResultContext` / runtime result resolution so hooks can use canonical result and artifact APIs.
- [x] 4. Remove backend-envelope parsing from builtin apply hooks while preserving real business output field compatibility.
- [x] 5. Tighten sequence step handoff to require canonical `resultJson`.
- [x] 6. Add or update focused regression tests for provider normalization, result context artifact reads, hook cleanup, and sequence handoff.
- [x] 7. Run OpenSpec validation, focused mocha tests, TypeScript check, and diff check.
