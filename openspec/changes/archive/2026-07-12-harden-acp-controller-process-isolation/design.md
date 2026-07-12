## Context

Local ACP backends are launched by a shared transport layer and consumed through `NativeAcpConnectionAdapter`, ACP Chat, ACP Skills, backend probes, cache refresh, and diagnostics. The 2026-07-12 cache-refresh incident demonstrated that a temporary wrapper-backed transport can reach a POSIX negative-PID cleanup path without proving that the live process group and session still belong exclusively to that controller. The previous sequence-lifecycle change added PID/token pidfile binding and awaited sequence detach, but it did not establish a complete controller-wide close protocol or live PGID/SID validation.

The plugin must run in Zotero's Mozilla environment as well as Node-based tests and diagnostics. Mozilla paths therefore use existing runtime compatibility and platform command services; no Node-only process APIs may leak into plugin execution. Windows continues to use the existing one-connection/one-child bridge model.

## Goals / Non-Goals

**Goals:**

- Make `launchAcpTransport()` return a controlled transport whose close operation is bounded, concurrent-call safe, and the only owner of process termination policy.
- Publish stdin EOF before escalation, allow graceful backend exit, and fail closed to direct subprocess cleanup whenever exclusive process-group ownership cannot be proven.
- Give Mozilla and Node POSIX transports the same launch-token/PID/PGID/SID ownership semantics and revalidate before each group signal.
- Preserve structured, non-sensitive evidence explaining close reuse, EOF, graceful exit, validation, TERM/KILL, fallback, and possible wrapper descendants.
- Cover every current local ACP launch path without duplicating cleanup policy in business controllers.

**Non-Goals:**

- Changing workflow manifests, transcript behavior, workflow results, remote-session recovery, or Assistant Workspace UI contracts.
- Adding backend-, provider-, agent-family-, command-, or `npx`-specific cleanup behavior.
- Guaranteeing wrapper-descendant removal when process-group ownership cannot be proven.
- Changing the Windows bridge wire protocol or introducing new dependencies.

## Decisions

### Wrap the public transport return boundary

`launchAcpTransport()` will wrap the platform transport once and return the existing `AcpTransport` shape. The wrapper stops new writes, drains queued writes, closes stdin with a deadline, waits for graceful exit, and then delegates only to verified platform cleanup. A single stored close promise makes repeated and concurrent calls reuse the same teardown.

This boundary covers `NativeAcpConnectionAdapter` and the raw refresh-cache diagnostic automatically. Moving policy into backend managers or individual ACP Chat/Skills controllers was rejected because those callers cannot safely inspect platform process identity and would drift across lifecycle paths.

### Use one bounded close sequence

The controller performs: reject new writes; await queued writes; request bounded stdin EOF; await graceful exit; validate ownership; optionally send group TERM; await; re-read and revalidate identity; optionally send group KILL; otherwise clean only the current subprocess handle. EOF or wait timeout advances to the same validation decision and never leaves close pending indefinitely.

Pending JSON-RPC requests remain the adapter's responsibility and are rejected when transport closure is observed. The transport keeps its existing `close(options)` API so business callers do not receive platform termination primitives.

### Treat process-group authorization as an expiring proof

Each isolated POSIX launch records a random token, subprocess PID, actual PGID, and actual SID. Group signaling is authorized only when the launch strategy is the isolated supervisor strategy, pidfile token and PID match, a live query still finds the process, live PGID equals the target PID, live SID proves an independent session, and the live values match the launch snapshot.

TERM and KILL each require a fresh proof. Any missing field, parse/query failure, mismatch, leader exit, or identity change rejects the negative-PID signal. A failed group TERM also disables group KILL. This accepts possible wrapper descendants rather than expanding the signal target.

The pidfile stores the supervisor identity needed for Mozilla validation. The random token is never emitted to lifecycle logs or audit output.

### Share ownership lifecycle semantics across platforms

Mozilla POSIX queries identity through the existing runtime-compatible platform command service. Node POSIX retains detached launch but records and validates the same token/PID/PGID/SID proof rather than treating `child.pid` alone as authorization. Windows reports that ownership is scoped to the bridge child and uses direct child termination only.

Startup preflight reports whether live POSIX identity queries are available. Missing capability disables group signaling but does not prevent ACP launch or direct subprocess cleanup.

### Keep business state separate from process teardown

ACP Chat, ACP Skills, backend probes, settings refresh, and diagnostics continue to close their adapter or transport at their existing ownership boundaries. They do not implement signal rules. Closing a temporary probe controller cannot locate or close another controller because the proof is launch-scoped and controller-local.

### Record structured lifecycle evidence without sensitive payloads

Lifecycle/audit records expose EOF requested/result/timeout, graceful exit, first/reused close, launch identity validation booleans, validation status and reason code, TERM/KILL decisions and results, direct fallback, and possible wrapper descendants. They omit raw tokens, environment values, credentials, complete sensitive command lines, and ACP request/response payload bodies.

## Risks / Trade-offs

- [Identity query capability is absent or fails] → Disable group signaling, directly terminate the current subprocess handle, and record that wrapper descendants may remain.
- [A wrapper leader exits before KILL validation] → Reject group KILL on the fresh validation result and use only the surviving handle operation available to the controller.
- [EOF or queued writes stall] → Bound both waits and continue through the fail-closed cleanup decision.
- [Added graceful-close latency affects workflow transitions] → Keep deadlines finite and preserve existing caller APIs; process isolation takes priority over sub-second teardown.
- [Platform identity output differs] → Normalize only PID/PGID/SID fields in the platform layer and fail closed on unknown or malformed output.
- [Existing callers invoke close concurrently] → Reuse one close promise and expose reuse in lifecycle data rather than duplicating EOF or signals.
