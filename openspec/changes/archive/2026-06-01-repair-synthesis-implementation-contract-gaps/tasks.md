## 1. OpenSpec contract

- [x] 1.1 Validate repair change under strict OpenSpec rules.

## 2. Related-items sync and echo suppression

- [x] 2.1 Add related-items sync dirty event type/scope and queue it after graph structure promotion.
- [x] 2.2 Add default Zotero related-items host for worker runs without injected host.
- [x] 2.3 Persist echo awaiting/observed state on sync effects and consume matching Zotero notifier echoes.
- [x] 2.4 Reconcile pending effects on worker startup before retrying external writes.

## 3. Identity and rebuild safety

- [x] 3.1 Add ISBN to registry input/row, identity anchors, identifier rows, and adapter extraction.
- [x] 3.2 Preserve accepted redirect/tombstone and merged binding decisions across full Registry rebuild candidates.
- [x] 3.3 Validate durable related-items effects against candidate items, redirects, bindings, and active edges.

## 4. Discovery hints

- [x] 4.1 Add repository and service actions to reject and restore discovery hints.
- [x] 4.2 Wire Workbench/debug actions to expose reject/restore only.

## 5. Drift and docs

- [x] 5.1 Replace startup bulk drift threshold with `dirty > 50 || dirty / activeLibraryCount > 0.05`.
- [x] 5.2 Align reference-resolution state-machine docs/contracts to current matcher statuses.

## 6. Tests and verification

- [x] 6.1 Extend focused tests for related sync, echo suppression, ISBN identity, rebuild decision preservation, candidate validation, hint actions, and drift thresholds.
- [x] 6.2 Run focused synthesis test suite plus `npx tsc --noEmit`, `npm run build`, and relevant OpenSpec validation.
