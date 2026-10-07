# Design

## Context

See proposal.md and the approved decision records in `artifacts/vector-retrieval-wayfinder/`. Source baseline is `1d19226aeeba6ca5d2732639688a688ee9d96581`. Existing Rust Evidence and Topic applications own lexical search rounds, the Broker owns Library paging, and public maintenance owns execution. RepositoryPort already provides four short reader transactions and one writer. The old LibrarySnapshotIndexApplication is test-only and is not a production cache to revive.

## Goals / Non-Goals

**Goals:** add optional enhancement at current owners, reuse durable maintenance and credential encryption, and retain source-bound verified evidence.

**Non-Goals:** new processes, repository forwarding traits, dependencies, public vector knobs, public reference queries, Agent maintenance tools, full Library replicas or source generation. Research candidate thresholds and hardware budgets are not shipping defaults.

## Decisions

### Retrieval owner and persistence

Add `retrieval.rs` in the existing synthesis-application crate, composed once in ProductionApplications. It accepts the existing RepositoryPort, source/embedding ports and canonical Topic facts. Add a repository module for vector facts and register foundation.v6 → v7 through the established migration/backup path. Keep the writer closed during Host/network reads, splitting and scoring. Private tables hold an active publication, suspended source groups and one staging target with reusable completed groups. Original little-endian float32 blobs, source versions, UTF-16 ranges and fragment identity are durable; normalized vectors are rebuildable acceleration, not an additional authority.

A source group is full portable paper reference + source kind + canonical/attachment identity, or Topic identity + section. A private generation/publication basis binds encoding, rules and scope. Fragment ranges refer to original text; split paragraphs/lines within a bounded request and only split further at Unicode-safe boundaries when necessary. No tokenizer character estimate is described as exact token capacity. Source failures preserve staging and prevent full publication; absence is recorded coverage. Large groups are staged by bounded batches and published atomically only after the source version is revalidated.

Use full exact scoring for the measured supported scope before adding a cutoff. Sequential float64 cosine on original float32 values is the ranking contract; normalized float32 scoring is acceleration only. Stable identities break ties. Aggregate best fragment per literature identity before equal-weight RRF with k=60. Extend existing round basis/method fields rather than add a second cursor cache. All public semantic scores remain private.

### Shared wire contract and Host adapter

Add `packages/synthesis-contracts/src/retrieval.ts` as the TypeScript DTO source, with Rust serde equivalents and registry schemas/corpus. All new objects reject unsupported fields and all arrays/text/vector dimensions are bounded at the trust boundary. Internal limits are transport bounds, not claimed model token limits or production capacity.

Encoding identity: `{ modelId: string, dimensions: number, queryPrefix: string, documentPrefix: string }` with actual verified dimension. Scope: `{ libraryIds: number[], sourceKinds: SynthesisEvidenceSourceKind[], includeTopics: boolean }`. Configuration contains multiple Host-only connections `{ id, name, protocol: "openai" | "ollama", baseUrl, modelId, queryPrefix, documentPrefix, dimensions?: number }`, `enabled`, selected `primaryConnectionId`, ordered `fallbackConnectionIds` and pending scope. Credentials are keyed separately and never carried in these public snapshots.

Two private reverse-Host capabilities: `retrieval.embedding.describe` request `{}` returns `{ enabled, identity: EncodingIdentity | null }`; `retrieval.embedding.encode` request `{ identity, purpose: "query" | "document", inputs: string[], deadlineAtMs: number }` returns `{ identity, vectors: number[][] }`. Describe does no network call: identity exists only after an explicit synthetic connection test supplies actual dimensions. Encode uses that identity to select compatible configured services. Index target identity therefore remains separate from the current active publication. Credentials stay entirely in Host. Protocol HTTP responses are completely validated before returning one batch, with OpenAI explicit-index association and Ollama ordered-array association. Ollama uses `truncate: false`; output-dimension parameters are sent only when supported/configured. Query tries each selected service once; document batches have at most three total attempts and one shared deadline. Fetch is injectable for tests and late-bound for Zotero; production modules import no Node filesystem or networking.

Extract the existing WebDAV encrypted-envelope implementation into one shared module preserving the old stored schema, preference keys and errors. New embedding preferences hold nonsecret connections and independently encrypted credentials. Connection tests use synthetic fixed strings; no default connection/model is activated. Verified presets fill only new forms.

### Maintenance and workbench seam

Register native routes `retrieval.getState`, `retrieval.build`, `retrieval.rebuild`, `retrieval.update`, `retrieval.cleanup`, `retrieval.recommend`, and bounded scoped `retrieval.invalidate`. Maintenance routes use existing production maintenance catalog and PublicMaintenanceOperation view/receipt. These are workbench-private adapters, not Workflow/Bridge/MCP tools. `getState` returns `{ enabled, status: "missing" | "ready" | "paused", activeIdentity: EncodingIdentity | null, pendingIdentity: EncodingIdentity | null, activeScope: RetrievalScope | null, pendingScope: RetrievalScope | null, publication: string | null, progress: { completedGroups, totalGroups, completedFragments, failedGroups, missingGroups }, updatedAt: string | null, issues: SynthesisSearchIssue[] }`. Build/rebuild/update request `{ identity, scope }`; existing durable submit wrappers bind these args and retry keys. Long full-build route deadlines remain bounded and must fit measured build costs rather than inherit the old 10-minute graph budget mechanically.

On full build/rebuild start, commit paused state before encoding. On increment start, suspend only known-changed groups. Call public owner promotion checkpoints between batches and before group/final publication. Retry retains compatible staging; continue follows the existing lifecycle. Publication commits all active identity/rules/scope/vector state transactionally. Cleanup is an explicit required tail with success-plus-issue after publication, not failure that revokes availability. Discovery runs afterward in separate resumable candidate work and never triggers embedding rebuild.

The workbench Host command adapter exposes settings get/save/test, state, submit/cancel/retry/continue and recommendations using these native routes. UI owns form state; snapshot contains nonsecret configuration, state and existing maintenance receipt. Home uses its own region signature; progress does not enter other region signatures. Similarity request `{ paperRef, limit?: number }` returns `{ status, materialKind: "metadata" | "generated" | "weak", results: [{ paperRef, title, excerpt, materialKind }], issues }`. Build recommendation seed through Broker metadata or canonical digest structured overview, never regex Markdown extraction. Recommendation data has a bounded request-owner lifecycle and is cleared when the selected paper changes.

### Existing searches and Discovery

Preserve `library.lexical.execute` as independently lexical. Add private `library.retrieval.execute` using the same bounded, already scoped current-fact request/result shape; the Broker prefers it when available and retains lexical fallback. Library rounds keep current Host fact/version membership and add actual method/publication basis without changing public request fields. The Rust owner filters full refs before scoring, and metadata-only filter changes do not re-encode content.

Evidence uses its current scope to query indexed candidates, then the existing EvidenceSourcePort reads exact source text in that same call. A source that changed is skipped, locally suspended and reported; verified sources remain. Canonical Topic search uses current sections and canonical content basis, never Library filters or Evidence passages. Every round binds active publication plus existing source membership, including nonmatches, and continuation fails on change; no continuation encoding call.

After index publication Discovery uses canonical Topic description and positive interests only. Existing Topic repository hints persist rejection keyed by full paper identity. Revalidate Topic/source/user-state before committing bounded candidates. Adopted/rejected candidates are excluded; screened-out results are reconsidered only when their basis changes. Missing description preserves current hints. Stage 30 interprets must/exclude semantically. Unknown triage persists pending; core/related becomes adopted only through successful existing apply. Update existing stage source and Python manifest normalization, not a second candidate adoption endpoint.

## Risks / Trade-offs

- Exact dense scans may exceed 25k budgets → measure full eligible oracle and actual fragment counts before choosing a candidate cutoff; report unsupported conditions and seek the already planned acceptance decision.
- Source changes during network work → revalidate source and publication before transaction promotion; never hold writers during I/O.
- Service model replacement with unchanged ID/shape is undetectable by contract → explicit user rebuild; no extra fingerprints.
- True independent 25k corpora and hardware quality labels are unavailable locally → synthetic stress and real small-corpus quality remain separate, with unverified production gates left open.
- `/mnt/HotData/tmp` is NFS → place temporary artifacts there as requested, report storage conditions, and do not label its timings local cold-disk evidence.

## Migration Plan

Apply registered SQLite v7 migration with existing pre-migration backup and required-column checks. Existing installs begin with no index and unchanged lexical operation. Enable only explicit user configuration/test/build. Keep local vectors excluded from durable bundle capture/import. Source rollback retains original canonical facts; local derived assets can be rebuilt through the explicit maintenance path without deleting user data. Complete Rust/TypeScript/contract checks before current-source native packaging and unified Zotero E2E.

## Open Questions

Only measured acceptance choices remain: quality thresholds after fixed reference/model and human labels, measured resource/remote-fee budgets, and final exact/candidate capacity. The available local Ollama and user `http://192.168.13.11:11434` services need actual encoding/device measurements. No feature semantics depend on these decisions.
