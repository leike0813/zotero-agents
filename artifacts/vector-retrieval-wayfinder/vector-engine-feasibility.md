# Vector retrieval engine feasibility

**Research date:** 2026-10-04  
**Question:** Which local vector storage and retrieval approaches fit the existing Rust Synthesis sidecar and bundled SQLite, with a seven-platform release requirement?  
**Scope:** Feasibility facts only. This note does not select an engine. Embedding providers are out of scope.

## Workload supplied for this investigation

- Initial target: about 25,000 Zotero literature items.
- Sources to index include metadata, existing Markdown, analysis outputs, and Topics.
- The first release excludes ordinary notes, PDF highlights/annotations, and conversation notes because of their complexity and maintenance cost.
- Retrieval has three result classes: literature, evidence snippets, and Topics. Results must label whether their source is original material, generated analysis, or a Topic.
- Indexes and queries are isolated by Zotero library. The current library is the default scope; cross-library search is explicit.
- An explicit initial build/rebuild is acceptable; subsequent ingestion should be bounded and incremental.
- The number of searchable chunks/snippets per item is unknown. Thus 25,000 is a document count, not a known vector count.
- Any retrieval design needs to keep embedding model, vector dimension, and distance metric isolated. Metadata filtering followed by correct top-k within the filtered set is a requirement to validate, not an assumed property of every candidate.

## Findings at a glance

The exact-scan baseline has a direct transaction and recovery story because vectors, source identity, metadata, and query filtering can live in one SQLite database and one transaction. Its top-k can be exact by construction, but exact search is not unique to this baseline: sqlite-vec documents a scalar-distance brute-force mode, and Lance also has flat-search modes. Query cost grows with the number of vectors examined. Source: [sqlite-vec KNN queries](https://alexgarcia.xyz/sqlite-vec/features/knn.html).

`sqlite-vec` is a small C SQLite extension with vector virtual tables, metadata columns, and vector KNN queries. Its single-source packaging story is appealing, but it is pre-v1; the Rust-to-bundled-SQLite static integration, supported filtered top-k semantics, and build impact on all seven targets remain to be proven.

`hnsw_rs` is a Rust HNSW ANN library with in-search filtering and dump/reload support. It introduces no native C++ engine boundary, but it is approximate and its separately persisted graph does not automatically commit atomically with SQLite metadata. A caller-owned ID/tombstone and recovery protocol would be needed unless the graph snapshot is stored and updated as part of the same SQLite authority.

Lance/LanceDB provides a richer columnar dataset and vector-index stack, including prefiltering and persistent dataset operations. Its current Rust dependency surface is much broader than this sidecar’s, and neither a seven-target build nor an acceptable binary-size increment is established by upstream documentation. Treat it as a higher-cost comparison point.

These are feasibility observations, not a ranking. No project-specific latency, recall, memory, rebuild, or binary-size benchmark was run.

## Existing project delivery and persistence constraints

The sidecar workspace pins `rusqlite = 0.40.1` with `default-features = false` and `bundled` plus `backup`. It uses Rust 2024 and release settings `opt-level = "z"`, LTO, one codegen unit, and stripping. The reviewed build recipe and Linux x64 manifest do not identify an exact SQLite version; that requires checking the locked libsqlite3-sys source or querying the actual runtime. See [`rust/synthesis-sidecar/Cargo.toml`](../../rust/synthesis-sidecar/Cargo.toml), [`rust/synthesis-sidecar/Cargo.lock`](../../rust/synthesis-sidecar/Cargo.lock), [`rust/synthesis-sidecar/build-recipe.json`](../../rust/synthesis-sidecar/build-recipe.json), and [`addon/bin/linux-x64/synthesis-sidecar/manifest.json`](../../addon/bin/linux-x64/synthesis-sidecar/manifest.json).

The release matrix is exactly seven targets: Windows x64, macOS x64 and arm64, Linux x86, x64, armv7, and arm64. The build recipe uses MSVC with static CRT flags on Windows, native Apple runners for the two macOS architectures, Zig cross-builds for Linux x86/x64/armv7, and an arm64 Linux runner. Current manifests in `addon/bin/*/synthesis-sidecar/` report executable sizes from about 5.2 MB to 8.5 MB. These are baseline executable sizes, not headroom estimates. The prebuild workflow also enforces a 15 MiB archive limit per target. See [`packages/synthesis-contracts/src/sidecarRuntimeBundle.ts`](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts), [`scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts`](../../scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts), and [`.github/workflows/prebuild-synthesis-sidecar-runtime.yml`](../../.github/workflows/prebuild-synthesis-sidecar-runtime.yml).

The existing license inventory is generated and checked against the Rust dependency graph. A candidate dependency must be pinned in Cargo.lock, included in the package inventory, and reviewed under its actual selected features and all seven target triples. A permissive direct license does not establish the licenses of all transitive dependencies. See [`rust/synthesis-sidecar/licenses.json`](../../rust/synthesis-sidecar/licenses.json) and [`scripts/synthesis/check-synthesis-rust-license-inventory.ts`](../../scripts/synthesis/check-synthesis-rust-license-inventory.ts).

SQLite’s online backup API copies a live database while allowing other connections to use it. WAL mode allows readers alongside a writer, but remains a single-writer design; the WAL is part of durable database state and must travel with the database until checkpoint/close. This matches a single-file exact baseline well, but sidecar/library coordination still needs to respect SQLite locking and backup semantics. Sources: [SQLite Online Backup API](https://www.sqlite.org/backup.html), [SQLite WAL](https://www.sqlite.org/wal.html).

## Candidate comparison

| Candidate | Search and distance | Filtering and top-k | Updates, deletion, and recovery | Concurrency and seven-target fit |
|---|---|---|---|---|
| Exact scan in bundled SQLite | Exact full scan over a SQL-selected candidate set; implement L2/cosine (or the project’s selected metric) consistently. Sort by `(distance, stable_id)` and take `k`. No graph/index approximation. | Apply metadata predicates and source eligibility in SQL before scoring, then rank every surviving vector. This gives exact top-k for that filtered set. Model/dimension/metric can be represented in ordinary columns and constrained in the same query. | Rows and source/version metadata can commit or roll back in the same SQLite transaction. SQLite journaling/WAL handles process-crash recovery. Rebuild is a replace-in-transaction or staged-generation operation; an independent side file is unnecessary. | Pure Rust arithmetic plus existing bundled SQLite is the least novel target path. No new native library. SQLite still serializes writers; long exact scans and writes contend for CPU/database access. Per-query cost is O(candidate count × dimension), followed by top-k selection/sort. |
| `sqlite-vec` | SQLite virtual table `vec0`, with `float32`, `int8`, and bit vectors. Dimensions are fixed in the vector-column declaration; current source sets a maximum of 8192 dimensions. Public distance functions document Euclidean L2, cosine, and Hamming for bit vectors. The documented project status is pre-v1. | Supports metadata, auxiliary, and partition-key columns in `vec0`; source currently caps these at 16 metadata columns and 4 partition keys. KNN returns distance-ordered rows with a `LIMIT`. A maintainer discussion says arbitrary JOIN prefiltering through the virtual table is limited and gives a regular-table exact scan as the workaround. Strict top-k under complex joins or filters must therefore be checked against the intended query shape. | The virtual table writes SQLite shadow tables and exposes insert/update/delete paths in source, which suggests same-database transactions are possible. Crash atomicity must be confirmed in integration tests for the exact rusqlite/SQLite build and extension registration path. Treat experimental IVF/DiskANN code as experimental; do not rely on it for durable index correctness without pinning and fault testing. Rebuild can regenerate an index from canonical vector rows. | Upstream says the extension is pure C, dependency-free, compiles from a C source/header, and can be statically linked. This is a plausible fit with bundled SQLite, but compatibility of statically linking its entrypoint against rusqlite’s bundled SQLite and registering it on each connection is not established here. Build and smoke each of the seven triples. Upstream’s general “runs anywhere SQLite runs” statement is not a project cross-build result. |
| `hnsw_rs` (Rust HNSW) | Approximate HNSW. The Rust crate supports L1, L2, cosine, Jaccard, Hamming, and custom distance traits over numeric types. Query uses `k` plus search-width (`ef`) parameters; approximate results/recall depend on construction and query parameters. | Implements search-time filters (allowed ID list or a filter callback), so filtering is not simply a post-filter. It does not provide a relational metadata planner. Filtered top-k recall and behavior for highly selective filters must be measured; “filtered during search” does not guarantee exact top-k. Use a SQLite-owned filtered ID set as the filter authority. | The crate documents dump/reload; it does not document a durable WAL, transactional coupling to an application database, or a general per-point delete/update operation in the reviewed public API. No delete API was found in the inspected public docs. A robust design needs tombstones/version checks and graph rebuild/compaction, or complete snapshot replacement with an explicit crash-safe commit protocol. A crash between SQLite commit and graph-file replacement could otherwise produce a mismatch. | Pure Rust core avoids a separate native C/C++ engine. Its optional `simdeez_f` is x86_64-specific; omit it for a common portable build or maintain per-target feature selection. The upstream docs do not certify this project’s seven triples. No binary-size increment or embedded-memory profile is published for the project’s configuration. |
| Lance / LanceDB Rust | Persistent columnar dataset with vector indices including IVF/HNSW families; exact flat and approximate modes exist in the Lance index family. Query APIs expose vector search and metric/index parameters. | LanceDB query supports prefilter and postfilter. Upstream documents that postfiltering can return fewer than `k` or none; prefiltering searches the filtered subset and is the relevant mode when true top-k-within-filter is required. Exactness still depends on selected vector index/query mode. | Supports append, delete, update/upsert and versioned dataset writes. Its dataset/manifest and index files form a separate storage system from the sidecar SQLite DB, so atomic updates across both stores are not provided by an SQLite transaction. Requires a reconciliation/rebuild protocol if source authority remains in SQLite. Verify crash recovery and compaction behavior for the chosen local namespace/storage configuration. | Rust API and Apache-2.0 are documented. Current dependency metadata includes Arrow, DataFusion, Lance internals, object_store, Tokio, and other crates; this is a materially larger dependency surface than current sidecar. Upstream’s Cargo deny configuration covers Linux x64/arm64, macOS x64/arm64, and Windows x64/arm64, but not this project’s Linux x86 and armv7 targets; therefore it does not establish compatibility with all seven. Added compressed/uncompressed executable and archive size are unknown and likely need a direct build to answer. |
| `sqlite-vss` (reference only) | SQLite virtual tables backed by Faiss; default factory is exhaustive Flat, with alternative trained/approximate Faiss factories. Dimensions are declared per vector column. | KNN via `vss_search`; no general metadata-filter/top-k guarantee was established in the reviewed docs. | Requires explicit commit for index changes, but has an additional Faiss-backed index state to manage. | Upstream explicitly says it is no longer actively developed and directs users to sqlite-vec. Published prebuilt binaries are limited to Linux x86_64 and macOS x86_64, and Linux instructions require OpenMP/BLAS/LAPACK packages. This is a poor seven-platform packaging baseline; included as a caution, not a shortlist candidate. |

## Details that affect the design

### Data volume and model isolation

At float32, raw vector bytes are `vector_count × dimensions × 4`. For the supplied 25,000 items, one 384-dimensional vector per item is 38.4 MB decimal; one 768-dimensional vector per item is 76.8 MB. These figures exclude SQLite row/index overhead and any HNSW graph. If Markdown or analysis outputs produce multiple chunks per item, multiply by the actual chunk count. That count, target embedding dimensions, model set, query `k`, and expected library growth are not known yet.

Design implication, pending the owning decision tickets: distinguish the compatible embedding recipe (model/version, dimension and representation settings) from index/query scope (library and source/result classes) and provenance (source record/revision and chunk identity). Library or source filters alone do not change embedding coordinates or require re-embedding. A query needs a compatible recipe and explicit library scope; cross-library retrieval is opt-in. Source metadata and content remain owned by their existing authorities, while vectors and ANN indexes are derived state. The exact persistence/partition strategy is not decided by this research.

### Strict top-k after filtering

“Filter before search” and “filter after ANN search” are different correctness contracts. Postfilter can return fewer than `k` even where enough eligible rows exist. For exact filtered top-k, first obtain the eligible IDs and score all their vectors, or use an engine’s documented prefilter mode and validate it for every predicate type used by the application. The sqlite-vec maintainer’s JOIN discussion specifically warns that ordinary relational JOIN constraints do not automatically become efficient `vec0` prefilters.

For an ANN candidate, define what happens when the filter selects a small or disconnected region of the graph. Measure recall against exact scan on the same filtered set; include `k` smaller than, equal to, and larger than the eligible population. Include model/dimension mismatches as rejected queries rather than silently mixing spaces. Verify that library scope is applied before ranking, and that result/source labels survive projection into all three result classes.

### Atomic updates and rebuild safety

The least complex crash invariant is one canonical SQLite transaction that writes source revision, metadata, vector bytes, and visibility state together. An external graph/index is a derived cache: give it a generation identity tied to committed source/vector revisions, publish it only after a complete successful build, and discard/rebuild it when its generation is stale. If updates are staged in another file, define which side is authoritative at every crash point and how startup detects/reconciles a partially published generation.

The exact scan and a same-file SQLite vector extension can potentially keep authoritative vectors and metadata in one database transaction. The HNSW and Lance approaches add a graph snapshot or dataset/index lifecycle that must be coordinated with SQLite. This is a data-integrity distinction, not just a performance choice.

### Native release constraints

The seven-platform list is a hard deliverable surface, not an upstream portability claim. `sqlite-vec` has the shortest apparent native route: one C source/header and no stated third-party library dependency, compiled into the existing executable against its bundled SQLite. The remaining unknowns are actual Rust build-script integration, duplicate SQLite symbol handling, extension registration, SIMD defaults, target-specific C compiler/linker availability, and license inventory.

`hnsw_rs` uses Rust and can avoid native C toolchains. Keep target-independent features unless per-target specialization is explicitly justified; upstream’s x86 SIMD option would otherwise need a separate build choice. Lance/LanceDB is Rust too, but broad Arrow/DataFusion/storage dependencies increase lockfile, license, compile, binary-size, and cross-target validation work. Upstream CI/build coverage must be inspected at pinned revisions before counting a platform as supported.

Current local bundle sizes (from the checked-in manifests) are:

| Target | Current executable bytes |
|---|---:|
| darwin-arm64 | 5,272,176 |
| darwin-x64 | 7,179,328 |
| linux-arm | 7,109,572 |
| linux-arm64 | 6,574,080 |
| linux-x64 | 8,479,400 |
| linux-x86 | 8,397,340 |
| win32-x64 | 7,154,688 |

These are measured repository facts, not estimates of any candidate’s incremental size. The archive limit is 15 MiB compressed per target; compare actual candidate builds and packaged archives, not Cargo crate source size or upstream marketing claims.

## Unknowns and follow-up evidence needed

1. **Vector cardinality and shape:** chunks per included source type, maximum and typical item size, target dimension(s), model migration frequency, and retention/deletion policy. Excluded note/highlight/conversation-note classes remain outside the first-release corpus.
2. **Query contract:** exact vs acceptable ANN recall, filtered top-k semantics for each metadata predicate, typical filter selectivity, `k`, concurrent query count, and latency budget. Confirm library scoping, current-library default, explicit cross-library operation, three result classes, and source labels as observable contract cases.
3. **sqlite-vec integration:** choose and pin a release/commit; demonstrate statically linked registration against this workspace’s bundled SQLite on seven triples; verify transactional rollback/reopen, insert/update/delete, metadata and join filtering, indexed top-k behavior, and archive-size delta. Its pre-v1 API means pinning is material.
4. **HNSW lifecycle:** verify current crate deletion/update support from a pinned release source; measure graph and memory overhead; design and crash-test snapshot publication, tombstones, and rebuild/compaction.
5. **Lance lifecycle/targets:** establish whether the required minimal feature set compiles for Linux x86 and armv7, validate its local transaction/recovery behavior, review the selected dependency license graph against the project’s inventory policy, and measure all target outputs.
6. **Failure and concurrency envelope:** crash at each write/rebuild publication boundary; exercise simultaneous readers, updates, sidecar restart, backup, and stale-generation detection. Do not infer these results from upstream feature descriptions.
7. **Project-specific performance:** benchmark the same anonymized representative vector corpus and filtered query set against exact scan. Record p50/p95 latency, recall@k, peak RSS, build time, bundle-size delta, rebuild duration, incremental throughput, and reopen/recovery results per supported target class. No vendor benchmark substitutes for this measurement.

## Primary sources checked

All external sources below were accessed on **2026-10-04**. Mutable `main`/`latest` pages should be replaced with pinned tags or commits before implementation.

- Issue scope and supplied workload context: [研究可内嵌向量引擎的能力与七平台交付约束](https://github.com/leike0813/zotero-agents/issues/78).
- Project release manifest/target source of truth: local files linked in “Existing project delivery and persistence constraints”; release build workflow [prebuild-synthesis-sidecar-runtime.yml](../../.github/workflows/prebuild-synthesis-sidecar-runtime.yml).
- SQLite extension facts, API, types, pre-v1 status: [`sqlite-vec` README](https://github.com/asg017/sqlite-vec), [API reference](https://github.com/asg017/sqlite-vec/blob/main/site/api-reference.md), [C implementation](https://github.com/asg017/sqlite-vec/blob/main/sqlite-vec.c), [installation/compilation notes](https://github.com/asg017/sqlite-vec/blob/main/site/getting-started/installation.md), [Apache-2.0](https://github.com/asg017/sqlite-vec/blob/main/LICENSE-APACHE), [MIT](https://github.com/asg017/sqlite-vec/blob/main/LICENSE-MIT), and [maintainer discussion on JOIN filtering](https://github.com/asg017/sqlite-vec/issues/196).
- SQLite VSS status, platform packages, and Faiss behavior: [`sqlite-vss` README](https://github.com/asg017/sqlite-vss), [API reference](https://github.com/asg017/sqlite-vss/blob/main/docs.md).
- Rust HNSW capabilities, persistence, filtering, SIMD, and license: [hnsw-rs repository README](https://github.com/jean-pierreBoth/hnswlib-rs), [crate API docs](https://docs.rs/hnsw_rs/latest/hnsw_rs/), [crate manifest/source](https://github.com/jean-pierreBoth/hnswlib-rs/blob/master/Cargo.toml), [Apache-2.0](https://github.com/jean-pierreBoth/hnswlib-rs/blob/master/LICENSE-APACHE), [MIT](https://github.com/jean-pierreBoth/hnswlib-rs/blob/master/LICENSE-MIT).
- Lance vector index choices and filtered-query semantics: [Lance index selection guide](https://github.com/lance-format/lance/blob/main/skills/lance-user-guide/references/index-selection.md), [LanceDB Rust query API](https://docs.rs/lancedb/latest/lancedb/query/trait.QueryBase.html), [LanceDB query request](https://docs.rs/lancedb/latest/lancedb/query/struct.QueryRequest.html), [Lance Cargo workspace manifest](https://github.com/lance-format/lance/blob/main/Cargo.toml), and [LanceDB dependency metadata](https://docs.rs/crate/lancedb/latest).
- SQLite storage durability and concurrency: [Online Backup API](https://www.sqlite.org/backup.html), [WAL documentation](https://www.sqlite.org/wal.html).

## Assessment for the fact-finding ticket

This note is sufficient to close the **fact-finding** portion: it compares a small set of options across the requested capability and delivery dimensions, cites first-party sources, and labels open evidence explicitly. It does not resolve the final engine choice, measured workload performance, or the unknown chunk cardinality; those require the owning design decision and project-specific build/benchmark work.
