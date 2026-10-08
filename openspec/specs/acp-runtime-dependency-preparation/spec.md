# acp-runtime-dependency-preparation Specification

## Purpose

Prepare ACP workflow Python dependencies ahead of use and coordinate concurrent preparation without treating plugin readiness metadata as proof that an execution environment is usable.

## Requirements

### Requirement: Startup warmup SHALL follow the available workflow catalog

After plugin initialization, enabled ACP backends SHALL trigger asynchronous warmup of the dependency combinations declared by loaded compatible workflows' valid Skills. Each Skill's dependency constraints SHALL remain independent. Catalog and backend configuration changes SHALL reconcile pending warmup work.

#### Scenario: Startup contains a declared sequence
- **WHEN** an enabled ACP backend supports a loaded workflow with multiple declared Skill steps
- **THEN** its valid Skill dependency combinations SHALL be warmed without blocking plugin initialization
- **AND** equivalent combinations SHALL be deduplicated within the same preparation context.

#### Scenario: Workflow is not available for ACP
- **WHEN** a workflow is filtered out, incompatible with ACP, or has no enabled compatible ACP backend
- **THEN** it SHALL NOT create background preparation work.

#### Scenario: Dynamic hook selects another Skill
- **WHEN** execution selects a Skill not discoverable from the workflow declaration
- **THEN** that Skill SHALL be prepared on demand without executing workflow hooks during startup.

### Requirement: Preparation SHALL serialize work and share only equivalent contexts

Dependency preparation SHALL run at most one subprocess at a time. Foreground work SHALL precede pending background work. Concurrent requests SHALL share preparation only when dependencies, resolved command, effective environment and working directory are equivalent. A completed warmup SHALL NOT replace a task's own readiness validation.

#### Scenario: Four cold tasks start concurrently
- **WHEN** four tasks request dependencies with different run working directories
- **THEN** their preparation subprocesses SHALL run serially and reuse the dependency tool's own cache
- **AND** each task SHALL validate its own execution context.

#### Scenario: Equivalent requests overlap
- **WHEN** requests with equivalent preparation contexts overlap
- **THEN** they SHALL share one in-flight preparation and independently receive its result.

#### Scenario: Foreground request arrives during warmup
- **WHEN** a foreground request arrives while one warmup is running and others are pending
- **THEN** the running work SHALL finish or cancel normally
- **AND** the foreground request SHALL precede pending warmups.

### Requirement: Preparation waiting and ownership SHALL be bounded

Foreground dependency preparation SHALL have a default fifteen-minute total deadline including queueing and retries. Cancellation SHALL release only the requesting waiter. Preparation SHALL stop when no waiter or background owner needs it. Plugin shutdown SHALL stop admission, settle pending work and terminate active work with bounded cleanup.

#### Scenario: One shared waiter cancels
- **WHEN** one of several waiters cancels
- **THEN** it SHALL settle promptly as canceled without canceling another waiter's preparation.

#### Scenario: Deadline expires while queued
- **WHEN** a request exhausts its total deadline before execution starts
- **THEN** it SHALL fail as timed out and SHALL NOT later launch a preparation subprocess for that expired waiter.

#### Scenario: Preparation finishes after shutdown
- **WHEN** preparation finishes after its owner has shut down
- **THEN** it SHALL NOT admit more work or publish readiness for a canceled run.

### Requirement: Warmup failures SHALL remain recoverable

Warmup SHALL report bounded failure diagnostics and continue with other dependency combinations. It SHALL attempt each combination once per catalog coordination and SHALL NOT automatically loop failed work. A later foreground request SHALL be allowed to prepare that combination again.

#### Scenario: Network unavailable during startup
- **WHEN** one background dependency combination fails
- **THEN** initialization SHALL remain successful and other combinations SHALL remain eligible for preparation
- **AND** a foreground run SHALL NOT inherit a permanently cached failure.