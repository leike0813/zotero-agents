# Design

## Context

See `proposal.md`. C01 supplies a transient, browser-safe Runtime with no tool wiring. C02 owns canonical JSONL, but C07 must remain independent of it. The accepted C07 ticket defines one Gateway module; the later C08 correction distinguishes immutable system admissibility from current authorization. The final #26 wave table moves owner wiring to C16/C17.

## Goals / Non-Goals

**Goals:** A small project-owned interface that later catalogs and owners can supply without Pi SDK, ACP, Host Bridge, Workflow Host, raw Zotero objects, credentials, or UI state crossing it. Deterministic Node and real-Zotero behavior.

**Non-Goals:** Concrete tools, provider execution, owner persistence implementation, standing-grant storage, UI, process teardown/restart reconciliation, or a second policy/receipt database.

## Decisions

1. **One module and three actions.** `freezePiToolGatewayTurn` creates a turn handle from trusted descriptors; the handle executes a batch and continues an exact pending call in a new turn. Each descriptor supplies a canonical capability ID, model name/schema, minimum effects, trusted classifier, bounded executor, and optional exclusive/deferred batch mode. The Gateway validates static mapping, compiles schemas once, clones/freezes the effective projection, and computes deterministic digests using existing hashing code. It never imports C02/C03 or concrete tool catalogs. A registry hierarchy would add state without another owner.
2. **Three policy layers.** The classifier emits conservative effects, authority/resource keys, safe refs, and cost. C07 first checks the immutable system effect ceiling and forbidden classification, then frozen runtime availability, then current effect/key authorization. The latter can be supplemented by one exact-call approval only. The approved system/authorization/availability inputs are trusted owner facts, never model arguments. This follows the C08 correction rather than C07's superseded statement that Workspace Scope is non-overridable.
3. **Batch preflight and scheduling.** Validate all identities, schemas, classifications, budgets, and batch modes before effects. Structural errors block the batch. Per-call policy failures remain ordered results. Eligible ordinary calls use a bounded scheduler with canonical conflict keys; deferred calls run only after ordinary calls settle. Permission callbacks run after eligible work settles. One turn admits one batch or continuation operation at a time. No process-wide Zotero lock is added here. To bound Gateway-owned facts, arguments stop at 512 KiB, classification at 16 KiB, and a descriptor's result limit cannot exceed 1 MiB.
4. **Persistence callback protocol.** The owner supplies async started, receipt, and pending-permission writers. Failure to publish started evidence prevents execution. An executor returns an explicit effect-certainty observation; thrown/rejected work after start defaults to `unknown`. A bounded receipt is written before model-visible success. Failed receipt publication yields `state_unknown`, leaving the durable started fact for later reconciliation. No raw argument or output body enters generic receipts.
5. **Exact continuation.** Pending state contains the original call plus safe binding digests. The owner persists it. A later turn validates the source binding and current frozen facts; mismatch reevaluates without using the approval. Matching denial becomes `policy_denied`; matching approval bypasses only missing current authorization for the original call. No reusable grant is created. The Gateway retains only turn-local attempted IDs to prevent in-process replay.
6. **Existing verification paths.** A single shared behavior file under `tests/runtime` runs in the existing `runtime-provider-execution` Node shard and via a thin `tests/zotero/core/lite` import. The #26 draft references obsolete `test/core` paths and a missing `test:node:core` script; current repo paths and scripts are authoritative.

## Risks / Trade-offs

- Trusted descriptor classification can be wrong → require conservative minimum effects and fail closed on missing/invalid claims; concrete catalogs carry domain behavior tests in later changes.
- C07 cannot prove an OS process stopped → require explicit executor termination evidence and return unknown otherwise; C19 owns final teardown/reconciliation and deadlines.
- Durable callbacks are fakes in C07 → real JSONL/owner integration and pending UI arrive in C16/C17, with no C07 claim of end-to-end persistence yet.
- Current full test suites may have unrelated failures → record exact results and distinguish targeted evidence; do not silently waive the #26 gate.
