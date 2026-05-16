# Design

## Topic Inventory DTO

`synthesis.list_topics` returns a bounded semantic inventory:

```json
{
  "topics": [
    {
      "topic_id": "detr-detection-transformer",
      "title": "DETR Detection Transformer",
      "description": "Synthesis of DETR-style object detection transformer papers.",
      "aliases": ["DETR", "Detection Transformer"],
      "updated_at": "2026-05-12T00:00:00.000Z"
    }
  ],
  "diagnostics": {
    "count": 1,
    "source": "canonical-topic-definitions"
  }
}
```

The DTO intentionally excludes resolver details, resolved paper sets, registry
rows, paper references, artifact hashes, graph hashes, and Markdown excerpts.

## Data Source

The service reads canonical `topic-definitions.json` first. If a topic
definition omits `title` or `updated_at`, the service backfills those fields from
`state/index.json`. Index-only topics may still appear as degraded semantic
inventory rows so older persisted assets remain visible.

## Agent Flow

When `mode=create`, `synthesize-topic` must call `synthesis.list_topics` before
`synthesis.get_library_index`. Duplicate reasoning is agent-owned and uses only
`title`, `description`, and `aliases`.

If the agent finds a plausible duplicate, it must use ACP interactive
confirmation. Only after the user chooses to update an existing topic should the
agent call `synthesis.get_topic_context(topicId)`.

## Freshness Boundary

Freshness remains deterministic and plugin-owned. Future freshness work may
re-run the persisted resolver, compare the resolved paper set, compare artifact
hashes, and mark stale reasons. It must not overload `synthesis.list_topics`.
