## ADDED Requirements

### Requirement: ACP Skills dependency preparation SHALL use a cancellable total deadline

Normal and recovered ACP Skills runs SHALL coordinate dependency preparation with background warmup and other runs, using a default fifteen-minute total deadline. Setup cancellation SHALL release the run's wait promptly and late completion SHALL NOT launch an adapter or overwrite terminal state. Existing backend wrapping and Python fallback rules SHALL remain applicable.

#### Scenario: Cold preparation exceeds two minutes
- **WHEN** valid dependency preparation requires more than two minutes but completes within the total deadline
- **THEN** the run SHALL continue through its existing ACP startup path.

#### Scenario: Setup is canceled during dependency preparation
- **WHEN** a normal or recovered run cancels while waiting for dependencies
- **THEN** its existing cancellation lifecycle SHALL settle promptly
- **AND** a later dependency result SHALL NOT start that run's ACP adapter.

#### Scenario: Retry consumes the remaining budget
- **WHEN** uv exits non-zero and receives its existing one permitted retry
- **THEN** the retry SHALL use only the remaining preparation deadline
- **AND** timeout, cancellation, unavailable and launch failure SHALL NOT trigger that retry.

### Requirement: Dependency diagnostics SHALL report the actual preparation result

ACP Skills SHALL publish preparation-start and result events using its existing run diagnostics. Failed preparation SHALL retain `runtime_dependencies_injection_failed` and bounded adapter, outcome, duration and stderr evidence. Audit timelines SHALL report failure as failure rather than successful resolution, and diagnostics SHALL use existing redaction rules.

#### Scenario: Large download times out
- **WHEN** dependency preparation times out after emitting download progress
- **THEN** the failure diagnostics SHALL retain the available stderr summary
- **AND** the audit result SHALL be an error rather than a successful dependency-resolution message.
