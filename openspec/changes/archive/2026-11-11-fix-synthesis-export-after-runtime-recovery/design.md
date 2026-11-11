# Design

## Context

See proposal.md for the failure evidence. Supervisor discovery is already the connection authority. The production owner memoizes its first readiness task, while export captures a flattened connection only in `afterReady`. A replacement can therefore be healthy without refreshing either consumer. Existing native export fixtures assemble a working connection themselves.

## Goals / Non-Goals

**Goals:** keep connection consumers on the current instance, preserve existing bounded startup/recovery/shutdown and no-replay semantics, and exercise the default production composition.

**Non-Goals:** change Rust/wire schemas, redesign supervision, add retry policy, change the original topic run, or introduce a parallel test runner.

## Decisions

- Keep the supervisor as the connection authority. Export resolves its current ready connection per delivery instead of retaining a startup snapshot. The owner observes ready transitions, refreshes the binding and readiness task for replacements, and ignores superseded asynchronous initialization. A second connection registry or a periodic synchronizer would duplicate lifecycle ownership.
- Preserve stable RPC causes in error details, normalize transfer errors into the existing `SynthesisClientError`, and let Reverse Host handle that established type. Remove the redundant transfer-only error wrapper rather than adding another endpoint-specific catch. Business audit reads safe `reason` or `sidecarReason`.
- Share RPC-to-client error normalization between ordinary and transfer clients. At the Reverse Host HTTP boundary, project a safe `sidecarReason` into an absent `reason`, because the native receiver consumes that field. This uses the existing error schema and preserves an explicitly supplied reason.
- Extend the existing owner tests with automatic replacement before the next request and late initialization/shutdown. Add a native export scenario using production handlers/broker with synthetic source ports; keep decoder-focused fixtures scoped to their existing contracts.
- Extend SL-01 after real automatic recovery to export synthetic managed artifacts through the default Bridge path. Discovery-derived test clients remain lifecycle probes, not evidence of default export wiring. Reuse existing family cleanup and assert the manifest plus files.
- Update the existing runtime/testing docs and keep this change unarchived and uncommitted until separately requested.

## Risks / Trade-offs

- Ready notifications can race initial startup or an older `afterReady` completion → share current-instance initialization and guard publication by current instance and stopped state.
- More detailed diagnostics can leak private values → retain only bounded machine tokens, with existing generic codes as fallback.
- Real E2E needs build inputs and an isolated host → run build preflight first, preserve existing submodule changes, and report any unavailable validation accurately.
