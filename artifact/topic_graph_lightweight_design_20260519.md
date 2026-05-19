# Lightweight Topic Graph and Concept Knowledge Base Design

Date: 2026-05-19

## Background

Topic Synthesis 当前把每个 topic 作为相对独立的 synthesis artifact 来管理。这个模型适合存储单个 topic 的综合结果，但不足以表达 topic 之间的粒度、包含、交叉和相邻关系。

典型例子：

```text
Machine Learning
  -> Deep Learning
       -> DETR

Object Detection
  -> DETR
```

`DETR` 同时属于 `Deep Learning` 和 `Object Detection` 的下位概念，因此 topic 组织结构不能建成单父节点 tree，而应建成允许多父节点的 graph。

本设计暂称这层结构为 `topic graph`。

进一步讨论后，`concept` 节点自然扩展为一份轻量知识库：阅读论文和 synthesis artifact 时，用户经常会遇到不懂的术语、方法、缩写、任务或理论背景。Synthesis layer 可以维护一份 concept registry，每个 concept 对应一段简短说明，并在渲染时把正文中的概念 mention 变成 wiki-link 风格的可点击链接。

因此，本设计升级为：

```text
Synthesis Semantic Graph
  ├─ Topic Graph View
  │    topic / concept 之间的上位、下位、相关关系
  └─ Concept Knowledge Base View
       concept registry + definitions + aliases + mention sidecars
```

## Design Goal

第一版应保持轻量：

- 在 Synthesis layer 中保存 topic 之间的组织关系。
- 在 Synthesis layer 中维护 concept registry，每个 concept 有简短说明。
- UI 能展示这层关系，帮助用户理解 topic 在文献库中的位置。
- 渲染器能把可靠定位到的 concept mention 变成可点击 wiki link。
- 用户点击 wiki link 后显示 concept 气泡说明。
- MCP 能查询这层关系，为 agent / 外部 workflow 提供上下文。
- 不实现厚重 ontology 系统。
- 不要求每个概念都必须有完整 topic synthesis artifact。
- 第一期不实现 embedding；只保留未来扩展空间。

## Core Model

底层模型是一个 `Synthesis Semantic Graph`。Topic graph 是它的一个视图；Concept Knowledge Base 是另一个视图。

Topic graph 是一个 polyhierarchical graph，而不是 tree。

```text
┌──────────────────┐       broader_than       ┌───────────────┐
│ Machine Learning │ ───────────────────────▶ │ Deep Learning │
└──────────────────┘                          └───────┬───────┘
                                                        │
                                                        │ broader_than
                                                        ▼
                                                  ┌──────────┐
                                                  │   DETR   │
                                                  └──────────┘
                                                        ▲
                                                        │ broader_than
┌──────────────────┐                                  │
│ Object Detection │ ─────────────────────────────────┘
└──────────────────┘
```

## Node Types

Semantic graph 节点至少分为两类。

### materialized

已有完整 Topic Synthesis artifact 的 topic。

例如：

```json
{
  "topic_id": "detr",
  "title": "DETR",
  "node_type": "materialized",
  "definition_status": "has_synthesis"
}
```

### concept

轻量概念节点，表示一个知识点、术语、方法、任务、缩写或理论背景。它可以没有完整 synthesis artifact，但可以有一段简短说明，并可作为组织结构存在。

例如：

```json
{
  "id": "concept:machine-learning",
  "label": "Machine Learning",
  "kind": "concept",
  "definition": "A family of methods that learn patterns from data to make predictions or decisions.",
  "aliases": ["ML"],
  "definition_status": "lightweight",
  "materialized_topic_id": ""
}
```

这个区分很重要：用户不应为了表达 “Machine Learning 包含 Deep Learning” 而被迫创建一个完整的 Machine Learning synthesis。

某些节点可以同时有 concept 与 topic 两层身份。例如 `DETR` 可以是一个 concept，同时 `materialized_topic_id` 指向完整 Topic Synthesis artifact：

```json
{
  "id": "concept:detr",
  "label": "DETR",
  "kind": "concept",
  "definition": "A transformer-based object detection framework that formulates detection as direct set prediction.",
  "aliases": ["DEtection TRansformer"],
  "definition_status": "curated",
  "materialized_topic_id": "detr"
}
```

## Edge Types

第一版只保留少数稳定关系。

### broader_than

上位概念 / 包含关系。第一版最重要的关系类型。

```json
{
  "source_topic_id": "object-detection",
  "target_topic_id": "detr",
  "relation": "broader_than"
}
```

### related_to

相关但非上下位。

### overlaps_with

范围交叉。

### prerequisite_for

理解依赖或方法依赖关系。可作为后续扩展；第一版可以先不主推。

### used_by

概念或方法被另一个 topic/concept 使用。例如：

```text
Hungarian Matching -> used_by -> DETR
```

该关系对知识库很有用，但第一版不必作为 UI 主关系。

## Suggested Schema

```json
{
  "schema_id": "synthesis.topic_graph",
  "schema_version": "1.0.0",
  "nodes": [
    {
      "id": "topic:object-detection",
      "topic_id": "object-detection",
      "label": "Object Detection",
      "kind": "topic",
      "definition_status": "has_synthesis"
    },
    {
      "id": "concept:machine-learning",
      "label": "Machine Learning",
      "kind": "concept",
      "definition": "A family of methods that learn patterns from data to make predictions or decisions.",
      "aliases": ["ML"],
      "definition_status": "lightweight"
    }
  ],
  "edges": [
    {
      "source": "concept:machine-learning",
      "target": "concept:deep-learning",
      "relation": "broader_than",
      "source": "agent_suggested",
      "confidence": "medium",
      "status": "suggested"
    },
    {
      "source": "topic:object-detection",
      "target": "concept:detr",
      "relation": "broader_than",
      "source": "agent_suggested",
      "confidence": "high",
      "status": "suggested"
    }
  ],
  "diagnostics": []
}
```

> Note: the exact field name for provenance may need to avoid collision with edge `source` node id. A later spec should distinguish `source` / `target` from `provenance.source`.

## Concept Knowledge Base

Concept Knowledge Base 的基元是 `concept`。

每个 concept 建议包含：

```json
{
  "concept_id": "concept:hungarian-matching",
  "label": "Hungarian Matching",
  "aliases": ["Hungarian algorithm matching", "bipartite matching"],
  "definition": "A matching procedure used to find an optimal one-to-one assignment between predicted objects and ground-truth objects.",
  "definition_status": "agent_drafted",
  "source_refs": [
    {
      "kind": "paper",
      "paper_ref": "1:ABC",
      "artifact_type": "digest"
    }
  ],
  "related_topic_ids": ["detr", "object-detection"],
  "diagnostics": []
}
```

Concept definition 应保持短小：

- 目标是帮助用户快速理解概念，不是生成百科长文。
- 优先 1-3 句话。
- 应允许 `definition_status = missing | agent_drafted | curated | stale`。

## Concept Mention Sidecar

不要直接改写 digest artifact 或 synthesis artifact 正文。

原因：

- 会污染 artifact hash。
- 会破坏后续 evidence 引用。
- 会让 note payload 与 raw artifact 混在一起。
- artifact 更新时难以判断哪些 `[[...]]` 是原文，哪些是渲染增强。

应使用 sidecar 保存 concept mentions：

```text
concepts.json
concept-mentions.json
topic-graph.json
```

渲染器在展示 digest/report 时读取 mention sidecar，只在 locator 可验证时动态注入 wiki link。source artifact 保持不变。

### Mention Locator

不要使用纯 offset。纯 offset 在 artifact 内容变化后极易失效。

建议使用多层定位器：

```json
{
  "concept_id": "concept:hungarian-matching",
  "artifact_ref": {
    "topic_id": "detr",
    "paper_ref": "1:ABC",
    "artifact_type": "digest",
    "content_hash": "sha256:..."
  },
  "locator": {
    "section_heading_path": ["#### Method", "##### Matching"],
    "paragraph_hash": "sha256:...",
    "quote": "Hungarian matching is used to assign predictions...",
    "normalized_mention": "hungarian matching",
    "occurrence_index": 1
  },
  "status": "active"
}
```

渲染时按以下优先级定位：

1. `content_hash` 相同：locator 可直接信任。
2. `content_hash` 不同，但 `section_heading_path` 仍存在：在该 section 内用 `quote` / `normalized_mention` 重新匹配。
3. section 不存在：全文 fuzzy 查找 `quote` 或 normalized mention。
4. 找不到：不渲染该 wiki link，并将 mention 标记为 `stale`。

核心安全原则：

```text
不确定就不渲染。
```

最坏情况应是链接消失，而不是错误标注。

## Concept Extraction Workflow

建议新增 workflow：

```text
extract-concepts-from-synthesis
```

第一版流程：

1. 读取已有 synthesis topics、filtered digest artifacts、synthesis reports。
2. 脚本机械抽取候选短语：
   - 标题词
   - 缩写
   - 高频术语
   - 引文上下文里的方法名/任务名
   - topic taxonomy / claims / debates / gaps 中出现的专业概念
3. 用规则归一化与 BM25 做候选归并和近似去重。
4. Agent 判断哪些候选是真概念，合并别名，写简短说明。
5. 脚本校验 concept schema、mention locator、source refs。
6. Host 保存 concept registry、mention sidecar、semantic graph updates。

第一版明确不做 embedding。

未来可以可选配置 embedding 模型，用于候选 merge rerank，但不进入一期实现范围。

## Wiki Link Rendering

渲染器负责把 verified mention 动态渲染成 wiki-link 风格元素。

示例显示：

```markdown
DETR uses [[Hungarian Matching]] to assign predictions to ground-truth boxes.
```

实际 source artifact 不包含 `[[...]]`。`[[...]]` 只是渲染层效果。

点击后弹出 concept bubble：

- label
- definition
- aliases
- related topics
- source refs
- stale / confidence diagnostics

在 Zotero note 渲染中需要有剔除逻辑：

- raw payload block 不注入 wiki link。
- machine-readable JSON / code block 不注入 wiki link。
- 只有人类阅读视图、preview/export 或 digest modal 的 markdown 正文启用。

## Source and Trust Model

Topic graph 不应默认把 agent 输出当作硬事实。

建议边和节点带 provenance：

- `source`: `agent_suggested | user_confirmed | host_imported | system_derived`
- `confidence`: `low | medium | high`
- `status`: `suggested | confirmed | rejected`

第一版可以先只写 `suggested`，UI 用弱样式展示。后续再增加 accept / reject 操作。

## Runtime Flow

### Create Topic Synthesis

1. Agent 调用 `synthesis.list_topics`。
2. Agent 基于已有 topic 的 `title / description / aliases / graph summary` 做重复检查和邻近概念判断。
3. Agent 在最终输出中给出轻量 `topic_graph_suggestions`。
4. Host apply 保存 topic artifact，同时将 suggestions 合并到 topic graph。

可选扩展：

- Agent 可以在 topic synthesis 中提出少量高价值 `concept_suggestions`，但不应在 create synthesis 主流程中承担完整知识库构建任务。
- 完整概念抽取应由独立 concept extraction workflow 执行。

### Update Topic Synthesis

1. Agent 调用 `synthesis.get_topic_context`。
2. Topic context 返回当前 topic 的 graph neighborhood。
3. Agent 可以提出新增、修改、删除 topic graph suggestion。
4. Host apply 合并 suggestion，但不自动删除 user-confirmed edge。

## Persistence Boundary

建议 semantic graph / concept registry / mention index 作为独立 synthesis state assets，而不是塞进每个 topic artifact。

可能路径：

```text
state/topic-graph.json
state/concepts.json
state/concept-mentions.json
```

或按现有 storage envelope 风格：

```text
state/topic-graph.json
```

它应保存：

- topic graph nodes
- topic graph edges
- provenance / status
- diagnostics

它不保存：

- topic synthesis 长正文
- paper evidence
- review input 大 payload
- digest 正文
- report 正文

## MCP Surface

新增 tool：

```text
synthesis.get_topic_graph
```

新增 concept tools：

```text
synthesis.search_concepts
synthesis.get_concept
```

可选后续 tool：

```text
synthesis.get_concept_graph
```

`synthesis.get_topic_context` 可附带当前 topic 的 concept summary / graph neighborhood，但不应默认返回全量 mention index。

建议输入：

```json
{
  "topicId": "detr",
  "radius": 2,
  "includeSuggested": true,
  "relationTypes": ["broader_than", "related_to"]
}
```

建议输出：

```json
{
  "schema_id": "synthesis.topic_graph_view",
  "schema_version": "1.0.0",
  "center_topic_id": "detr",
  "nodes": [],
  "edges": [],
  "diagnostics": []
}
```

`synthesis.list_topics` 可附带轻量 graph summary：

```json
{
  "topic_id": "detr",
  "title": "DETR",
  "graph": {
    "parents": ["deep-learning", "object-detection"],
    "children_count": 0,
    "related_count": 3
  }
}
```

完整 graph 不应塞进 `list_topics`，避免响应过重。

## UI Surface

### Topics Page

增加可选视图：

- flat list
- graph / hierarchy grouped view

列表项显示：

- parent chips
- child count
- related count
- suggested relation indicator

### Graph Page

现有 Graph 页面可以承载 topic graph。

建议区分：

- paper citation graph
- topic graph

第一版可以只做 topic graph 的只读展示。

### Topic Detail Page

顶部显示当前 topic 的 neighborhood：

```text
Parents:
Machine Learning > Deep Learning
Object Detection

Children:
...

Related:
...
```

不要把 topic graph 作为主内容区，避免干扰 synthesis artifact 阅读。

### Digest Modal / Report View

Digest modal、synthesis report、review input preview 可以启用 wiki-link overlay。

行为：

- concept mention verified：渲染为可点击 wiki link。
- locator stale：不渲染链接。
- 点击 link：显示 concept bubble，不离开当前阅读位置。

### Concept Browser

后续可加一个轻量 concept browser：

- 按字母 / topic / recently used 浏览 concept。
- 搜索 concept label / alias。
- 查看 definition、source refs、related topics。

## Review Workflow Value

Topic graph 能为后续文献综述 workflow 提供更好的定位信息：

- 当前 topic 属于哪个上位研究方向。
- 当前 topic 与哪些相邻 topic 交叉。
- 当前 topic 是否过窄或过宽。
- Related Work 是否需要从父 topic、兄弟 topic、邻近 topic 补充背景。

这比单个 topic artifact 更适合作为 review planning 的全局导航层。

Concept Knowledge Base 还能为 review workflow 提供：

- 术语表。
- 可复用的概念解释。
- Related Work 中需要简短定义的术语候选。
- 读者背景缺口提示。
- 某个 topic 涉及的关键方法/任务/评估概念集合。

## Non-Goals

第一版不做：

- 完整 ontology 构建。
- 自动概念合并。
- 复杂图编辑器。
- 强制每个 topic 必须挂到父节点。
- 复杂推理或自动补全。
- 跨用户、跨库的全局 topic 知识图谱。
- 把 topic graph 混入每个 topic artifact 正文。
- embedding-based concept dedup / merge。
- 自动改写 digest artifact。
- 自动改写 source note payload。
- 大型知识库编辑器。
- 长篇百科式 concept 页面。

## Open Questions

1. 是否需要用户确认 suggested edges 后才进入 `confirmed` 状态？
2. `concept` 节点是否允许用户手动创建，还是只由 agent suggestion 产生？
3. Topic graph 的 UI 第一版应放在 `Topics` 页面，还是优先放在 `Graph` 页面？
4. `broader_than` 是否足够第一版使用，还是需要同时支持 `related_to`？
5. 后续 review workflow 是否应默认读取 topic graph neighborhood？
6. Concept registry 与 topic graph 是否使用同一份 semantic graph 文件，还是拆成 `concepts.json` + `topic-graph.json` + `concept-mentions.json`？
7. Concept mention locator 的 fuzzy matching 阈值应如何设定，才能避免误链接？
8. Concept bubble 是否允许用户直接编辑 definition，还是一期只读？

## Suggested Change Name

```text
add-synthesis-semantic-graph-and-concept-kb
```

第一版建议范围：

- semantic graph schema
- concept registry schema
- concept mention sidecar schema
- graph / concept state persistence
- `synthesis.get_topic_graph`
- `synthesis.search_concepts`
- `synthesis.get_concept`
- `synthesis.list_topics` graph summary
- topic detail / graph page基础展示
- digest/report wiki-link overlay
- concept bubble
- create/update synthesis 输出 graph suggestions
- independent concept extraction workflow
