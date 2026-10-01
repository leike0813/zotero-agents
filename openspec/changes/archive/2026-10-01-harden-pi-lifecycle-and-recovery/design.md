# Design

## Context

See proposal.md for motivation. C18 is archived; canonical Broker operation observation is implemented. The Workflow queue currently excludes builtin-pi, Pi Skill Run disposal has no production caller, startup only reconciles ACP/Workflow projections, and shutdown gives each step an independent three seconds.

## Goals / Non-Goals

Keep one process lifecycle module while preserving product-owner transitions, canonical JSONL authority, Gateway scheduling and Broker outcome ownership. C20 owns full release matrix, performance capacity selection and live-account receipts.

## Decisions

### Process composition

`piRuntimeLifecycle.ts` owns one production singleton and a deterministic factory seam. Its narrow owner-facing interface admits foreground/background execution, supplies cancellation and absolute deadlines, registers physical settlement, checkpoints active elapsed time and releases only settled capacity. Fixed domain startup/recovery/cleanup callbacks are composed lazily to avoid coordinator import cycles. There is no independent Governor, timeout manager or second product state machine.

Foreground includes user prompts/replies/continuations/manual compaction; background includes restart continuation and auxiliary titles. Preserve FIFO within each lane and cap background at ten within twelve total. Control operations bypass admission. Nested provider/tool calls inherit the active lease rather than consuming extra turns.

### Canonical recovery and budgets

Persistence enumerates the union of canonical owner directories and registry identities using strict IO, with bounded serial scans and yielding. The startup reservation pass reads durable admission/reservation facts before Skill Run admission opens. Queue reservation restoration adopts the original submission/unit identities and policy without invoking its original execute callback. Missing inventory or unreconstructible global accounting fails Skill Run admission closed; per-owner integrity failures retain their known reservations and isolate the owner.

Use versioned non-context `execution_checkpoint` facts carrying turn identity, active elapsed, total/remaining budget and safe continuation eligibility. Persist checkpoints at settled invocation/tool boundaries and durable waits; live duration uses a monotonic clock. No restart replenishes budget. Owners without a trustworthy checkpoint stay in recovery. Current queued work that has never dispatched can initialize its budget.

Only a previously running Skill Run with verified Prepared Skill, complete selected context, restored Workflow reservation, known effects and committed safe checkpoint may restart in the background. Reattach the existing Workflow apply/ack path from durable source facts; missing apply input or a claimed but unconfirmed apply is a recovery hold, not a reason to replay. Waiting/suspended owners stay unchanged; Conversation reconstruction never dispatches.

### Invocation binding and physical truth

Extend the Gateway trusted preflight result and canonical started fact with optional `domainOperation: {scope: {ownerId}, operationId}`. The catalog supplies this binding from the existing private identity, never from model input. Started commit must succeed before effect. Startup/explicit recovery uses Broker getOperation; unavailable/running/unknown/repair_required do not clear holds. Late settled evidence is appended under the original invocation; original unknown facts, sealed outcomes and canceled turns remain intact. Resolution enables explicit continue only.

Execution interfaces distinguish the bounded logical result from actual physical settlement. Gateway resource claims and process admission survive a timeout result until actual executor completion/verified exit. Native staging reservations remain until safe cleanup; restart rebuilds holds from canonical facts and actual managed residue. A process restart does not prove an orphan has exited. Provider activity refreshes only on actual provider events. Tool deadlines use trusted descriptor categories and the accepted fixed limits.

### Maintenance and shutdown

Lifecycle runs startup recovery before cleanup, then one daily non-overlapping serial maintenance pass. Integrate Pi through the existing runtimePersistenceGovernance retention entry. Deletion marks the owner first, retains owned paths/receipt dependencies and retries cleanup_pending; terminal archived/removed Skill Runs expire after thirty days only when execution, recovery and apply holds permit. Extend existing deletion receipt infrastructure in the existing SQLite DB without transcript mirrors. External workspace and independent products are excluded.

hooks starts one absolute fifteen-second deadline before any shutdown wait, synchronously closes admission/scheduling and propagates abort. Owners/executors settle concurrently where safe, then shared transports close. Persist obtained facts before audit; all waits use remaining time. Expiry preserves unresolved physical/outcome holds and prevents later callbacks from reopening runtime/storage. Test cleanup disposes both coordinators, timer and source singletons before resetting storage.

Compaction remains one serialized owner operation using existing CAS. Cancellation or shutdown prevents late summary publication; losing CAS leaves the branch and has no background retry.

## Risks / Trade-offs

- Missing historical budget or invocation binding → preserve recovery_required and require new explicit work; never manufacture evidence.
- Committed Zotero effect with lost receipt → accepted Broker unknown outcome remains until authoritative evidence exists.
- Unproved orphan termination → retain physical occupancy and files, even if logical cancellation already returned.

## Migration Plan

Add canonical facts and additive/rebuildable scalar projections only. Preserve existing logs, owner identities and deletion receipts. No dependency upgrade, destructive migration, commit or publication is part of C19.
