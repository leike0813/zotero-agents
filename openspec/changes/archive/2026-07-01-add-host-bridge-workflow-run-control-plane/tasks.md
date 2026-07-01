## 1. OpenSpec Artifacts

- [x] 1.1 Create proposal, design, delta specs, and implementation tasks for the workflow/skill-run control plane.

## 2. Host Bridge API

- [x] 2.1 Add lightweight skill run DTOs, liveness/action derivation, and opaque handle resolution.
- [x] 2.2 Enhance workflow run status with `workflowRunId`, `skillRuns`, `currentSkillRunId`, liveness, and sequence step metadata.
- [x] 2.3 Add `/bridge/v1/tasks/active`.
- [x] 2.4 Add workflow cancel intent endpoint.
- [x] 2.5 Add skill-run get, reply, and connect endpoints.

## 3. CLI

- [x] 3.1 Add `workflow cancel`, `task active`, and `skill-run get/reply/connect` arguments.
- [x] 3.2 Wire CLI commands to Host Bridge endpoints and keep JSON output behavior unchanged.

## 4. Docs And Surface

- [x] 4.1 Update generated Host Bridge surface docs and wrapper skill references for the new commands and endpoints.

## 5. Verification

- [x] 5.1 Add or extend Host Bridge API tests for workflow skill run status, active tasks, cancel intent, reply, and connect.
- [x] 5.2 Add or extend CLI parser/path tests for new commands.
- [x] 5.3 Run focused host bridge and CLI test suites plus surface sync checks.
