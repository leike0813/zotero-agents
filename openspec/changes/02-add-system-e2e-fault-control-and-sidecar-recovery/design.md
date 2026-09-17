# Design

## Context

Implementation prerequisite: read [`artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md`](../../../artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md) before applying this change. It is the self-contained source for the Wayfinder decisions and replaces issue-tracker lookup.

See proposal.md - Why for the motivating defect and the case gap. Three
constraints shape every decision below.

The runner from Change 1 already owns one fresh Committed Seed, one Suite
Baseline, family lifecycle, the Run Manifest, and the Suite Health Gate, and it
executes real Zotero plus the current-source sidecar. Issue #51 established that
external process, copied-file, lock, port, disconnect, and restart control are
sufficient there, and that only two semantic windows need local cooperation from
the sidecar.

The Reverse Host endpoint holds a single `serviceInstanceId` cell
(`src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts`) and the
broker rejects a call whose instance ID does not match it
(`reverse_host_stale_instance`). The production owner binds that cell exactly
once per owner lifetime, in `start()`, after `waitForReady`
(`src/modules/synthesis/production/synthesisProductionOwner.ts`). A generation
that dies after ready therefore leaves its binding installed while the
supervisor starts a replacement; the replacement's first probe carries the new
instance ID, is rejected, and the supervisor consumes its restart budget and
fuses.

The two candidate checkpoint sites are the Reference page collector
(`collect_host_item_pages` in the Reference application) and the public
maintenance dispatch boundary between durable insert winner and worker spawn in
the sidecar's public maintenance owner. Both already run inside a single owning
operation, and neither currently holds any test seam.

## Goals / Non-Goals

**Goals:**

- Scope the Reverse Host instance binding to the current generation, so
  post-ready process loss converges to one replacement ready generation instead
  of the fused terminal state.
- Place exactly two one-shot, operation-scoped checkpoints that a real E2E case
  can arm from outside the process.
- Deliver `SL-03`, `RH-02`, and `PM-03` as formal cases with bounded cleanup
  and post-family health evidence.
- Keep the existing module owners: production owner owns generation state and
  binding; Reverse Host broker owns instance authorization; Reference
  application owns paging; public maintenance owner owns admission and dispatch.

**Non-Goals:**

- No global or pluggable fault-injection service, no fault capability in the
  public protocol, no catalog route, and no environment-driven production
  behavior switch beyond a checkpoint the owning operation reads once.
- No re-implementation of the Issue #51 prototype as a second runner, registry,
  or production module.
- No change to maintenance admission, retry, continuation, or restart
  reconciliation semantics, and no change to Reference basis validation.
- No R9 packaging, migration, lock, platform-matrix, or evaluator work; the R9
  change stays independent.

## Decisions

### Generation-scoped binding in the production owner, not the broker

The owner already knows exactly when a generation starts, becomes ready, and is
replaced, and it is the only party that observes the supervisor leaving
`ready`. Binding revocation therefore lives in the owner: revoke the binding
when the observed supervisor snapshot leaves `ready` for any non-ready state,
and keep the existing "bind after ready" ordering in `start()`. The alternative
- teaching the broker to accept any live instance ID - was rejected because it
removes a real authorization check and hides the defect rather than fixing it.
Deriving the binding from the discovery document inside the broker was rejected
as well: the broker would then own generation lifecycle, which is the
supervisor's and owner's responsibility.

The endpoint keeps its "no instance bound" state as a *pre-ready* condition and
not an authorization bypass: the binding is revoked to `unbound` between
generations, which is the same state a first launch passes through before
readiness. That preserves the existing unbound allowance for the first probe
while ensuring a departed generation's ID never authorizes its successor.

### Two local checkpoints instead of shared fault infrastructure

Each checkpoint is a one-shot hold scoped to the operation instance that reaches
it, released by the runner through the mechanism the owning module already has:
the Reference checkpoint holds between page requests inside the collector's
page loop, and the maintenance checkpoint holds after the durable insert winner
commits and before the worker is spawned. A single shared fault service was
rejected because it would create a production surface wider than either window,
and per-caller guards were rejected because both windows sit inside exactly one
shared function.

Both checkpoints are armed through the launch configuration path the supervisor
already uses to start the sidecar, remain unarmed in production, and expose no
new public capability. The Reference checkpoint applies only to a page traversal
that has already served its first page, and the maintenance checkpoint applies
only to the insert winner of the operation that reached it.

### Cases assert public and typed outcomes, not internal call order

`SL-03` terminates the real ready process externally, then requires one new
ready generation, retirement of the old identity, and no stale discovery or
orphan process. `RH-02` applies one controlled Host mutation between pages and
requires the whole refresh to fail with the production basis outcome, with no
mixed promotion, and to succeed when retried from a fresh basis. `PM-03`
terminates the sidecar while the public operation is running and requires
`restart_reconciliation_failed` with `restart_external_effect_unknown`, no
automatic replay, and a deterministic retry successor that is the only party
performing a new effect.

### Regression checks sit at the module interfaces

Binding revocation is checked at the production owner interface, where a fake
supervisor can publish `ready` and then a non-ready state and the test can
observe the binding calls. Each checkpoint is checked where it lives, asserting
one-shot and operation-scoped behavior. Prose, log text, and internal call order
are not asserted.

## Risks / Trade-offs

- [A revoked binding could reject a legitimate in-flight call from the departing generation] -> Termination already invalidates that generation's connection; the call fails on transport or staleness either way, and the recovery requirement already forbids replay after dispatch.
- [A checkpoint left armed could stall a later operation] -> One-shot and operation-scoped by construction; the case that arms it also releases it during bounded cleanup, and the post-family health gate fails the family if a hold leaks.
- [Checkpoint plumbing could leak into production behavior] -> Unarmed runs take the existing code path with no hold, and the spec forbids any public protocol, DTO, or catalog surface for fault control.
- [The kill window in `PM-03` may land after dispatch] -> The checkpoint holds before dispatch by construction, so the case observes the intended restart classification rather than a race.
- [Recovery fix could mask a genuinely unready replacement] -> Only the instance binding is revoked; startup deadline, retry budget, and fuse behavior are unchanged.

## Migration Plan

No data migration. The change lands behind the existing supervisor and snapshot
contract, is verified by the focused regression checks plus the three cases, and
rolls back by reverting the owner binding change and the two checkpoints
together.

## Open Questions

None. The two checkpoint sites, the binding owner, and the three case
definitions are fixed by Issue #51 and Issue #55.
