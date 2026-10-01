# Tasks

## 1. Shared v1 pipeline

- [x] 1.1 Characterize ACP preparation/finalization and extract backend-neutral Preparation with immutable provenance; verify new ACP v1 and legacy continuation tests.
- [x] 1.2 Extract Finalizer, early output validation and owner artifact validation; verify sanitized response envelope and actual result parity with ACP/SkillRunner tests.

## 2. Pi owner and Workflow

- [x] 2.1 Add builtin-pi provider/backend and early durable Workflow Skill Run admission with mode validation; verify structured pre-dispatch failures and same-request ownership in integration tests.
- [x] 2.2 Compose Runtime, Turn Preparation and native/MCP/Web/Zotero Gateway through frozen prepared facts; verify Auto submission through finalizer/apply/ack and permission continuation.
- [x] 2.3 Add single-assignment outcome seal, independent ApplyReceipt/terminal ack, Interrupt/suspended continuation and Cancel races; verify deterministic lifecycle integration tests.
- [x] 2.4 Add cumulative LoopGuard and direct known-owner safe-checkpoint recovery; verify no model/tool replay and limit tests.

## 3. Interactive contract and Workspace

- [x] 3.1 Add versioned multi-question contract, batch preflight, revisioned drafts/CAS, bounded owner file answers and structured original-call submission; verify mixed batches, stale revisions, decline and recovery.
- [x] 3.2 Bind concrete pi-skill-runs Workspace surface/actions and shared Reply flow; verify owner-first/page-first loading, focus, attention, archive and transcript-only DOM identity.
- [x] 3.3 Document production boundaries and actual evidence in handoff and change verification; confirm links and OpenSpec strict validation.

## 4. Integration validation

- [x] 4.1 Run required lint/build, existing Node core equivalent and Zotero core, record results/limitations, and perform OpenSpec verification against every requirement.
