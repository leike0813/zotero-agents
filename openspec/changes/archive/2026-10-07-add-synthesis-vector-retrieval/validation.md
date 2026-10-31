# Implementation validation

Source baseline: `1d19226aeeba6ca5d2732639688a688ee9d96581`. Validation date:
2026-10-07. Changes remain uncommitted. Large caches, test inputs and logs are
under `/mnt/HotData/tmp` (NFS). One unchanged 2k Reference/Workbench projection
test was also run in `/dev/shm` to isolate NFS latency; its log remains under
`/mnt/HotData/tmp`.

## Changed owners

- Shared retrieval DTO/schema/corpus live in `packages/synthesis-contracts`;
  Repository v7 stores local original vectors and recoverable source groups.
- Rust `retrieval.rs`, `retrieval_similarity.rs` and `retrieval_discovery.rs`
  own ranking, publication and private consumers. Runtime routes reuse public
  maintenance; Evidence/Topic applications and the Library Broker retain search
  scope, source verification and continuation ownership.
- Host embedding preferences/provider and the extracted credential envelope
  reuse the WebDAV encryption contract. Workbench settings remove a connection's
  encrypted credential when its connection is removed.
- Home retrieval controls and paper-detail recommendations stay in their own
  managed regions. Stage 30 skill sources preserve uncertain candidates as
  pending. Existing architecture documents and `AGENTS.md` record these owners.

## Local evidence

- Node feature, workbench, reverse-Host and source tests: 185 passing in
  `vector-retrieval-final-node.log`.
- Contract, Topic projection, Home and Broker tests: 147 passing in
  `vector-retrieval-final-contract-node.log`.
- Final Workbench host commands and embedding preferences: 98 passing in
  `vector-retrieval-credential-removal-green.log`, including credential removal.
- Split Topic skill runtime: 13 passing, including external and unknown
  Discovery outcomes, in `vector-retrieval-final-skill-runtime.log`.
- Real Rust production routes: five passing cases cover duplicate admission,
  publication, similarity, unchanged-source reuse, invalidation without encoding,
  candidate-only cleanup, restart reads, invalid requests, post-publication
  cancellation and Library/Evidence vector-only scope. Evidence:
  `vector-retrieval-production-routes-last.log`.
- Existing Evidence/Library production routes: five passing cases including
  current Markdown/analysis source reads and shared collection/item scope, in
  `vector-retrieval-evidence-production-final.log`.
- Final production-route sweep: 29 passed and one maintenance-poll timeout on
  NFS in `vector-retrieval-production-current.log`. The timed-out vector-only
  case passed unchanged in an isolated NFS run
  (`vector-retrieval-vector-only-isolated-current.log`). The remaining 2k
  Workbench case passed in RAM (`vector-retrieval-index-memory.log`). These
  runs cover all 31 distinct cases without changing production deadlines.
  The existing closed scenario matrix includes all seven private retrieval
  entries; its final pass is included in the sweep.
- Final Rust workspace: 482 tests passing in
  `vector-retrieval-rust-tests-current.log`. The additional regression checks
  both Library and Evidence: enhancement timeout preserves verified lexical
  results with limited coverage, while cancellation propagates.
- TypeScript root, sidebar, dashboard and Synthesis configurations passed.
  Modified TypeScript/JavaScript ESLint checks passed. Prettier and Rust fmt
  checks passed. Final workspace build, fmt and clippy (`-D warnings`) passed.
  The generated capability table is validated by its Host Bridge renderer
  rather than reformatted by Prettier; its baseline content is unchanged.
- Cross-language contracts: 20 schemas, 989 definitions, 93 positive and 73
  negative cases; no errors. Native runtime parity: 19 cases, no errors;
  worker-transfer parity: eight lifecycle cases and four corpus cases, no errors.
- Production capability identity: 113 operations; service boundary,
  Topic/Workbench parity (28 routes, 21 observables), WebDAV maintenance parity
  (10 operations) and license inventory (71/71, SQLite 3.53.2) passed.
- Host Bridge generated surfaces, agent language and consumer guidance checks
  passed with no generated changes. No agent-facing instruction is deleted or
  rewritten; the public command set remains unchanged.
- Independent read-only lifecycle/Discovery review found no high-confidence
  blocker. It covered staging reuse, increment/no-op, post-publication tails and
  publication/Topic/source/user-decision revalidation. It did not review quality
  or platform capacity. Separate final search review checked hard scope,
  original UTF-16 ranges, source freshness and continuation identity. Host/UI
  review checked credentials, provider budgets and region/request isolation;
  credential deletion and timeout/cancellation findings were repaired and
  regression-tested. No-index invalidation is a read-only no-op and never
  creates work; disabling enhancement does not suppress source invalidation of
  an existing index.

Rust commands use the pinned `nightly-2026-07-25`, `--locked`,
`CARGO_TARGET_DIR=/mnt/HotData/tmp/vector-retrieval-cargo-verified`,
`CARGO_INCREMENTAL=0`, `TMPDIR=/mnt/HotData/tmp` and
`RUSTFLAGS='-C linker=/usr/bin/gcc -C link-arg=-fuse-ld=bfd'`.
The workspace commands are `cargo test --workspace --no-fail-fast`,
`cargo clippy --workspace --all-targets -- -D warnings`, `cargo fmt --all --check`
and `cargo build --workspace`, with manifest
`rust/synthesis-sidecar/Cargo.toml`.

The Node route checks use the existing Mocha harness and current-source Linux
sidecar. They are process/contract integration evidence, not System E2E.
An earlier high-load route run timed out; the isolated repeat passed. The 2k
Reference/Workbench Index case consistently exceeded the native request deadline
on NFS but passed unchanged in RAM; this is not evidence of NFS capacity. The
final vector-only maintenance poll also timed out in the batch and passed
unchanged in isolation on NFS. These failures remain in their original logs.
An earlier
maintenance test incorrectly required encoding after unchanged-source
invalidation; it now verifies source revalidation and reuse instead.

## Actual service probes

The production Host provider sent its fixed synthetic query and document
strings separately, using the Qwen query prefix and an empty document prefix.
It validated both complete responses, dimensions, finite values and nonzero
norms. No user library material was sent.

| Endpoint           | Ollama | Model                | Actual dimensions | Pair latency |
| ------------------ | ------ | -------------------- | ----------------: | -----------: |
| local              | 0.34.1 | qwen3-embedding:0.6b |              1024 |      2464 ms |
| local              | 0.34.1 | qwen3-embedding:4b   |              2560 |      2305 ms |
| user 4090 endpoint | 0.35.1 | qwen3-embedding:0.6b |              1024 |      7489 ms |
| user 4090 endpoint | 0.35.1 | qwen3-embedding:4b   |              2560 |      4292 ms |

These are single probes during development, with model/cache/background-load
conditions uncontrolled. Local `nvidia-smi` reports Tesla P4 8192 MiB. Remote
GPU identity has not been independently checked. Ollama `/api/ps` reported
4096 active context locally and 32768 remotely; these are service settings,
not experimentally verified input limits. This does not close task 6.1 or
establish model quality, throughput or a production capacity.

## Open acceptance

## Measured service encoding (6.1)

Both services were driven through the production embedding provider, so the
prefixes, `truncate: false`, whole-response validation and shared attempt
budget are the code paths actually used. Model IDs, dimensions and paired
query/document encoding agree across both endpoints.

| Endpoint | Ollama | GPU / context | Model | Dimensions |
| --- | --- | --- | --- | ---: |
| local | 0.34.1 | Tesla P4 8192 MiB, ctx 4096 | qwen3-embedding:0.6b | 1024 |
| local | 0.34.1 | Tesla P4 8192 MiB, ctx 4096 | qwen3-embedding:4b | 2560 |
| remote | 0.35.1 | ctx 32768, GPU unverified | qwen3-embedding:0.6b | 1024 |
| remote | 0.35.1 | ctx 32768, GPU unverified | qwen3-embedding:4b | 2560 |

First-call cost after model residency: local 2582 ms (0.6b) and 2281 ms (4b);
remote 6991 ms (0.6b) and 3267 ms (4b). Warm single-document encode over seven
repetitions, milliseconds:

| Input | Local P4 p50 / p95 | Remote p50 / p95 |
| --- | ---: | ---: |
| 50 words | 20 / 24 | 42 / 61 |
| 1000 words | 42 / 51 | 48 / 57 |
| 4000 words | 92 / 117 | 64 / 75 |

The local endpoint wins on short inputs because network round trip dominates;
the remote endpoint wins above roughly 1000 words. Individual remote requests
also swung from 64 ms to 279 s for adjacent input sizes while the model stayed
resident, so the remote is shared or contended and these numbers describe this
machine at this moment, not a service capacity.

Input limits are enforced rather than silently truncated. The local service
accepts 4000 words and rejects 4200 with `the input length exceeds the context
length`, matching its 4096 context. The remote service accepted 16000 and 20000
words, so its ceiling is above 20000 words but was not established. Through the
production provider that rejection surfaces as `Synthesis protocol request is
invalid` with no reason, so an operator cannot distinguish an over-length input
from bad credentials or a missing model.

## Seven-platform delivery (7.3)

Governed development prebuild run 37562795782 on source `a1ee1d1f`, immutable
set `e5767ceb…` at prebuild commit `47b5d2e1…` on
`synthesis-sidecar-runtime-prebuilds`. All seven targets report `mode: built`,
so no archive was reused. Native smoke passed on win32-x64, darwin-x64,
darwin-arm64, linux-x64 and linux-arm64; linux-x86 and linux-arm are 32-bit
targets the workflow marks `not_applicable` by design. Total archive 24 MB.

Packaging and identity checks against the rebuilt local bundles: runtime
freshness `ok` with fingerprint `486b58e7…` and no diagnostics; Rust license
inventory 71/71 packages with bundled SQLite 3.53.2; XPI packaging identity
`ok` for all seven targets with no missing and no forbidden entries, XPI digest
`fd6991c1…`.

## Zotero E2E blocked (7.4)

The unified E2E cannot currently reach a ready sidecar on this machine. It was
run against Zotero 9.0.6 and again against 10.0.2; both produced the identical
terminal launch error:

```
Synthesis sidecar launch failed: sidecar_discovery_identity_mismatch
  stage=pre-discovery step=discovery exitCode=0
Synthesis production owner startup failed
```

Consequences are uniform across the suite: every subsequent
`client.*` operation returns `service_not_ready`, and every family fails with
`suite_health_indeterminate` because `sidecarReady` never becomes true.

The installed bundle itself is correct. It carries 11 capabilities including
`library.retrieval.execute` and build fingerprint `486b58e7…`, matching current
source, and the binary executes. The strict discovery rebuild in
`sidecarProduction.ts` rejects the file on `lifecycleState !== "ready"`, while
the sidecar only ever writes `"ready"`, so the supervisor observed a discovery
document that did not survive a complete validated read. The supervisor treats
this code as deterministic and non-retryable, so one bad read ends the launch
permanently.

This change does not touch that path. `src/modules/synthesis/sidecar/` is
unchanged by this work, the Node production-route tests start the same binary
from the same source successfully, and the E2E runs recorded on 2026-10-06 used
the same `current-source:working-tree` build and passed on Zotero 10.0.5. The
one variable found is the Zotero version, and 10.0.5 is no longer present in
`zotero-hosts`. Attribution is therefore not closed: a pre-change baseline run
on 10.0.2 is required to settle it, and that run was not performed here.

A second defect is independent of the cause above: once the health gate reports
indeterminate the suite does not converge. The 9.0.6 run stayed at 15 recorded
families, all failed, for more than 26 minutes before it was stopped.

## Still blocked on user input

- 2k/10k/25k independent-real-material workloads, human relevance labels,
  numerical quality thresholds, contention latency and CPU/P4/4090 resource
  peaks remain unmeasured. Corpus access and resource/fee budgets are pending;
  prior duplicated-identity stress and Agent labels are not acceptance evidence.
- Seven-platform current-source build/smoke and packaging identity remain open.
  The governed prebuild requires an exact pushed source; commit, push and remote
  workflow dispatch have not been authorized or performed. The local Linux
  debug executable does not establish seven-platform delivery.
- Unified Zotero 7/9/10 System E2E and Trash/merge/external-byte observability
  remain open. Existing process fixtures do not prove those Host behaviors.
- The Broker currently exposes canonical digest as Markdown JSON. An existing
  explicit structured overview is supported, but ordinary Markdown digests
  cannot supply that tier. Missing abstract/overview falls back to a visibly weak
  title. Similarity does not guess or generate a summary; a new producer contract
  for structured overviews is outside this change's existing-source requirement.

The change remains active until these acceptance tasks have actual evidence.
