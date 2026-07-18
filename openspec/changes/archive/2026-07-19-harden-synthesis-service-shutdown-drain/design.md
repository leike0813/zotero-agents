## Context

`startSynthesisSidecarServer()` currently owns two nearly identical cleanup
chains: one for a post-composition listen failure and one for runtime shutdown.
Both depend on every earlier owner completing successfully. Runtime shutdown is
fire-and-forget, so a rejection can also prevent the HTTP close callback from
resolving `runtime.stopped`.

The Topic application accepts asynchronous apply work but exposes only
`stopAdmission()`. The service therefore cannot establish that all admitted
canonical and repository work has completed before closing those owners.

## Goals / Non-Goals

**Goals:**

- Drain all Topic applies admitted before shutdown and reject later admission.
- Attempt every cleanup step even when another step throws or rejects.
- Share owner cleanup between normal shutdown and listen failure rollback.
- Always terminate HTTP shutdown signaling and preserve the original listen
  failure.

**Non-Goals:**

- Adding a global shutdown timeout or canceling admitted Topic applies.
- Changing RPC, HTTP payloads, storage, service inventory, or production
  routing.
- Fixing cumulative CI gates, brittle Core 125/213 assertions, HTTP error
  classification, package dependency direction, or runtime/XPI publication.

## Decisions

1. **Track admitted applies as promises.** Decorate the existing apply method
   with a `Set` of returned promises. Admission remains synchronous; completion
   removes the promise on both fulfillment and rejection. A cached shutdown
   promise stops admission and settles only after a snapshot of all active work
   has settled.
2. **Drain rather than abort Topic work.** Apply owns canonical promotion and
   post-commit projections. Allowing admitted work to reach its existing stable
   result avoids introducing partial-operation cancellation semantics.
3. **Use one staged cleanup closure in the service.** Stop all admission and
   the transfer executor first; drain application owners next; close canonical
   and repository owners after those drains; then settle compute and transfer
   owners. Each step catches both synchronous and asynchronous failure.
4. **Preserve dependency order without testing exact call order.** Cleanup
   remains sequential where lower owners are shared, while independent compute
   and transfer shutdowns may settle together. Tests assert observable drain,
   continuation, and terminal completion only.
5. **Log redacted cleanup failures.** Emit `service_cleanup_failed` with the
   service instance, cleanup phase, owner, and error type. Do not serialize
   arbitrary error messages.
6. **Make HTTP finalization unconditional.** Runtime shutdown closes or
   force-closes connections and resolves `runtime.stopped` from a finalization
   path regardless of cleanup failures. Listen rollback rethrows its original
   listen error after shared owner cleanup.

## Risks / Trade-offs

- **A cleanup owner never settles** → Existing owner-specific budgets remain
  authoritative; a new global timeout is outside this change.
- **Concurrent admitted applies finish in an unexpected order** → Shutdown
  waits for every tracked promise and relies on existing CAS semantics rather
  than imposing a new serialization policy.
- **Cleanup failure loses diagnostic detail** → Structured owner and error-type
  fields preserve actionable classification without leaking internal messages.
- **Existing source-order tests remain red** → Record the known Core 213
  baseline and defer its replacement to the next self-review closure item.
