# Synthesis Layer 持久化方案

## 1. 持久化目标

Synthesis Layer 的持久化必须满足三个目标：

1. Synthesis Artifact 可以作为普通文件被阅读、备份、版本化和同步。
2. 同一个 Zotero 文献库可以在多台机器上发现并绑定同一套 synthesis 资产。
3. Paper Registry 和查询索引可以高效读取，但不应成为同步真源。

v1 采用三层持久化：

```text
canonical assets on filesystem
  -> Zotero-synced mirror / anchor
  -> local materialized indexes
```

只有 canonical assets 是 Synthesis Layer 自有资产的真源。Zotero-synced mirror / anchor 只负责同步发现和跨机恢复；local materialized indexes 只负责本机查询性能。

v1 的绑定范围限定为 Zotero personal library：一个 personal library 对应一个 synthesis root 和一个 Zotero sync anchor。group library 暂不进入 v1 支持范围。

## 2. Canonical Assets

canonical assets 是 Synthesis Layer 的主资产和真源。

推荐目录结构：

```text
synthesis/
  topics/
    retrieval-augmented-generation/
      current.md
      current.json

  state/
    index.json
    artifact-state.json
    topic-definitions.json
    resolvers.json
    resolved-paper-sets.json
    unified-citation-graph.json
    unified-citation-layouts.json
    log.jsonl
```

v1 以 Markdown + JSON 为 canonical 格式，不把 SQLite 作为真源。

每个 topic synthesis 在同步 root 中只保留一个 `current` 指针。`current.md` / `current.json` 是跨机器同步和默认读取目标。

本地不可变历史版本不放入同步 root，而是放在插件 local data / Zotero profile 下的本机历史目录中，用于回滚、diff 和审计。历史版本不参与 OneDrive / Dropbox / Syncthing 文件同步，也不参与 Zotero note shard mirror。这样可以保留可审计性，同时避免同步负担随版本数量线性膨胀。

v1 必须提供本地版本清理策略，例如按 topic 保留最近 N 个版本、保留最近 M 天版本，或由用户手动清理。清理历史版本不得影响同步 root 中的 `current` artifact、topic definition、resolver、resolved paper set 或日志中的关键审计记录。

`unified-citation-graph.json` 是可重建的确定性投影快照。它可以作为 canonical assets 的一部分用于复现、UI 和 MCP 查询，但不是不可替代真源；删除后应能从 Zotero metadata、structured references、reference matching 结果和 citation analysis 重建。

`unified-citation-layouts.json` 是 Unified Citation Graph 的派生布局快照。它与 `graph_hash` 和 `layout_preset` 绑定，用于让 UI 直接读取稳定坐标并交给 Sigma.js 渲染，避免打开图时实时运行全图布局模拟。

目录位置由用户选择，可以是：

- OneDrive 同步目录；
- Dropbox 同步目录；
- Syncthing 同步目录；
- Obsidian vault；
- 普通本地目录。

插件必须把该目录视为用户数据目录，而不是插件安装目录。

## 2.1 Canonical JSON Envelope

所有 canonical JSON 文件必须使用统一 envelope：

```json
{
  "schema_id": "synthesis.index",
  "schema_version": "1.0.0",
  "created_at": "2026-05-10T12:00:00Z",
  "updated_at": "2026-05-10T12:00:00Z",
  "data": {}
}
```

集合文件也使用同一 envelope，只是 `data` 中保存集合内容。

版本规则：

```text
patch: 字段说明、可选字段、非破坏性修正
minor: 添加可选字段，旧代码可忽略
major: breaking change，需要 migrator，且默认要求用户确认
```

v1 初始 schema version 统一为 `1.0.0`。每类资产拥有自己的 `schema_id`，例如：

- `synthesis.topic_definition`；
- `synthesis.topic_resolver`；
- `synthesis.resolved_paper_set`；
- `synthesis.artifact_metadata`；
- `synthesis.paper_registry_row`；
- `synthesis.unified_citation_graph`；
- `synthesis.unified_citation_layouts`；
- `synthesis.workflow_result_bundle`；
- `synthesis.zotero_anchor_manifest`；
- `synthesis.note_shard`；
- `synthesis.mcp.<tool_name>.input`；
- `synthesis.mcp.<tool_name>.output`。

canonical assets 中出现 unknown fields 时，插件应保留这些字段并记录 warning，不得在 migration 或重写中静默丢弃。

## 2.2 Schema Migration

v1 使用最小 migration registry，而不是复杂 migration framework。

读取 canonical JSON 时：

```text
read file
  -> parse envelope
  -> validate schema_id
  -> if schema_version == current: validate data
  -> if schema_version < current: run migrators sequentially
  -> validate migrated data
  -> write migrated file only after local backup
```

patch / minor migration 可以自动执行。major migration 必须要求用户确认。

migration 写回前必须创建本地 backup / recovery copy。该 backup 只保存在 local data 中，不参与 Zotero note shard mirror。

migration 失败时：

- 不覆盖原 canonical asset；
- 标记 asset `dirty`；
- 在 UI 中提示用户；
- 允许用户手动重试或导出诊断。

## 2.3 Hash 规范

Synthesis Layer v1 统一使用 SHA-256。所有 hash 均采用以下格式：

```text
sha256:<lowercase-hex>
```

v1 不引入第二种快速 hash。理由是当前 hash 用途主要是变更检测、缓存、compare-and-swap、staleness 和恢复校验；相对于 Zotero API 读取、artifact 扫描、graph rebuild、layout 计算和 agent synthesis，SHA-256 成本可以忽略。统一一种 hash 能减少 schema、日志、调试和恢复逻辑复杂度。

所有 hash 必须基于 canonicalized input 计算。

JSON canonicalization：

- stable key order；
- UTF-8；
- no insignificant whitespace；
- omit `undefined`；
- preserve `null`；
- arrays preserve order unless schema explicitly marks the field as set-like；
- set-like arrays must be sorted before hashing。

Markdown canonicalization：

- normalize CRLF / CR to LF；
- preserve Markdown content otherwise；
- UTF-8；
- frontmatter 是否参与 hash 由具体 hash kind 明确规定。

推荐 hash kinds：

- `artifact_content_hash`：对 normalized Markdown body 与 canonical metadata JSON 计算 SHA-256；
- `artifact_input_hash`：对 resolver hash、resolved paper set hash、used artifact hashes、registry hash、graph hash 等 dependency bundle 计算 SHA-256；
- `resolver_hash`：对 canonical resolver JSON 计算 SHA-256；
- `resolved_paper_set_hash`：对 sorted `libraryID:itemKey` 列表与 resolver hash 计算 SHA-256；
- `registry_row_hash`：对 registry row 的 canonical source fields 计算 SHA-256；
- `graph_hash`：对 canonical graph nodes / edges 计算 SHA-256，不包含 layout；
- `layout_hash`：对 `graph_hash + layout_engine + layout_version + preset + params + coordinates` 计算 SHA-256；
- `mirror_manifest_hash`：对 canonical shard manifest 计算 SHA-256；
- `base_index_hash`：对 canonical index summary 计算 SHA-256。

Graph hash 必须排除 layout coordinates。Layout hash 必须包含 graph hash、preset、params 和 coordinates。

compare-and-swap 使用的所有 base hashes 也统一使用 SHA-256：

- `base_artifact_hash`；
- `base_metadata_hash`；
- `base_index_hash`；
- `base_resolver_hash`；
- `base_resolved_paper_set_hash`。

## 3. Paper Registry

Paper Registry 不是 canonical sync asset。

它是从 Zotero metadata 和 Zotero 中已有 derived artifact notes / payloads / attachments 重建出来的本地投影：

```text
Zotero metadata
  + Zotero tags / collections
  + derived artifact payload manifests
  -> Paper Registry
```

Paper Registry 可以存入本地 SQLite，以便 UI、MCP 和 resolver diagnostics 快速查询。但这个 SQLite 只是一份 materialized cache：

- 可以删除；
- 可以重建；
- 不参与 OneDrive / Dropbox 文件同步；
- 不通过 Zotero note shards 同步；
- 不作为 Zotero metadata 或 derived artifacts 的替代真源。

Paper Registry 中允许包含：

- item key / libraryId；
- title、year、itemType；
- tag membership；
- collection membership；
- digest / structured references / citation analysis / markdown availability；
- artifact note key / attachment key；
- artifact hash；
- artifact updated_at；
- coverage / readiness / diagnostics。

其中 Zotero 原生字段和 artifact manifest 字段都来自已有真源；coverage、readiness 和 diagnostics 是插件计算字段，丢失后可重建。

### 3.1 Derived Artifact Payload 规则

Paper Registry 通过现有 workflow hidden payload marker 发现 derived artifacts：

```html
<span data-zs-block="payload" data-zs-payload="digest-markdown" data-zs-version="1" data-zs-encoding="base64" data-zs-value="..."></span>
```

v1 识别：

- `digest-markdown`；
- `references-json`；
- `citation-analysis-json`。

artifact hash 必须来自 decoded payload 的 canonical content：

- markdown payload：normalize line endings to LF 后计算 SHA-256；
- JSON payload：按 canonical JSON 规则计算 SHA-256。

note 可见 HTML、表格渲染、标题或说明文字不参与 artifact hash。

如果同一 item 下存在同一 payload type 的多个候选，Registry 应记录 duplicate payload candidates，并按现有 workflow 约定选择最新或最明确的有效 payload；无法确定时标记 diagnostics，不阻塞整个 registry rebuild。

## 4. Zotero Sync Anchor

Synthesis Layer 使用一个专用 Zotero parent item 作为同步锚。

v1 采用 one-library-one-root-one-anchor 策略：每个 Zotero personal library 只绑定一个 synthesis root，并在该 library 内维护一个对应 anchor。不同 personal library 不共享同一个 root 和 anchor。group library 绑定策略延后设计。

推荐形式：

- 一个独立的 Zotero document item，标题可为 `Zotero-Skills Synthesis Layer Anchor`；
- 该 item 下挂载若干 child notes 作为 sync shards；
- notes 使用隐藏 JSON payload 表示同步镜像；
- anchor item 和 note shards 通过 Zotero sync 在多机之间同步。

Zotero parent item 记录：

- Synthesis Layer schema version；
- Zotero library identity；
- synthesis root path hint；
- current mirror manifest；
- last mirrored time；
- local root binding hint；
- anchor recovery metadata。

注意：root path 在不同机器上可能不同，只能作为 hint。每台机器仍需保存自己的 local root override。

## 5. Note Shards

note shards 只用于同步镜像，不是真源。

### 5.1 Shard 标题格式

v1 使用固定标题格式：

```text
ZS Synthesis Mirror [<library-id>] <kind> <seq:000>/<total:000>
```

示例：

```text
ZS Synthesis Mirror [1] manifest 001/001
ZS Synthesis Mirror [1] topics 001/003
ZS Synthesis Mirror [1] topics 002/003
ZS Synthesis Mirror [1] graph 001/002
```

标题中的 `seq` 和 `total` 必须使用三位补零，保证 Zotero UI 排序和机器排序稳定。

v1 shard kinds：

```text
manifest
topics
resolvers
paper_sets
artifact_index
graph
layout
```

### 5.2 Note 可见内容与隐藏 Payload

note 可见正文只展示用户可读元数据，不展示机器 JSON。

示例：

```html
<h2>Zotero-Skills Synthesis Mirror</h2>
<p>Library: 1</p>
<p>Kind: topics</p>
<p>Shard: 001/003</p>
<p>Updated: 2026-05-10T12:00:00Z</p>
<p>This note is managed by Zotero-Skills. Do not edit manually.</p>
<!-- ZOTERO_SKILLS_SYNTHESIS_SHARD
{...payload...}
-->
```

机器 payload 必须放在 HTML comment 中，并以 `ZOTERO_SKILLS_SYNTHESIS_SHARD` marker 开头。用户编辑可见元数据不应改变 canonical assets；如果用户破坏 hidden payload，插件应标记 mirror degraded，并允许从 canonical assets 重建 shards。

### 5.3 Shard Payload Envelope

HTML comment 中的 payload 使用 JSON envelope：

```json
{
  "schema_id": "synthesis.note_shard",
  "schema_version": "1.0.0",
  "library_id": 1,
  "anchor_key": "ABCD1234",
  "mirror_id": "sha256:<lowercase-hex>",
  "kind": "topics",
  "seq": 1,
  "total": 3,
  "encoding": "base64",
  "compression": "gzip",
  "payload_hash": "sha256:<lowercase-hex>",
  "encoded_hash": "sha256:<lowercase-hex>",
  "payload": "..."
}
```

payload 处理流程：

```text
canonical JSON payload
  -> compute payload_hash
  -> gzip
  -> base64
  -> compute encoded_hash
  -> write to HTML comment
```

如果 Zotero 插件运行环境暂时无法稳定提供 gzip，可使用 `compression: "none"` 作为降级模式；设计上仍以 gzip 为 preferred mode。

### 5.4 Shard Size

v1 使用保守分片阈值：

```text
target encoded payload size: 64 KB
max encoded payload size: 96 KB
```

这里的 size 指 HTML comment 中 encoded payload 的字符数，而不是原始 JSON 大小。超过 target 后应优先切片；超过 max 必须切片。

### 5.5 Manifest 排序与校验

manifest 使用 deterministic sort。

kind order：

```text
manifest
topics
resolvers
paper_sets
artifact_index
graph
layout
```

within kind：

```text
seq ascending
```

manifest 示例：

```json
{
  "schema_id": "synthesis.zotero_anchor_manifest",
  "schema_version": "1.0.0",
  "library_id": 1,
  "anchor_key": "ABCD1234",
  "mirror_id": "sha256:<lowercase-hex>",
  "updated_at": "2026-05-10T12:00:00Z",
  "shards": [
    {
      "kind": "topics",
      "seq": 1,
      "total": 3,
      "note_key": "NOTE1234",
      "title": "ZS Synthesis Mirror [1] topics 001/003",
      "payload_hash": "sha256:<lowercase-hex>",
      "encoded_hash": "sha256:<lowercase-hex>"
    }
  ],
  "manifest_hash": "sha256:<lowercase-hex>"
}
```

`manifest_hash` 计算时必须排除 `manifest_hash` 字段本身。

读取 mirror 时的校验流程：

```text
find anchor document item
  -> find child notes with title prefix
  -> extract HTML comment payload
  -> validate note_shard schema
  -> verify encoded_hash
  -> decode base64
  -> decompress if gzip
  -> verify payload_hash
  -> group by mirror_id / kind
  -> sort by kind order + seq
  -> verify seq continuity and total consistency
  -> rebuild mirror payload
  -> validate anchor manifest
```

校验失败时：

- 不覆盖 canonical assets；
- 标记 mirror degraded；
- UI 显示失败 shard；
- 允许从 canonical assets 重建 note shards。

它们可以保存 canonical assets 的分片镜像，例如：

- topic definitions；
- resolvers；
- resolved paper set snapshots；
- synthesis artifact metadata；
- artifact manifest；
- unified citation graph snapshot；
- canonical asset hashes。

note shards 不应保存：

- Paper Registry canonical copy；
- 本地历史版本正文；
- conflict candidate 正文；
- 本地 SQLite；
- runtime log；
- diagnostics history；
- 高体积完整 derived artifacts；
- PDF / Markdown attachment 正文。

如果用户删除 Zotero sync anchor 或 note shards，不应导致真正的 Synthesis Layer 资产丢失。插件应能从 canonical assets 重建 anchor 和 note shards。

如果 canonical assets 缺失，但 Zotero note shards 仍存在，插件可以把 note shards 作为恢复来源，帮助用户重建 canonical assets。这是 disaster recovery 路径，不改变 note shards 的“镜像而非真源”定位。

## 6. 多机同步模型

多机同步依赖两条链路：

- 文件同步服务同步 canonical assets；
- Zotero sync 同步 anchor 和 note shards。

新机器上的发现流程：

```text
Plugin starts
  -> find Zotero synthesis anchor
  -> read mirror manifest and root path hint
  -> check whether local canonical root exists
  -> if root exists, verify canonical hashes against mirror manifest
  -> if root missing, prompt user to locate synced folder
  -> if user cannot locate folder, offer recovery from note shards when available
  -> rebuild local SQLite / Paper Registry from Zotero metadata and artifacts
```

同步冲突处理原则：

- canonical assets 优先于 note shard mirror；
- note shard mirror 可被 canonical assets 覆盖重建；
- 如果不同机器产生 divergent canonical asset versions，应保留冲突副本并要求用户选择；
- 不自动用较新的 note shard 覆盖本地 canonical assets，除非用户确认恢复。

## 7. 标识规则

长期标识不得依赖本机 numeric id。

v1 使用：

- Zotero item key；
- Zotero collection key；
- libraryID 或 group library key；
- artifact id；
- artifact slug；
- Topic Definition id；
- Resolver id / version；
- deterministic input hash。

允许在运行时使用 numeric id 做查询优化，但不得写入长期可同步资产作为唯一标识。

## 8. 写入策略

正式写入采用 plugin-mediated write：

```text
Skill output bundle
  -> applyResult validation
  -> write canonical temp files
  -> replace canonical target files
  -> update canonical index
  -> append canonical log
  -> refresh Zotero mirror shards
  -> rebuild local materialized indexes
```

v1 写入时必须保证：

- Markdown 和 metadata 同步落地到 canonical assets；
- canonical index 更新失败时不能静默成功；
- log 使用 append-only JSONL；
- raw Zotero source 不被修改；
- Zotero mirror shard 更新失败时向用户报告 degraded sync mirror state；
- local SQLite / Paper Registry 更新失败时可以降级为稍后重建。

### 8.1 并发写入策略

v1 采用两层并发控制：

```text
local library write lock
  + optimistic compare-and-swap
```

本机并发由插件内部的 library 级写锁控制。v1 不细分到 artifact 级锁，因为 `index.json`、Zotero anchor、mirror shards 和 local materialized indexes 都是 library 级共享资源。

所有正式写入必须经过：

```text
acquire local library write lock
  -> re-read current state
  -> validate base hashes
  -> write local immutable history snapshot
  -> write temp current files
  -> replace current.md / current.json
  -> update state index
  -> append log
  -> refresh note shard mirror
  -> rebuild local indexes
release local library write lock
```

跨机器并发不依赖 lock file。OneDrive、Dropbox、Syncthing 等文件同步服务不提供可靠的跨机器文件锁语义，因此 v1 使用 optimistic compare-and-swap。

workflow 启动时必须记录写入基线，例如：

```json
{
  "base_artifact_hash": "...",
  "base_metadata_hash": "...",
  "base_index_hash": "...",
  "base_resolver_version": "...",
  "base_resolved_paper_set_hash": "..."
}
```

skill 输出的 result bundle 必须带回这些 base hashes。applyResult 写入前重新读取当前文件和 index；如果当前 hash 与 base hash 不一致，说明本机其他任务或其他机器已经写入，当前结果不得直接覆盖 `current` artifact。

v1 不做 Markdown 自动 merge。发生 base hash mismatch 时，插件应：

- 拒绝覆盖 current artifact；
- 将 result bundle 保存为本地 conflict candidate；
- 在 UI 中提示用户基于最新 current artifact 重新运行 update；
- 在日志中记录 conflict 事件；
- 不刷新 Zotero note shard mirror。

conflict candidate 只保存在本机 local data 中，不参与文件同步或 Zotero note shard mirror。

### 8.2 提交顺序

manifest / index 必须最后提交。推荐顺序是：

```text
write temp markdown
write temp metadata
validate temp files
replace current.md / current.json
update state index
append log
refresh note shard mirror
rebuild local materialized indexes
```

如果写入 Markdown 或 metadata 过程中失败，index 不应被更新，避免半成品被暴露为正式 artifact。

## 9. SQLite 使用边界

SQLite 只用于本地 materialized indexes。

允许放入 SQLite 的内容：

- Paper Registry；
- citation graph 查询索引；
- artifact lookup index；
- readiness / coverage 查询视图；
- MCP 查询缓存。

SQLite 不应：

- 放进 OneDrive / Dropbox 等文件同步目录作为真源；
- 作为 canonical assets 的唯一存储；
- 保存无法从 canonical assets 或 Zotero metadata 重建的唯一状态；
- 被 Zotero note shards 同步。

如果 SQLite 损坏，插件应删除并重建，而不是尝试把损坏状态同步出去。

## 10. Graph Layout Snapshots

v1 使用 Graphology + D3-force + Sigma.js 的 graph UI 栈：

- Graphology 管理图数据结构；
- D3-force 计算布局坐标；
- Sigma.js 渲染和交互浏览。

布局是可重建派生资产，不是事实源。推荐 canonical 文件：

```text
synthesis/state/unified-citation-layouts.json
```

布局文件按 `graph_hash` 和 preset 保存：

```json
{
  "graph_hash": "...",
  "layout_engine": "d3-force",
  "layout_version": 1,
  "computed_at": "...",
  "presets": {
    "compact": {
      "params": {
        "link_distance": 45,
        "charge": -80,
        "collision_radius": 6,
        "iterations": 300
      },
      "nodes": {
        "zotero:item:ABCD1234": { "x": 12.4, "y": -88.1 }
      }
    },
    "balanced": {
      "params": {
        "link_distance": 80,
        "charge": -140,
        "collision_radius": 8,
        "iterations": 400
      },
      "nodes": {}
    },
    "expanded": {
      "params": {
        "link_distance": 130,
        "charge": -220,
        "collision_radius": 10,
        "iterations": 500
      },
      "nodes": {}
    }
  }
}
```

v1 内置三个 layout presets：

- `compact`；
- `balanced`；
- `expanded`。

UI 只在这些 preset 间切换，不提供连续实时全图 simulation slider。D3-force 只在 graph hash 变化、preset layout 缺失、layout version / params 变化、用户手动 recompute 或小 slice preview 时运行。

Graph rebuild 后应优先计算 `balanced`，使 UI 尽快可用；`compact` 和 `expanded` 可以后台或 idle 计算。

`unified-citation-layouts.json` 可以随 canonical assets 同步，因为它只是坐标快照，体积可控且能保证多机 UI 视觉稳定。若该文件缺失或损坏，插件应标记 layout dirty 并重新计算，而不是影响 graph 事实数据。

layout 计算必须使用确定性输入：

- nodes by `node_id` ascending；
- edges by `edge_id` ascending；
- initial x / y from `sha256(node_id + layout_preset)`；
- fixed random source when D3-force requires randomness；
- fixed iteration count per preset；
- fixed coordinate precision in persisted output。

## 11. Staleness v1

v1 不实现复杂 stale propagation。

v1 记录：

- `fresh`；
- `partial`；
- `stale`；
- `dirty`。

其中：

- `fresh` 表示当前 input hash 与记录一致；
- `partial` 表示部分 paper 缺少 digest 或 citation analysis；
- `stale` 表示 resolver、resolved paper set、paper artifact hash、Paper Registry 或 Unified Citation Graph snapshot 已变化，当前 synthesis 可读但建议更新；
- `dirty` 表示 metadata、文件、mirror 或 index 无法解析。

`stale-soft` 和 `stale-hard` 延后到 Phase 2，在 dependency graph 和 change impact rules 稳定后再实现。

### 11.1 Source Event Log

v1 可以维护轻量 source event log / change ledger，用于驱动确定性资产重建和 topic synthesis 状态扫描。

source event log 的目的不是完整记录 Zotero 历史，而是回答：

- Paper Registry 是否需要 rebuild；
- Unified Citation Graph 是否需要 rebuild；
- 哪些 topic synthesis 可能进入 `stale`；
- UI 应提示用户什么。

事件示例：

```json
{
  "event_id": "...",
  "library_id": "...",
  "kind": "artifact_changed",
  "source": "citation_analysis",
  "item_key": "...",
  "old_hash": "...",
  "new_hash": "...",
  "observed_at": "..."
}
```

source event log 可以存入本地 SQLite 或 local data，不作为 canonical sync asset，也不通过 Zotero note shards 同步。它丢失后可通过 full rescan 重建当前状态。

### 11.2 自动监控与重建 Prefs

自动监控和自动重建必须由 preferences 控制。

建议 v1 preferences：

- `synthesis.autoWatch.enabled`：是否监听 Zotero / artifact / storage 变化；
- `synthesis.autoRebuild.registry`：是否自动重建 Paper Registry；
- `synthesis.autoRebuild.graph`：`off` / `idle` / `auto`；
- `synthesis.autoScanStaleness.enabled`：是否自动扫描 topic synthesis freshness；
- `synthesis.rebuild.debounceMs`：事件合并延迟；
- `synthesis.rebuild.maxAutoGraphItems`：允许自动 graph rebuild 的最大库规模；
- `synthesis.graphLayout.defaultPreset`：默认 graph layout preset；
- `synthesis.graphLayout.computeAllPresets`：graph rebuild 后是否后台计算所有 preset；
- `synthesis.rebuild.runOnStartup`：启动时是否检查 hash mismatch 并标记 dirty。

默认建议：

- 开启 source watch；
- 开启 Paper Registry 自动重建；
- Unified Citation Graph 默认 `idle` 或手动，避免大库频繁重建；
- 开启 staleness scan；
- 永不自动运行 agent update workflow。

### 11.3 触发边界

可触发 Registry rebuild 或 dirty 标记的事件：

- Zotero item 新增、删除、修改；
- tag 变化；
- collection membership 变化；
- derived artifact note / attachment 变化；
- storage root 重新绑定；
- 启动时发现 registry hash 不匹配；
- 用户手动 refresh。

可触发 Unified Citation Graph rebuild 或 dirty 标记的事件：

- structured references artifact 变化；
- reference matching 结果变化；
- citation analysis 变化；
- Zotero item key / metadata 变化；
- external reference 被匹配进库；
- Paper Registry rebuild 后发现 citation-related artifact hash 变化。

可触发 graph layout dirty 或 recompute 的事件：

- Unified Citation Graph hash 变化；
- layout preset 缺失；
- layout version 变化；
- layout params 变化；
- 用户手动 recompute layout；
- layout 文件无法解析。

### 11.4 Provisional Reference Key 与 Promotion 记录

Unified Citation Graph 中的 external / unresolved reference node 必须保存 provisional reference key。该 key 是 Synthesis Layer 的 work-level 指纹，不是 Zotero item key 或 Better BibTeX citekey。

推荐字段：

```json
{
  "node_id": "ref:titlehash-2021-a9f03c2d",
  "kind": "external_reference",
  "target_state": "external",
  "provisional_key": "ref:titlehash-2021-a9f03c2d",
  "matched_item_key": null,
  "aliases": [],
  "reference_metadata": {}
}
```

promotion 后的 library paper node 应保留旧 key：

```json
{
  "node_id": "zotero:item:ABCD1234",
  "kind": "library_paper",
  "target_state": "library",
  "item_key": "ABCD1234",
  "aliases": ["ref:titlehash-2021-a9f03c2d"]
}
```

promotion / merge diagnostics 应记录：

```json
{
  "from": "ref:titlehash-2021-a9f03c2d",
  "to": "zotero:item:ABCD1234",
  "reason": "provisional_key_match",
  "promoted_at": "...",
  "key_kind": "title_year_first_author",
  "confidence": "deterministic"
}
```

provisional reference key 生成优先级：

```text
normalized DOI
  -> normalized arXiv id
  -> normalized URL
  -> normalized title + year + first author
```

以上四类 key 在 v1 均为 deterministic strong key。`title + year + first author` 命中时，按同一 intellectual work 自动 promotion。预印本和正式发表版本如果生成同一 key，v1 在 graph 中合并为同一个 node。

如果多个 Zotero items 命中同一 provisional reference key，graph rebuild 应记录 duplicate candidates，并用确定性规则选择 canonical library item：

```text
has DOI
  -> has PDF / attachment
  -> earliest dateAdded
  -> lexicographically smaller itemKey
```

duplicate diagnostics 是 graph snapshot 的一部分；它可用于 UI 提示和后续人工整理，但不阻塞 v1 graph rebuild。

可触发 topic synthesis `stale` 的事件：

- resolver 执行结果发生变化；
- resolved paper set hash 变化；
- topic 依赖的 paper artifact hash 变化；
- Paper Registry readiness / coverage 变化；
- Unified Citation Graph snapshot hash 变化；
- canonical current artifact 的 base hash 与当前 index 不一致。

这些事件只能触发状态更新、UI 提示或用户可见的 update action，不能自动触发 agent 重写。

## 12. 后续迁移

当 artifact 数量、检索复杂度或 stale tracking 需求增长后，可以引入：

- SQLite FTS5；
- richer dependency graph；
- stale events；
- patch history；
- conflict resolution；
- mirror shard compaction。

迁移时必须保持 Markdown / JSON canonical assets 可读，不得把所有核心内容锁进数据库。
