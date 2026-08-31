## Context

Normal sequence execution already records step success, runs optional step
apply, awaits the completion observer, evaluates short-circuit/final state, and
dispatches the next step in `sequenceRuntime.ts`. ACP recovery and SkillRunner
foreground continuation first record an externally completed step and then
manually reproduce terminal and continuation decisions around exported runtime
helpers. ACP apply execution also contains controller cleanup side effects,
which makes the cleanup barrier depend on more than one call site.

## Goals / Non-Goals

**Goals:**

- Give normal and externally completed step success one advancement policy.
- Preserve step success when step apply fails.
- Make optional apply and ACP cleanup settle before short-circuit return or
  downstream dispatch.
- Resume only incomplete advancement phases and avoid duplicate downstream
  dispatch once a request id has been persisted.
- Preserve sequence completion when outer apply later fails.
- Remove caller-owned terminal/short-circuit duplication.

**Non-Goals:**

- Providing exactly-once backend submission across a crash before request-id
  persistence.
- Adding a new ambiguous-submission UI or recovery state.
- Moving outer workflow apply, task projection, backend resolution, workspace
  recovery, or foreground focus policy into the sequence runtime.
- Changing workflow manifests or backend request protocols.

## Decisions

### Deepen the existing runtime

Keep `sequenceRuntime.ts` as the deep module. Extract one private successful
step advancement path used both after normal provider success and by a public
external-completion entry. The external entry validates the persisted step
identity, records success if needed, and then enters the same apply, lifecycle,
terminal, and downstream logic.

### Keep execution and apply as separate facts

Provider success is persisted before optional step apply. An apply failure is
persisted independently. `on_failure: continue` advances after cleanup;
`on_failure: fail_sequence` fails the root and prevents downstream dispatch.
Neither policy rewrites the provider success fact.

### Use a lifecycle adapter

The runtime determines when cleanup must settle and awaits one explicit
lifecycle adapter. The ACP adapter persists ACP apply-result settlement and
detaches the controller. SkillRunner uses no adapter. Step apply execution has
no hidden controller-cleanup side effect.

Cleanup transport failure remains an observable warning and does not rewrite
settled business state, matching the existing ACP detach contract.

### Persisted idempotency with in-process serialization

External completion for the same sequence is serialized in process. Persisted
step success, successful step apply, cleanup ownership, downstream request id,
and root terminal state determine which phases may run. Repeating the same
step/request result resumes incomplete work; a different request id for an
already-bound step is a conflict. A terminal root never returns to
`continuing`.

This does not claim exactly-once submission in the narrow window where a
backend accepts a request before its request id is persisted.

### Root completion precedes outer apply

The runtime records root `completed` after the actual terminal step has
finished step apply and cleanup. Callers then perform outer apply and project
workflow/task state. Outer apply failure makes the user-visible workflow/task
outcome failed while the sequence execution fact remains completed.

### Actual terminal step owns final apply

Sequence result metadata exposes `terminal_step_id`. For ordinary completion it
equals the declared final step. For short-circuit completion it identifies the
step that actually ended the run. Outer apply is skipped only when that actual
terminal step declares `apply_result`; an unexecuted declared final step cannot
claim apply ownership.

## Risks / Trade-offs

- The runtime interface becomes deeper, but caller-specific backend and UI
  responsibilities remain outside it.
- Persisted cleanup completion cannot be inferred solely from successful
  disconnect transport; the ACP detach API remains the idempotent boundary.
- Submission ambiguity before request-id persistence remains unchanged and is
  documented as out of scope rather than represented by a new state.
