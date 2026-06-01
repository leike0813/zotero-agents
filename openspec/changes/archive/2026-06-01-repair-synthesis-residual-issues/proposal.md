## Why

Residual verification found a few Synthesis Layer paths still diverging from the latest runtime contract. The highest-risk issue is that Registry candidate validation can block the exact rebuild that should make a stale Synthesis-created related-items relation revocable. Full Registry rebuilds also do not currently schedule related-items sync after promotion, and a few active specs/docs still describe old discovery, ISBN, and echo-suppression assumptions.

## What Changes

- Allow applied Synthesis-created related-items effects to become stale during Registry candidate validation so promotion can complete and the related-items worker can revoke them.
- Keep pending external-write related-items effects as blocking validation inputs when their backing candidate state cannot be resolved.
- Queue `related_items_sync_dirty` after successful full Registry rebuild promotion when matched library-to-library edges exist or stale Synthesis-created effects need reconciliation.
- Remove the stale discovery-hint accept contract from active specs and keep reject/restore as the only hint state actions.
- Clarify ISBN identity policy: normalized ISBN duplicates may converge directly, while DOI/arXiv duplicate Zotero-bound items still use the existing P0 dedupe review path unless an accepted redirect exists.
- Pass related target keys from Zotero notifier `extraData` into durable echo suppression when available; otherwise retain the documented item-level fallback risk.

## Capabilities

### Modified Capabilities

- `synthesis-literature-registry-citation-graph`: Candidate validation and full rebuild promotion scheduling for related-items sync.
- `synthesis-related-items-sync`: Stale applied effect revocation, durable echo matching precision, and notifier fallback behavior.
- `synthesis-paper-registry`: ISBN convergence policy and DOI/arXiv duplicate-review policy.
- `synthesis-workbench-ui`: Discovery hints remain reject/restore-only suggestions.

## Impact

This affects Registry candidate validation, Synthesis service worker scheduling, Zotero notifier routing, active Synthesis specs, design docs, and focused Synthesis tests. No dependency changes, Git history changes, or broad unrelated OpenSpec cleanup are included.
