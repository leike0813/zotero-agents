# Design

## Context

See proposal.md for the live failure evidence. Dependency probes and uv wrapping live in `acpRuntimeDependencyWrapper.ts`; normal execution and recovery each call the planner. Workflow scanning already resolves valid Skill references. Subprocess capture currently returns empty output if pipe drains exceed the termination grace period. Existing setup controllers already carry cancellation signals.

## Goals / Non-Goals

**Goals:** hide scheduling and waiter ownership behind one preparation owner, reuse existing catalog semantics, and preserve subprocess evidence under cancellation and timeout.

**Non-Goals:** dependency locking, Python selection changes, new workflow/provider DTOs, new UI or modifications of production profiles during tests.

## Decisions

- Add a preparation scheduler with `prepare(context, execute, options)` and `shutdown()`; requests carry exact resolved command, normalized dependency set, effective environment and cwd. Share only active equivalent work. Serialize all execution; foreground jobs precede queued background jobs, without preempting an active job. Completed jobs leave the scheduler, keeping uv as the persistent cache owner.
- Every waiter owns a cancellation listener and total deadline. Removing the last waiter aborts the job. Abort and timeouts release waiters independently, while the active execution slot remains owned until the executor's bounded cleanup settles. Job execution has a fifteen-minute hard bound; a foreground waiter has fifteen minutes including queueing, and probe retries share the execution deadline.
- Keep task cwd/environment and interpreter selection unchanged. Warmup uses a managed runtime cwd and `--no-project`; it warms uv's package cache, not task correctness. Different run cwd/environment contexts validate separately but serial execution avoids simultaneous cold downloads.
- Add a lifecycle warmup owner subscribed to successful workflow scans and the backend preference. It consumes the existing Skill-reference mapper and valid registry entries, filters enabled compatible ACP backends, reads each runner once per reconciliation, and attempts deduplicated combinations once per reconciliation. Replacing a catalog cancels obsolete background waiters without affecting foreground waiters. Shutdown unregisters listeners and aborts scheduler work.
- Extend one-shot requests with the existing `CancellationSignal` type and an optional character bound; executions expose an optional output snapshot. Mozilla and Node adapters capture incrementally. Completion, cancellation and timeout keep the original result shape with an additional canceled outcome. Late launch handles are terminated.
- Both runner paths pass their setup signal, catch canceled preparation through their existing cancellation lifecycle, and emit truthful start/result diagnostics. Error codes and fallback policies stay unchanged.

## Risks / Trade-offs

- Slow networks may still exhaust fifteen minutes; report timeout evidence and allow a later task to try again.
- Runtime-selected Skills and relative dependencies cannot be predicted from static declarations; task preparation remains authoritative.
- Different task environments cannot safely share readiness; serial verification uses uv's cache instead.
- A shared one-shot interface affects several consumers; its new cancellation/bounds are opt-in, and existing normal-output tests remain part of validation.

## Migration Plan

No durable schema migration is needed. Ship the plugin source change after focused tests and isolated runtime acceptance. Existing uv caches remain usable; rollback removes background warmup without migrating user data.
