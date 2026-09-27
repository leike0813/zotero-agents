# Synthesis Knowledge Graph Foundation Design

Date: 2026-05-24

Parent design: `artifact/topic_graph_lightweight_design_20260519.md`

## Scope

Foundation 是所有后续域的底座，目标是先把“文件真源 + SQLite 投影 + 插件内部服务 + 变更事件”跑通。

本域包括：

- `synthesis/` canonical store layout。
- schema registry / validation。
- manifest / content hash / tombstone 基础。
- internal service 写入边界。
- projection rebuild 基础框架。
- `canonical-store-changed` event。
- receipt / diagnostics / job state 的最小结构。

本域不包括：

- Git sync remote 操作。
- Citation matching。
- Topic graph relation semantics。
- Concept merge。
- Tag vocabulary UI。

## Canonical Store Contract

所有长期真源都写入 `synthesis/` 下的 JSON / Markdown 文件。`state/*.sqlite` 是可重建投影，不参与同步。

最小目录：

```text
synthesis/
  topics/
  concepts/
  topic-graph/
  citation-graph/
  tags/
  sync/
  state/
```

第一期只要求目录与 manifest 机制可用，不要求所有业务目录都填满。

## Internal Service Boundary

插件内部服务是管理入口。UI、background job 和 apply hook 不能直接手写 canonical files，而应调用对应 internal service。

基础服务建议：

```text
canonicalStore.readAsset
canonicalStore.writeAsset
canonicalStore.validateAsset
canonicalStore.writeTransaction
projectionRegistry.markStale
projectionRegistry.rebuild
diagnostics.write
```

写操作必须在事务内完成：

```text
validate input
write temp asset
validate temp asset
atomic replace
write receipt
emit canonical-store-changed
mark projections stale
```

## Events

内部 mutation 批处理事务提交后只发一次事件：

```json
{
  "event": "canonical-store-changed",
  "scope": "topics | concepts | citation-graph | tags | sync",
  "changed_assets": [],
  "transaction_id": "...",
  "created_at": "..."
}
```

Git sync、SQLite projection、UI refresh 都消费 debounced event，而不是监听每个文件写入。

## Projection Rebuild

SQLite 投影统一视为 local cache。每个 projection 需要：

- schema version。
- source manifest hash。
- stale flag。
- last rebuild time。
- diagnostics。

概念性 rebuild API：

```text
internal projection rebuild: target = concepts | topics | citation | tags | all
```

## Acceptance Criteria

- 可以初始化空 `synthesis/` canonical store。
- 可以写入并校验一个 schema asset。
- 写入事务失败时不会留下半写入文件。
- `state/*.sqlite` 可删除并重建。
- `canonical-store-changed` event 可被 debounce。
- diagnostics 不包含 token 或敏感路径。

## Dependencies

无。Foundation 是后续所有域的前置条件。

