# Harden Synthesis Layer V1 Integration Design

## Overview

The hardening change introduces a small service layer that owns the end-to-end
state transition for topic synthesis results. The service uses existing
foundation primitives instead of redefining schemas or hashes.

Canonical assets remain the only source of truth. Zotero note shards are a
sync/recovery mirror and are rebuilt from canonical assets.

## Service Boundary

The service exposes:

- `applyTopicSynthesisResult(bundle, context)`
- `getSynthesisSnapshot(context)`
- `refreshMirror(context)`
- `readTopicArtifact(context)`
- `getReviewInput(context)`

The workflow hook calls the service via `runtime.hostApi.synthesis`. MCP, UI,
and review input use the same service instance or compatible interface.

## Canonical Write Flow

1. Validate the result bundle with the existing workflow validator.
2. Load current hashes for the target topic and index state.
3. Run compare-and-swap against `base_hashes`.
4. On match, write current Markdown, current metadata JSON, topic definition,
   resolver, resolved paper set, index, and append log entry.
5. On mismatch, write a local conflict candidate and return conflict status.
6. Refresh the Zotero mirror only after a successful current write.

Writes are serialized by library id and use temp-file replacement through the
runtime persistence helpers.

## Mirror Flow

Mirror refresh builds payload groups from canonical current state, encodes them
as note shards, ensures one personal-library anchor item, and upserts child
notes through a mirror adapter. Shard deletion by the user degrades the mirror
but does not delete canonical assets.

## Read Flow

UI snapshot, MCP methods, and review input read persisted canonical assets and
projection builders. Empty data is returned only when the canonical root is
unbound or assets are genuinely absent.
