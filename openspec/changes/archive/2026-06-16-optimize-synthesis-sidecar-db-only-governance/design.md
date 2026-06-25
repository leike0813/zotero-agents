# Design

## Scoped Stale Canonical Governance

`reconcileStaleCanonicalsForSource()` still runs during sidecar apply, but it
builds one stale canonical group list before the loop. The repository resolves
blockers for that group list with bounded SQL:

- active raw references by canonical id and status;
- accepted/non-rejected bindings by canonical id;
- redirects by source or target canonical id;
- reference match proposals by source or target canonical id;
- review items by scoped `scope_ref` or bounded payload substring search;
- citation graph nodes and edges by visible source/target ids.

The service consumes the returned blocker map per stale canonical. This keeps
the lifecycle policy unchanged while removing repeated full table scans.

## Unchanged Literature Reruns

`applyLiteratureDigestSidecar()` computes a reference sidecar source hash from
the source ref, artifact hashes, and matched-reference payload hash. If the
existing `reference_sidecar` cache basis is already ready with the same source
hash, the apply path skips reference replacement, stale canonical governance,
and graph/related-items stale marks. Artifact sidecar rows are upserted only
when their hash, status, locator, or diagnostics change.

## DB-Only Global Sidecar State

Projection registry state is represented by `synt_cache_basis` rows with
`cache_kind = "projection_registry"`. Projection rebuilds still return the same
DTOs, but normal rebuild/read paths no longer write or read projection JSON
files in `data/synthesis/sidecar`.

Canonical-store receipts, events, and diagnostics are stored in
`synt_canonical_store_record`. These rows are local repository state for normal
runtime and can later be exported by explicit sync/checkpoint commands. Normal
transactions no longer append `canonical-store-*.jsonl` files.

Topic body artifacts remain file based. Existing legacy sidecar JSON files are
migration input or inspection residue, not fallback read paths for normal
Workbench or governance execution.

## Directory Creation

`initializeSynthesisKnowledgeGraphStore()` only guarantees the synthesis root.
File writers create their specific parent directories when they write topic
artifacts, canonical checkpoint assets, sync transport files, or debug outputs.
Read-only tag/concept/topic-graph projection paths initialize SQLite only and
must not create empty `data/synthesis` child directories.
