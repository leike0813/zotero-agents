# Redesign Synthesis Persistence for Performance

## Summary

Move Synthesis from a file-first JSON canonical hot path to a SQLite-first local
working state. UI, MCP, Host Bridge reads, review actions, and background
workers should use indexed SQLite tables by default. JSON canonical assets remain
available as cold import/export/checkpoint material and future sync boundaries,
but they must stop being the high-frequency runtime source of truth.

## Problem

The current Synthesis implementation is functionally broad but not yet
product-usable at scale. Durable canonical assets are mostly stored as many JSON
files under `data/synthesis/`, and rebuildable projections are large JSON/DTO
files. Workbench snapshots, review queues, registry reads, citation graph reads,
and background workers repeatedly aggregate these files.

This creates several user-visible failures:

- routine UI actions can trigger expensive file reads, JSON parsing, hashing, or
  projection writes;
- background jobs are asynchronous but still CPU/IO-heavy on Zotero's UI
  runtime;
- review actions can update one canonical record while the UI still reads stale
  projection state;
- graph and registry reads scale poorly as papers, references, concepts, and
  topics grow;
- the system exposes implementation artifacts such as projection state and
  cleanup proposal ids instead of fast, decision-ready local views.

## Goals

- Make SQLite the authoritative local working state for Synthesis runtime
  interactions.
- Keep JSON canonical assets only as cold checkpoint/import/export/sync
  material.
- Replace large JSON projections with indexed DB view models and bounded graph
  queries.
- Move review queues and cleanup decisions into transactional DB state.
- Ensure UI/MCP/Host Bridge read paths never scan canonical JSON or rebuild
  projections.
- Make background jobs bounded, measurable, retryable, and DB-driven.

## Non-Goals

- Do not implement Git Sync in this change.
- Do not keep JSON canonical files as the normal runtime hot path.
- Do not add npm dependencies.
- Do not perform automatic production migration at startup.
- Do not delete existing `data/synthesis/` files.
- Do not implement SQLite FTS/BM25 unless a later change explicitly adds it.
