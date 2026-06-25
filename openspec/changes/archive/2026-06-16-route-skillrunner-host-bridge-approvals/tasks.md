## 1. Contract

- [x] Add proposal, design, tasks, and delta specs for SkillRunner Host Bridge approval routing.

## 2. Runtime Scope Injection

- [x] Inject `ZOTERO_BRIDGE_SCOPE` for SkillRunner Host Bridge env requests.
- [x] Ensure SkillRunner requests have a stable scope request id before submission.
- [x] Add CLI support for `ZOTERO_BRIDGE_SCOPE`.

## 3. Permission Routing And UI

- [x] Route `skillrunner-run` Host Bridge permissions to SkillRunner run state.
- [x] Project SkillRunner pending permissions into the shared assistant panel permission UI.
- [x] Resolve SkillRunner permission actions from the run dialog/sidebar bridge.

## 4. Documentation

- [x] Update Host Bridge CLI and injection docs.

## 5. Verification

- [x] Add or update focused tests.
- [x] Run Rust CLI tests.
- [x] Run focused mocha tests.
- [x] Run TypeScript check.
- [x] Run OpenSpec strict validation.
- [x] Run `git diff --check`.
