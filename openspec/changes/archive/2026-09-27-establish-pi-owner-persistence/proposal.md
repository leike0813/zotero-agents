# Proposal

## Why

The transient Pi runtime now has a tested browser-safe turn, but no durable owner can preserve its history. The accepted W1 C02 plan requires one canonical transcript per Conversation or Skill Run before either product flow is built.

## What Changes

- Store versioned, project-owned per-owner JSONL transcripts with a rebuildable byte-offset index.
- Add distinct Conversation and Skill Run owner projections in one `pi_owner_registry` table in the existing plugin database.
- Expose bounded reads, integrity assessment, explicit torn-tail repair, and projection rebuild without dispatching runtime work.
- Prove the same storage contract in Node and real Zotero.

## Capabilities

### New Capabilities

- `builtin-pi-owner-persistence`: Durable Pi owner and transcript storage, inspection, and projection rebuild.

### Modified Capabilities

None.

## Impact

Adds `piTranscriptStore` and `piOwnerPersistence`; extends the existing runtime path resolver and plugin SQLite schema. No Pi product flow, provider, tool, or startup replay is added. C02 follows the accepted [implementation plan](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5520989998) and ADR 0001.
