## 1. OpenSpec

- [x] 1.1 Create proposal, design, tasks, and delta specs for SkillRunner state convergence
- [x] 1.2 Validate the OpenSpec change

## 2. State Convergence

- [x] 2.1 Apply jobs endpoint terminal/waiting status from RunDialog metadata sync to run store, workflow tasks, and dashboard history
- [x] 2.2 Treat pre-ready create/upload failures as visible failed outcomes instead of recoverable observer detachment

## 3. Tests And Verification

- [x] 3.1 Update pre-ready upload failure integration expectations
- [x] 3.2 Add job queue pre-ready failure coverage
- [x] 3.3 Add run-dialog jobs status convergence coverage
- [x] 3.4 Run focused mocha tests, `npm run check:ssot-invariants`, `npm run lint:check`, and `npm run test:node:core` when risk allows
