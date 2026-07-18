## Context

`stageImportBatch()` durably writes `import-batch.json`, then the durable
application awaits the repository transaction before calling
`commitImportBatch()`. The canonical store's ordinary `promote()` path checks
only the process-local `busy` flag, so another accepted Topic operation can
change current while the batch marker exists. The repository receipt is then
durable, but canonical forward promotion observes a stale basis.

The store already has the required durable identities and recovery ordering.
The repair must preserve its synchronous port, on-disk format, result statuses,
private composition, and restart behavior.

## Goals / Non-Goals

**Goals:**

- Make the staged batch marker the persistent source of canonical writer
  admission until commit, discard, or recovery completes.
- Keep forward commit and matching restart recovery able to promote the exact
  staged targets.
- Prove the formerly open repository-wait window with a deterministic test.

**Non-Goals:**

- Changing repository transactions, import receipts, canonical file formats,
  public ports, RPC exposure, production ownership, shutdown drain, or runtime
  packaging.

## Decisions

### 1. Centralize promotion behind one private admission function

The Node adapter will route ordinary and batch promotion through one closure.
Ordinary promotion has no batch permit and returns `canonical_store_busy` while
`import-batch.json` exists. Batch commit supplies an internal receipt identity;
the closure admits it only when it matches the parsed staged batch.

Checking the marker only in public `promote()` was rejected because
`commitImportBatch()` currently reuses promotion and would deadlock itself.
Keeping only an in-memory lock was rejected because it cannot represent the
awaited repository window or restart recovery.

### 2. Keep the receipt permit private to the adapter

No receipt-bearing method is added to `SynthesisTopicCanonicalStore`. Only
`commitImportBatch()` and matching recovery can reach the internal permit path,
so callers cannot impersonate a staged batch. A corrupt or mismatched batch
continues through the existing `repair_required` behavior.

### 3. Lock the observable concurrency invariant in Core 215

One focused test stages a Topic batch, attempts a competing ordinary promotion
for the same Topic, commits the batch, and then verifies admission is restored.
Existing forward-recovery coverage ensures the permit does not block restart
completion. This tests the stable store behavior without asserting internal call
order or source text.

## Risks / Trade-offs

- [An abandoned staged batch blocks ordinary canonical writes] → Existing
  discard and startup recovery remain responsible for deterministically
  clearing or completing the durable marker before admission resumes.
- [A naive guard blocks the batch's own promotion] → The private receipt permit
  and existing forward-recovery test cover both live commit and restart paths.
- [The store stays globally serialized during an import] → This is intentional:
  the repository receipt coordinates a multi-Topic atomic unit, so unrelated
  Topic writes must not invalidate any captured basis during that window.
