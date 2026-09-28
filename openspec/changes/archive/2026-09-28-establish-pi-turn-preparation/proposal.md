# Proposal

## Why

Pi Runtime can stream a selected model and the owner can persist a transcript, but there is no shared preparation step before each model invocation. Conversation and Skill Run would otherwise assemble context, enforce budgets, and compact history independently.

## What Changes

- Add one project-owned Pi Turn Preparation module that reconstructs the selected transcript path and combines frozen instructions, resource manifests, tool catalog, and model policy into provider-neutral context.
- Admit each invocation against a versioned token budget; coordinate automatic and manual compaction at a safe durable boundary.
- Persist bounded preparation provenance before ordinary and compaction Provider invocations, without duplicating message bodies or credentials.
- Cover the module through shared Node and real Zotero tests, then update the living Pi handoff.

## Capabilities

### New Capabilities

- `pi-turn-preparation`: Deterministic Pi context reconstruction, budget admission, compaction coordination, and invocation provenance.

### Modified Capabilities

None.

## Impact

New `src/modules/piTurnPreparation.ts`, tests under `tests/runtime` and `tests/zotero/core/lite`, and one new OpenSpec capability. C02 transcript/CAS and C07 tool catalog remain separate owners; C06 receives their frozen facts and injected persistence operations. Conversation and Skill Run production wiring remains in C16/C17.
