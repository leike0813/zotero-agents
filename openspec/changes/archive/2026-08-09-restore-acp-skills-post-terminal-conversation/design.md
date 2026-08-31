## Context

An ACP Skills run contains two related state axes. The workflow task owns status,
output convergence, result validation, apply, sequence continuation, and the
business error. The ACP conversation owns the session connection, prompt,
permission, transcript, usage, and recoverability. Existing recovery code uses a
single live controller and routes recovered prompts through workflow settlement,
which makes terminal follow-up unsafe.

The implementation must retain the existing run record and wire contracts. A
post-terminal controller purpose is therefore process-local and derived only
when an explicit Connect resumes an eligible terminal run.

## Goals and non-goals

Goals:

- Restore ordinary text conversation and normal ACP tool/permission behavior on
  the original session of eligible `succeeded` and `failed` runs.
- Preserve terminal task and apply evidence byte-for-byte across every terminal
  conversation outcome.
- Keep the existing workflow continuation semantics for non-terminal recoverable
  runs.
- Keep archive and navigation behavior honest while a terminal conversation is
  connected or busy.

Non-goals:

- Reopen terminal workflow execution, output convergence, apply, or sequence
  continuation.
- Enable terminal file interactions or model/mode/reasoning editing.
- Add a new endpoint, status value, persisted eligibility field, runtime prompt,
  transcript store, or submission queue category.

## Eligibility classifier

Add one classifier used by store controls, recovery, Host projection, and
Workspace projection. It returns eligible only when all of these facts hold:

- status is exactly `succeeded` or `failed`; `canceled` and
  `failed_retriable` are excluded;
- a session id exists and the run has not been archived or removed;
- the conversation is not ended and recovery is neither `unavailable` nor
  `unsupported`; a failed recovery attempt may remain retryable;
- no pending interaction, apply-pending, output-convergence-pending, or other
  workflow-open evidence exists;
- current succeeded records prove apply completion; legacy succeeded records
  with a missing apply-state field remain compatible.

Eligibility is derived, never persisted. The classifier also distinguishes an
eligible detached run from a connected post-terminal controller.

## Controller purpose and dispatch boundary

Extend the process-local live controller with a purpose discriminator:
`workflow` or `post-terminal-conversation`. Controllers created by initial
execution always use `workflow`, including the interval after apply settles but
before cleanup detaches the controller. Only explicit Connect can create a
post-terminal controller. This closes the race in which a stale workflow
controller could accept an ordinary terminal reply.

Recovered prompt transport, transcript, timeout, permission, interrupt,
force-stop, and disconnect logic is shared. Settlement is selected by purpose:

- `workflow` keeps guard construction, completion-marker validation, repair,
  output convergence, result writes, sequence continuation, and apply;
- `post-terminal-conversation` accepts the user's original text as the prompt
  and settles only conversation/reply/prompt/permission/transcript/usage state.

A completion-marker JSON response in post-terminal conversation is transcript
content only. It cannot cross the workflow apply seam.

## Frozen workflow evidence

For the lifetime of a post-terminal controller, the following task-owned facts
remain unchanged: status, backend status, apply result state, applied time,
result JSON, output revisions, workflow tasks, sequence state, and business
error. Conversation failures write only the existing conversation/reply error
surface. Unsupported recovery closes later conversation recovery without
changing the task result.

Continuation classification checks terminal task status and terminal apply
result before stale pending interaction or output evidence. Terminal evidence
is absorbing on the task axis.

## Admission and sequence behavior

Explicit terminal Connect and all post-terminal replies bypass the submission
slot coordinator. A terminal intermediate sequence step may converse while
later steps execute. It does not enter resumption-pending, change slot counts,
or mutate sequence state.

`waiting_user` and `failed_retriable` continue through existing admission,
workflow guard, convergence, and apply paths.

## Recovery, persistence, and startup

Apply failure can leave a usable session. When a session exists and the
conversation is not ended, retain `recovery=available` as a candidate; Connect
performs the actual resume/load capability negotiation.

Legacy `failed` records migrate to `failed_retriable` only when explicit
workflow-open evidence exists and terminal evidence does not. Session presence
alone is insufficient.

Startup reconciliation converts persisted terminal connected/active transient
conversation state to closed, available, idle state and clears prompt and
permission temporaries. It preserves status, result, apply fields, output
revisions, sequence state, and business error.

## Workspace, Host Bridge, and archive

Assistant navigation entries expose required `canArchive`. Every source projects
it explicitly. Eligible detached terminal ACP Skills runs show Connect; after
connection the composer is enabled. Active prompts show turn activity and
Interrupt, then return to the original completed or failed presentation.

Terminal runs remain in completed/history groups and never become active tasks.
Host Bridge keeps terminal task liveness and `canCancelWorkflow=false` while
independently allowing connection or reply actions.

Archive remains visible for terminal runs but is disabled while connecting,
connected, or prompting. Store mutation performs the same validation so callers
cannot bypass the UI; users must Disconnect first.

## UI rendering boundary

Conversation transcript updates remain owned by `TranscriptRegion` and its
imperative renderer. Terminal streaming must not change chrome signatures for
toolbar, banner, plan, hint, reply, context drawer, details drawer, or permission
drawer except when that region's own visible state changes.

## Failure and cleanup rules

- Connect never sends a prompt; Reply never implicitly connects.
- Prompt error, permission denial, interrupt, force-stop, hard timeout, and
  Disconnect preserve the task terminal state and workflow evidence.
- Recovery unsupported marks the conversation unsupported and detaches it.
- Cleanup is identity-safe and cannot convert a workflow-purpose controller
  into a post-terminal controller.
- Archive rejection is enforced below the presentation layer.
