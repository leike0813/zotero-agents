# Tasks

## 1. Canonical persistence and reservation restoration

- [x] 1.1 Add bounded owner inventory, recovery/checkpoint and hold-safe deletion primitives with Node behavior tests proving missing projections, corrupt owners and retained unknown files.
- [x] 1.2 Route builtin-pi through existing Workflow submission slots, restore durable original reservations without dispatch, and verify queue/concurrent submission behavior.

## 2. Process governance and execution evidence

- [x] 2.1 Implement lifecycle admission, foreground capacity, monotonic budget checkpoints and serial maintenance with deterministic clock/executor tests.
- [x] 2.2 Bind canonical Broker operation identity before effects and retain physical claims after logical cancellation; verify Gateway/native/MCP timeout and late evidence races.
- [x] 2.3 Expose Runtime physical settlement and Provider activity/deadline composition, and verify immediate logical cancellation plus suppressed late events.

## 3. Product owners and Workspace

- [x] 3.1 Integrate Conversation prompts, auxiliary title/compaction, recovery checks and deletion with lifecycle; verify durable context and existing Workspace identity tests.
- [x] 3.2 Integrate Skill Run reservations, cumulative budgets, safe recovery continuation and Finalizer/apply/ack holds; verify original request identity and no unknown replay.
- [x] 3.3 Add existing Workspace recovery check/continue action routing without new regions and verify owner-first/page-first and chrome DOM identity.

## 4. Startup, shutdown and maintenance

- [x] 4.1 Compose startup inventory/reservation barrier and serial recovery/cleanup in hooks and existing retention entry; verify global barrier and per-owner isolation.
- [x] 4.2 Compose both Pi owners/executors and audit into one absolute shutdown deadline, prevent callback resurrection and dispose timers in test cleanup; verify deterministic shutdown races.
- [x] 4.3 Update persistence ADR and durable AGENTS constraints with the implemented budget/recovery/cleanup ownership contract.

## 5. Integration acceptance and handoff

- [x] 5.1 Run affected Node shards, lint and build, real Zotero core/UI and existing restart/cancellation runner evidence; record exact commands/results and unresolved platform limitations.
- [x] 5.2 Complete official OpenSpec verification, synchronize delta specs and archive only when all implementation and required evidence are complete; update the Pi handoff to actual C19 completion and C20 frontier.
