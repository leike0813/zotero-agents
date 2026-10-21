# Design

## Context

See proposal.md for root cause. Baseline is `371b9a72d50789887e24dd167b6133b7f8a71b1e`. Host Bridge content is synchronized and already checked in preflight and release gates. The existing schema materializer, production-route harness and native stage1 suite are reused.

## Goals / Non-Goals

Preserve domain data at real producer/consumer boundaries and prevent accepted writes from breaking reads. No whole-DTO generation, new persistence table, invented proposal identity, confidence threshold, real-library mutation or release dispatch.

## Decisions

- Contract-set owns shared nested schemas; offline Skill schemas materialize reachable definitions. TS/Rust remain explicit adapters tested through production participants, rather than adding a second generation framework.
- Prospective proposals retain seed/type semantics and live in canonical metadata. Full apply defaults to an empty list; patch omission inherits and explicit empty clears. Manifest assets already carry the sidecar; no new public path parameter is needed.
- Topic proposal views preserve local_id, merge_hints and legacy numeric confidence. Merge hints remain proposal metadata. New confidence is categorical; historical numbers are preserved in read/review inputs and excluded from automatic KB ingestion until explicitly re-authored with a category. Reads do not enqueue writes.
- Canonical source-paper triage and rich coverage have shared concrete definitions; resolver/semantic views remain explicit narrower projections. Summary and coverage adapters preserve all fields consumed by Reader.
- Python runtimes use jsonschema>=4.18,<5 and retain domain validation after structural checks. The unused stdout envelope schema is removed.
- One builtin-Skill freshness entry renders complete packages in temporary outputs. Deep Reading graph builder accepts an explicit output directory. Existing build, content-packaging and CI owners reuse the entry.
- Native stage1 builds the executable before collecting worker and production-route evidence, so the final aggregate consumes evidence for the same executable identity. Uncovered structure obligations remain visible and keep the final gate incomplete.

## Risks / Trade-offs

- Already discarded proposals cannot be reconstructed without original sidecars; no automatic migration invents data.
- Historical raw values require read-specific branches; new-output constraints remain strict and independently tested.
- Generated nested schemas can affect Host Bridge materialization and native identities; existing render/freshness/release governance remains authoritative.

## Migration Plan

First add failing behavioral tests at the approved runtime, apply/reopen, default-review and Reader seams; fix each slice and then regenerate affected packages. Run targeted checks and the complete native stage1 evidence chain. Keep the change uncommitted and publication separate.
