# Tasks

## 1. Canonical failure and append foundations

- [x] 1.1 Characterize ACP append/flush/release/discard, generalize the queue with configurable bounds and fixed barriers, migrate both callers and remove the old core; verify queue and ACP regression tests.
- [x] 1.2 Add shared failure core/policy and canonical identities without changing model context or owner outcomes; verify propagation, failure persistence and legacy-history scenarios in existing Pi tests.

## 2. Audit ownership and storage

- [x] 2.1 Share Runtime Log normalization and Pi correlation filtering, implement the typed operation/tier policy and one-sink routing; verify privacy, tier and hydration tests.
- [x] 2.2 Integrate fact owners and early Skill Run Workspace reuse, wait/terminal/archive flush and deletion safety; verify canonical-first recording, no duplicates and owner lifecycle tests.
- [x] 2.3 Implement fixed file/queue budgets, compaction and gap recovery using reduced internal test limits; verify byte/count/oversized/write-failure cases.
- [x] 2.4 Integrate lower-priority audit with Native quota and correct nested Workspace measurement; verify concurrent quota admission and audit reclamation tests.

## 3. Diagnostic export and product surfaces

- [x] 3.1 Implement precise owner/global scopes, active-owner watermarks, safe failure/completeness projections, 96 MiB trimming and atomic ZIP cleanup; verify scope, privacy, races and failure tests.
- [x] 3.2 Add scoped Details drawer and global Backend Manager export through existing contracts/picker and locales; verify action routing and managed-region DOM identity tests.
- [x] 3.3 Update ADR 0003, project constraints and runtime handoff to match implemented boundaries and current C17 archive; verify links and review documentation against production code.

## 4. Integration evidence and handoff

- [x] 4.1 Run relevant Node domains, lint/build/type checks and actual Zotero core/UI including Gecko ZIP/filesystem cases; record accurate results and limitations.
- [x] 4.2 Perform official OpenSpec verification for completeness/correctness/coherence, sync specs, archive and update final handoff; verify strict validation and finished task tracking.
