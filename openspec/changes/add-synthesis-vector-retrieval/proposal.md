# Proposal

## Why

The established Library, Topic, and Evidence searches are lexical. They cannot reliably retrieve conceptually related or cross-language material, and the workbench cannot offer paper similarity or useful Topic Discovery from those searches. The approved vector-retrieval decisions (issues 76–87, implementation issue 92) define an optional local derived index without changing the ownership of Zotero or canonical Topic facts.

## What Changes

- Add one Retrieval Application inside the existing Rust sidecar and persist its local derived vectors in the existing SQLite Repository. Reuse public maintenance for explicit build, rebuild, update, cancellation, recovery, and publication.
- Add Host-owned OpenAI-compatible and Ollama embedding connections, encrypted credentials, compatible fallback, bounded validated batches, and query/document encoding identity.
- Transparently enhance the three existing text searches with hard-scope filtering, exact cosine ranking and equal-weight RRF; retain independent lexical search and truthful fallback, coverage, method, and cursor semantics.
- Add Home settings and index controls, paper-detail similarity with clearly identified summary material, and post-publication Topic Discovery. Existing Topic apply remains the only adoption path; rejection persists.
- Update existing architecture documents and test observable correctness, recovery, source verification and UI region isolation. Measure quality, resource budgets, platform delivery and Zotero integration separately; unverified conditions remain explicit tasks.

## Capabilities

### New Capabilities

- `synthesis-vector-retrieval`: Host embedding, retrieval identity, local vector facts, source-bound fragments, exact scoring, scoped publication and private consumers.

### Modified Capabilities

- `synthesis-search-contracts`: hybrid fusion and retrieval-basis continuation.
- `synthesis-topic-lexical-search`: actual lexical/vector/hybrid method while retaining canonical Topic scope and independent lexical kernel.
- `synthesis-evidence-search`: same-call verification of vector-derived source passages.
- `synthesis-maintenance`: retrieval maintenance and post-publication cleanup/Discovery separation.
- `synthesis-persistence-performance`: local derived retrieval storage, recovery and measured budgets.
- `synthesis-sidecar-recursive-dto-contracts`: bounded embedding and retrieval DTO coverage.
- `synthesis-workbench-ui`: Home controls and paper similarity with isolated regional rendering.
- `topic-synthesis-skills`: semantic must/exclude triage and preservation of uncertain Discovery candidates.

## Impact

Touches the Rust application/repository/runtime, synthesis contracts and Host adapters, existing Broker search projection, workbench Home/reader regions, Topic skill sources, focused tests and existing architecture documentation. No new process, workflow backend, independent maintenance queue, dependency, public reference query or Agent maintenance tool is introduced. Source and protocol changes require current-source native/E2E validation. Large temporary inputs and build caches use `/mnt/HotData/tmp`.
