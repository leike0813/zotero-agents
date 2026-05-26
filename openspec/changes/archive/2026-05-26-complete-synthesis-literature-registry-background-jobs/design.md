## Overview

This change adds service-level background rebuild orchestration for Literature Registry and Citation Graph while keeping the canonical/projection implementation JSON based. The lower-level literature registry service continues to provide explicit rebuild/read APIs; the new job worker lives above it and decides when to enqueue or retry work.

## Job State and Freshness

The persistent job state lives at `synthesis/state/literature-registry-job-state.json`. It records:

- queue state: `ready`, `queued`, `running`, `stale`, `missing`, `failed_retryable`, `failed_permanent`
- source hash from registry inputs and citation graph paper inputs
- canonical manifest hash and projection manifest hash
- retry attempt, next retry time, last retry time
- last run receipt and sanitized diagnostics

Freshness is computed by comparing source hash, canonical manifest hash, and projection source manifest hash. Missing projection files produce `missing`; source or manifest mismatch produces `stale`; running/retry states are preserved if a worker is active or scheduled.

## Worker Behavior

The worker is single-flight. Multiple enqueue requests in the debounce window coalesce into one rebuild. A manual run bypasses debounce but still respects the running lock.

The worker calls `rebuildLiteratureRegistry()` with current service registry/citation inputs. Successful runs update canonical records, literature registry projection, citation graph projection, backend metadata, and job state. Retryable failures preserve latest usable projection files and schedule backoff. Manual retry clears scheduled retry and runs immediately.

## Projection Backend Declaration

Literature and citation projection DTOs gain:

```json
{ "backend": { "kind": "json-dto", "sqlite": false, "fts": false, "bm25": false } }
```

The service must not create SQLite files or FTS/BM25 artifacts in this change. Future backend replacement can happen behind the existing facade.

## UI and Read-Only Boundaries

Workbench Literature/Index and Graph views receive freshness/job state and host commands for rebuild/retry. Snapshot construction may enqueue a best-effort rebuild for stale/missing projections, but must not synchronously block on full rebuild.

MCP/read-only tools continue returning bounded DTOs. When projections are stale/missing they return diagnostics or best-effort fallback, not raw Zotero objects.
