# Design

## Topic Intent

`runtime/payloads/topic-intent.json` must contain `topic_definition.id` and
`topic_definition.title`. Runtime persistence rejects legacy payloads that only
contain `intent`.

## Final Bundle

`result/result.json` contains `resolver_manifest_path` instead of embedding
`topic_resolver`, `resolution_result`, or `resolved_paper_set`.

Host apply reads the manifest path from the run workspace and derives the
internal resolver state and resolved paper set from that file before writing
canonical synthesis state.
