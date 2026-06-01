## Overview

This change closes implementation gaps against the latest Synthesis Layer design without introducing a new architecture. The repair keeps existing SQLite-first state and worker boundaries, adds the missing durable joins, and limits behavior changes to the contracts identified by verification.

## Decisions

- Related-items sync is triggered by a dirty event emitted after citation graph structure promotion and may also be run manually. If no host is passed, the service uses a Zotero-backed host that resolves items by library/item key and calls native related-item APIs.
- Echo suppression is durable and single-consumption: sync writes mark effects as awaiting echo; notifier routing consumes the first matching modify/refresh echo within a bounded window and records diagnostic state instead of queueing Registry work.
- Registry rebuilds import existing accepted redirect/tombstone decisions before building candidate state. Durable dedupe redirects override recomputed anchors so user merge decisions survive full rebuilds.
- ISBN is treated as a normalized strong anchor after DOI and arXiv and before stable URL.
- Candidate validation resolves durable related-items effects through candidate redirects and requires matching candidate bindings and citation edges before promotion.
- Discovery hints remain suggestions. Reject and restore are state changes only; they do not select topic-update inputs.
- Bulk drift is detected when changed known items are greater than 50 or greater than 5% of the active library count. If the active count cannot be read directly, the service uses the injected input count or scanned count with a diagnostic.
- Reference-resolution docs use `matched/suggested/unmatched/ambiguous`; confirmed review state is out of scope for this repair.

## Risks

- Zotero related-item APIs vary between mock and runtime objects, so the default host must use defensive method checks and clear diagnostics.
- Existing unarchived Synthesis changes already modified the same files; this repair must preserve those edits and avoid broad refactors.
- Full `test:node:core` currently has unrelated baseline failures. Verification should separate focused repair regressions from pre-existing suite failures.
