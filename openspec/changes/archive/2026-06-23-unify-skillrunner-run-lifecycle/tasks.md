# Tasks

## 1. Design Artifacts

- [x] 1.1 Create the `unify-skillrunner-run-lifecycle` OpenSpec change.
- [x] 1.2 Document that `tolerate-skillrunner-terminal-failure` is superseded by
      this broader lifecycle change.
- [x] 1.3 Define the minimal persisted `SkillRunnerRunRecord` model.
- [x] 1.4 Define the dynamic `SkillRunnerRunProjection` model and cascade rules.
- [x] 1.5 Define submit phase, lifecycle status, observer failure, terminal
      ownership, and UI behavior rules.
- [x] 1.6 Add code-draft seam signatures to `design.md` only.
- [x] 1.7 Add delta specs for `provider-adapter`,
      `workflow-execution-seams`, `task-runtime-ui`, and
      `task-dashboard-skillrunner-observe`.
- [x] 1.8 Add `doc/components/skillrunner-run-lifecycle-ssot.invariants.yaml`.

## 2. Design Validation

- [x] 2.1 Run `openspec validate unify-skillrunner-run-lifecycle --strict`.
- [x] 2.2 Confirm the new invariant YAML is documented as future checker wiring
      and is not added to the current checker whitelist in this design-only
      round.
- [x] 2.3 Confirm model terminology is consistent across design, delta specs,
      and invariant ids.

## 3. Future Runtime Implementation

- [x] 3.1 Replace the current SkillRunner run persistence shape with
      `SkillRunnerRunRecord` schema `3.0.0`.
- [x] 3.2 Allocate `runKey` before backend request creation for every single job
      and sequence step.
- [x] 3.3 Attach `requestId` to the existing `runKey` on `request-created`
      without re-keying or inserting a replacement task row.
- [x] 3.4 Route single SkillRunner jobs and sequence SkillRunner steps through
      the same run lifecycle seam.
- [x] 3.5 Remove synthetic sequence step job projection ownership.
- [x] 3.6 Make observer failures after `requestId` non-terminal and recoverable.
- [x] 3.7 Make task list, dashboard, workspace, and history surfaces consume
      SkillRunner projections only.
- [x] 3.8 Make recovery scan local SkillRunner run records as SSOT only.
- [x] 3.9 Add `SKILLRUNNER_SSOT_FACTS.runLifecycle` and wire the new invariant
      YAML into `check:ssot-invariants`.

## 4. Future Verification

- [x] 4.1 Add focused tests for runKey identity stability across
      pre-request -> request-created -> request-ready.
- [x] 4.2 Add focused tests that post-request observer failures detach
      observation but do not terminalize run, step, sequence, or UI row.
- [x] 4.3 Add focused tests that sequence steps and single jobs use the same
      SkillRunner run lifecycle path.
- [x] 4.4 Add focused projection tests for backend/workflow/skill/sequence
      cascade fields, including missing backend config behavior.
- [x] 4.5 Run runtime verification only in the implementation phase.
