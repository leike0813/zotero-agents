## 1. OpenSpec Artifacts

- [x] 1.1 Create proposal, design, tasks, and change metadata.
- [x] 1.2 Add delta specs for the six affected capabilities.

## 2. Tests First

- [x] 2.1 Extend ACP transport and npx lease tests for pre-spawn cancellation, phase timeout, late settlement, and waiter isolation.
- [x] 2.2 Extend ACP compatible-runner and concurrent-submission tests for setup readiness, cancellation-first terminal publication, bounded cleanup, recovery, and Host-queued sequence resubmission.
- [x] 2.3 Extend sequence, workflow seam, and Host queue tests for provider-aware terminal convergence and exactly-once settlement.

## 3. Bounded ACP Startup

- [x] 3.1 Add the reusable bounded/cancelable wait primitive.
- [x] 3.2 Make npx lease acquisition and transport startup cancellation-aware with late-resource disposal.
- [x] 3.3 Apply independent 60-second limits to initialize, session attach/new, and initial runtime configuration.

## 4. Run Lifecycle Convergence

- [x] 4.1 Split setup and live controller ownership and publish connected only after session readiness.
- [x] 4.2 Reuse the setup cancellation gate for recovery and prevent late startup from reviving terminal runs.
- [x] 4.3 Publish task cancellation before bounded identity-safe cleanup; keep disconnect bounded and recoverable.

## 5. Sequence and Workflow Seams

- [x] 5.1 Propagate ACP failed/canceled terminal state to sequence step and parent and stop downstream steps.
- [x] 5.2 Make terminal observer and apply seams honor ACP/sequence terminal facts before pending provider promises.
- [x] 5.3 Verify Host admission releases the slot and submission identity exactly once without duplicate-guard special cases.

## 6. Documentation and Verification

- [x] 6.1 Update the ACP Skills state-machine SSOT for setup readiness, phase timeout, cancel, cleanup, and disconnect semantics.
- [x] 6.2 Run the focused test set and resolve failures.
- [x] 6.3 Run Node core tests, lint, build, SSOT invariant checks, and strict OpenSpec validation. The Node core run completed with 2939 passing, 62 pending, and five failing; the affected apply-seam failure was fixed and passed in isolation, while the remaining four unrelated failures reproduce independently.
- [x] 6.4 Review the final diff and record the outstanding Windows manual acceptance gate. OpenCode and Kilo Code still require 10 Windows rounds each at sequence concurrency 2 before this change can be archived.
