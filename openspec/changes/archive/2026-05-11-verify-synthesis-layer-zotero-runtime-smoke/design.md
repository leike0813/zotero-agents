# Verify Synthesis Layer Zotero Runtime Smoke Design

## Runtime Smoke

The smoke test creates a temporary synthesis root and a Synthesis service using
the real Zotero mirror adapter. It applies a topic synthesis bundle and verifies:

- canonical Markdown/metadata are written;
- one anchor document item is created or reused;
- child note shards are created with hidden payloads;
- host API exposes `synthesis`;
- deleting a shard causes snapshot sync status to become degraded.

The test uses temporary roots and test-created Zotero items only.

## Mirror Degraded Detection

The adapter can list current child note shards under the anchor. The service
passes those decoded shard summaries to the existing sync recovery assessor.
Missing shard sequences reported by the manifest become `mirror_degraded`.

Canonical assets remain authoritative; deleted shards are not propagated back to
canonical state.
