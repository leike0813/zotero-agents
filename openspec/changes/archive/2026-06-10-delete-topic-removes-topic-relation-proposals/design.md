# Design

## Soft Delete

`deleteTopicArtifact()` 删除 topic artifact 后调用 topic graph service：

- 命中 `source_topic_id` 或 `target_topic_id` 的 edge 标记为 `deleted`。
- 命中 source/target 的 review item 标记为 `deleted`，并设置 `resolved_at`。
- topic node 继续保留，但 `definition_status` 是 `deleted`。

## Purge

`purgeDeletedTopicArtifacts()` 在清空 deleted rows 前收集 topic ids，并调用 topic graph service 永久移除：

- deleted topic graph nodes。
- source/target 命中 deleted topic ids 的 edges。
- source/target 命中 deleted topic ids 的 review items。

## UI

UI 只展示 active relation state：`deleted` edge 和 `deleted` review item 不参与 inspector、visible graph 和 review panels。
