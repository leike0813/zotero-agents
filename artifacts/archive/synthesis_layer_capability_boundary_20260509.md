# Synthesis Layer 能力边界

## 1. 定位

Synthesis Layer 是 Zotero-Skills 中位于 paper-level derived artifacts 之上的跨文献综合层。

它的目标不是替代 Zotero 文献库，也不是重新实现单篇文献 digest，而是把已经生成的 digest、citation analysis、normalized tags 和 Zotero metadata 组织为可持久化、可审计、可复用的跨文献综合工件。

核心定位：

```text
Zotero raw source
  -> paper-level derived artifacts
  -> Synthesis Artifact
  -> agent-facing global knowledge
```

Synthesis Artifact 是当前文献库状态下的一次综合推理快照。它可以辅助 agent 进行 topic overview、related work、research gap 和 method landscape 等宏观任务，但它本身不是事实源。

当前运行时约束：插件侧 MCP 服务尚未开放远程调用。因此，Synthesis Layer 相关 skill 在 v1 只支持 ACP Skills 后端。普通 Skill-Runner 后端、Generic HTTP 后端或外部远程 agent 在无法调用插件内 Synthesis MCP 工具时，不进入 v1 支持范围。

## 2. Topic 边界

v1 只实现 `topic_synthesis`，但 topic 不应被简化为 Zotero tag、collection 或自由文本中的任何一种。

v1 将 topic 拆成四个层次：

- **Topic Seed**：用户输入的原始主题意图，例如一段自然语言、当前 collection、当前选中文献集合或已有 tag。
- **Topic Definition**：正式 topic 的稳定定义，包括 `id`、`title`、`description`、`aliases` 等字段。
- **Topic Resolver**：用于从当前 Zotero 文献库中确定候选文献集合的声明式规则。
- **Resolved Paper Set**：某次 synthesis 实际使用的具体 paper key 快照。

插件可以机械创建 Topic Seed，但不应在没有 agent 的情况下语义补全 Topic Definition。正式 Topic Definition 和 Topic Resolver 应由 agent 基于 schema 和当前库 index 提议，再由插件校验和持久化。

正式 Synthesis Artifact 必须持久化：

- Topic Definition；
- Topic Resolver；
- Resolved Paper Set；
- resolver 执行诊断；
- synthesis 使用的 derived artifact 清单。

## 3. Resolver 边界

Topic Resolver 是 agent-assistable but host-owned。

也就是说：

- agent 可以生成 resolver proposal；
- agent 可以在更新时提出 resolver patch；
- 插件负责校验 resolver schema；
- 插件负责执行 resolver；
- 插件负责返回 resolved papers、match reasons、coverage 和 missing artifacts；
- 正式 artifact 必须保存声明式 resolver 和实际 resolved paper set。

agent 不应绕过插件直接决定正式文献集合。插件也不应把自由 topic 直接解释成不可审计的隐式文献集合。

v1 支持的正式 resolver mode：

- `tag_query`：基于 Zotero tag 或 normalized tag；
- `collection`：基于 Zotero collection；
- `explicit_paper_set`：基于明确 paper key 列表；
- `mixed`：组合 tag、collection、include papers、exclude papers 和轻量 lexical query。

`tag_query` 必须支持 `AND` / `OR` / `NOT` 与括号。tag 不限制类型，可以是 Zotero raw tag、normalized tag 或当前库中已有的其他 tag；agent 基于插件披露的 tag index 生成 resolver，插件负责精确解析和诊断。

`collection` 默认递归包含子 collection。`mixed` resolver 的优先级固定为：

```text
exclude > include > query-derived candidates
```

v1 lexical query 只查询 title、year、creators 和 item key，不读取 abstract、digest 或 citation analysis 正文。

v1 可以支持 `exploratory_query`，但它只产生 draft。用户或策略确认后，必须转化为正式 resolver mode，并保存 resolved paper set，才能进入正式 Synthesis index。

## 4. 全库轻量 Index

为了让 agent 生成合理的 Topic Definition 和 Resolver，插件应向 agent 暴露当前文献库的全局轻量 index。

这个 index 是全局的，但字段是受限的。它的目的不是直接完成 synthesis，而是帮助 agent 生成 resolver。

v1 index 可以包含：

- 所有 tag 及其计数；
- 所有 collection 及其 key、名称、路径、item count；
- 所有 top-level regular item 的 key、libraryId、title；
- 可选 year、itemType；
- 可选 tag membership；
- 可选 collection membership；
- index version / hash / generated_at。

v1 index 不应包含：

- full abstract；
- digest 正文；
- citation analysis 正文；
- Zotero note 正文；
- PDF markdown；
- attachment 内容。

resolver 生成后，agent 再通过 MCP 渐进式读取 resolved papers 的 derived artifacts。

如果库很大，index 应支持分页或压缩表示，但不能只给局部候选集，否则会削弱全局 topic discovery 的能力。

## 5. 确定性基础设施

Synthesis Layer v1 除了 `topic_synthesis`，还应维护两类确定性基础设施资产：

- **Unified Citation Graph**
- **Paper Registry**

这两类资产是 plugin-owned deterministic substrate，应由插件侧根据 Zotero metadata 和已有 derived artifacts 通过确定性算法形成，不依赖 LLM 推理。

v1 可以通过可配置的自动监控机制维护确定性基础设施，但不能自动重写解释性 Synthesis Artifact。也就是说，Paper Registry、Unified Citation Graph、artifact lookup index 和 readiness / coverage view 可以自动或按需重建；`topic_synthesis` Markdown、topic timeline narrative 和结论性摘要只能自动标记 freshness / stale 状态，必须由用户显式触发 update workflow 后才可重写。

自动监控和自动重建必须受 preferences 控制。用户应能关闭 Zotero 事件监听、关闭自动 Registry rebuild、关闭自动 Graph rebuild，或改为仅手动 refresh。

### 5.1 Unified Citation Graph

Unified Citation Graph 是一张统一的 citation-oriented graph，用于合并管理：

- 库内文献之间的引用关系；
- 库中文献对外部 reference 的引用关系；
- 尚未解析或未匹配的 reference；
- citation analysis 工件中已有的 citation role annotation。

它的输入包括：

- reference matching workflow 结果；
- structured references；
- citation analysis；
- Zotero item metadata。

Unified Citation Graph 不重新解释引用关系，也不让 agent 判断引用语义。citation role 只能作为已有 citation analysis 工件的投影挂载到 citation edge 上。

citation edge 方向固定为 `citing paper -> cited target`。同一 source paper 多次引用同一 target reference / work 时，v1 聚合为一条 edge，并记录 `mention_count`、role evidence 和 source artifact refs。

如果同一 edge 有多个 citation roles，v1 必须选择一个 `primary_role` 作为关键语义，其余保存在 `aux_roles`。primary role 选择规则为 evidence count 优先，其次 role priority，其次 role label 字典序。没有 role 时使用 `unspecified`。

target 可以是：

- 库内 paper；
- 外部 reference；
- unresolved reference。

外部 reference 和 unresolved reference 在没有匹配到库内 item / citekey 时，必须生成 Synthesis Layer 自己的 **provisional reference key**。该 key 是 reference / intellectual work 层面的确定性指纹，不是 Zotero item key，也不是 Better BibTeX citekey。

provisional reference key 的推荐生成优先级：

```text
normalized DOI
  -> normalized arXiv id
  -> normalized URL
  -> normalized title + year + first author
```

以上四类 key 在 v1 都视为 deterministic strong key。`title + year + first author` 命中时，应按同一 intellectual work 处理；预印本和正式发表版本如果生成同一 provisional reference key，v1 合并为同一个 graph node，而不是拆成两个节点。

外部 reference 后续如果被加入 Zotero，并且库内 item 按同一规则生成的 provisional reference key 命中既有 external / unresolved node，应通过确定性 promotion 把 target 状态升级为库内 paper，而不是新增一套并行图。

promotion 必须保留旧 provisional reference key 作为 alias，并记录 merge / promotion diagnostics。若多个 Zotero items 命中同一个 provisional reference key，v1 应标记 duplicate candidates，并用确定性规则选择 canonical library item。

### 5.2 Paper Registry

Paper Registry 是表单式文献资产管理系统，不是 graph。

它用于记录每篇文献的：

- Zotero key / libraryId；
- title、year、itemType 等基础 metadata；
- tag membership；
- collection membership；
- digest / structured references / citation analysis / markdown 等 artifact availability；
- artifact hash；
- artifact updated_at；
- coverage / readiness 状态。

Paper Registry 的主要用途是：

- resolver 诊断；
- synthesis readiness 检查；
- missing artifact 列表；
- batch workflow planning；
- review workflow 的输入清单管理。

### 5.3 不进入基础 graph 的内容

以下内容不属于 v1 确定性基础设施：

- method lineage graph；
- claim conflict graph；
- research gap graph；
- topic phase graph；
- topic timeline graph；
- enables / supersedes / shifts_to 等解释性关系。

这些内容可以作为 `topic_synthesis` 或后续论文综述 workflow 的生成结果出现，但不作为 Synthesis Layer 的底层确定性 graph 真源。

Topic timeline 明确属于 `topic_synthesis` 的 narrative 任务。生成或更新 topic synthesis 时，agent 应基于 Unified Citation Graph、Paper Registry、digest 和 citation analysis 等输入，在 synthesis 工件内生成 timeline 章节或结构化段落。

## 6. v1 能力范围

`topic_synthesis` 用于围绕一个 Topic Definition 和 Resolved Paper Set 生成跨文献综述型 Markdown 工件。它应回答：

- 当前 topic 覆盖哪些文献；
- 这些文献的核心问题、方法和代表性贡献是什么；
- 该 topic 的时间线、发展阶段或关键转折点是什么；
- 当前 evidence 的强弱和覆盖限制在哪里；
- 哪些 derived artifacts 被使用，哪些缺失；
- 后续 agent 能如何复用该综合结果。

v1 默认输入：

- Topic Seed；
- Topic Definition schema；
- Resolver schema；
- Artifact metadata schema；
- global lightweight library index；
- Paper Registry；
- Unified Citation Graph；
- plugin-executed resolver results；
- Zotero item metadata；
- paper digest；
- citation analysis；
- normalized tags；
- collection membership；
- 用户已有 Zotero notes 的摘要或 payload manifest。

v1 默认输出：

- 一个 human-readable Markdown Synthesis Artifact；
- 一个 machine-readable sidecar metadata JSON；
- Topic Definition；
- Topic Resolver；
- Resolved Paper Set；
- topic timeline narrative 或结构化段落；
- index / dependency / log 中的对应记录。

## 7. 作业期 MCP 能力边界

Synthesis workflow 从用户视角应尽量是单轮：用户输入 topic seed 或选择已有 topic，后续中间步骤由 agent 通过 MCP 工具完成。

插件侧除了第一步输入和最后一步持久化之外，应把中间 host 能力暴露为 Synthesis MCP 服务，避免 UI 多轮 wizard。

由于这些作业期 MCP 工具目前只能由插件内可访问 MCP 的 ACP Skills agent 调用，v1 synthesis workflow 应绑定 ACP Skills 后端能力，而不是声明为通用 Skill-Runner workflow。

v1 作业期 MCP 工具应覆盖：

- 获取 topic seed、旧 topic definition、旧 resolver、旧 resolved paper set；
- 获取 Topic Definition schema、Resolver schema、Artifact schema；
- 分页读取 global lightweight library index；
- 读取 Paper Registry；
- 查询 Unified Citation Graph；
- 校验 agent 生成的 resolver；
- 执行 resolver；
- 返回 resolved papers、match reasons、coverage diagnostics、missing artifacts；
- 查询 paper artifact manifest；
- 分批读取 paper-level derived artifacts。

最终正式写入仍应由 workflow result bundle 和 applyResult 完成。agent 不应通过 MCP 直接写正式 Synthesis Artifact、index、dependency graph 或 Zotero anchor。

核心原则：

```text
Agent proposes.
Plugin validates and resolves.
Agent synthesizes from resolved evidence.
Plugin persists through applyResult.
```

## 8. 典型流程

### 8.1 初次生成

```text
用户输入 topic seed
  -> 插件启动 synthesize-topic workflow
  -> agent 读取 Topic Definition schema / Resolver schema / Artifact schema
  -> agent 读取 global lightweight library index
  -> agent 生成 Topic Definition proposal + Resolver proposal
  -> 插件校验并执行 resolver
  -> 插件返回 resolved papers + diagnostics
  -> agent 读取 Paper Registry 和 Unified Citation Graph
  -> agent 通过 MCP 分批读取 paper artifacts
  -> agent 生成 topic synthesis Markdown + timeline + metadata bundle
  -> 插件 applyResult 持久化
```

### 8.2 更新

```text
用户选择已有 topic
  -> 插件启动 update workflow
  -> agent 读取旧 Topic Definition / 旧 Resolver / 旧 Resolved Paper Set
  -> agent 读取当前 global lightweight library index
  -> agent 提出 Topic Definition patch 和 Resolver patch，或确认无需修改
  -> 插件执行新 resolver 并计算 paper-set diff
  -> agent 读取更新后的 Paper Registry 和 Unified Citation Graph
  -> agent 基于新增或变化 evidence 读取 artifacts
  -> agent 生成新版 synthesis Markdown + timeline + metadata bundle
  -> 插件 applyResult 持久化新版本和日志
```

## 9. v1 明确不做

v1 不做以下能力：

- 不解析 raw PDF；
- 不运行 MinerU；
- 不生成或重写单篇 digest；
- 不重新抽取 structured references；
- 不自动管理 Zotero 原始 tags；
- 不要求文献必须先经过 tag-regulator；
- 不要求 Zotero 中必须存在 `topic:xxx` tag；
- 不直接修改 Zotero raw source；
- 不实现通用 RAG 系统；
- 不要求 embedding；
- 不实现完整 claim graph；
- 不实现 method / gap / related-work 等多 kind synthesis；
- 不实现 method lineage graph；
- 不实现 claim conflict graph；
- 不实现 research gap graph；
- 不实现 topic timeline graph；
- 不让 LLM 构建 Unified Citation Graph 或 Paper Registry；
- 不支持无法访问插件内 Synthesis MCP 工具的普通 Skill-Runner 后端或远程 agent；
- 不做复杂 stale propagation；
- 不做自动全量同步或自动批量重写；
- 不自动运行 agent 重写已有 topic synthesis；
- 不在未开启 preferences 的情况下启动自动监控或后台重建；
- 不通过 MCP 直接写正式 synthesis 持久化资产。

这些能力可以作为后续 phase 扩展，但不能进入 v1 的验收口径。

## 10. 与现有能力的边界

### 10.1 与 literature-digest

`literature-digest` 负责单篇文献理解和生成 paper-level derived artifacts。

Synthesis Layer 只消费这些 derived artifacts，不重复生成 digest，也不直接判断单篇论文全文。

### 10.2 与 reference matching / structured references

Reference matching workflow 和 structured references 是 Unified Citation Graph 的主要输入。

Synthesis Layer 可以把库内引用、外部引用和 unresolved reference 统一投影为 citation edge，但不重新执行 reference extraction，也不通过 LLM 猜测引用匹配。

### 10.3 与 citation analysis

Citation analysis 是 Synthesis Layer 的输入之一。

v1 可以把 citation analysis 中已经存在的 citation role annotation 投影到 Unified Citation Graph 的 citation edge 上，但不重新分析 citation role，也不做跨文献冲突图。

### 10.4 与 tag-regulator / tag-manager

Tag workflows 负责标签规范化和管理。

Synthesis Layer 可以使用 normalized tags 做 resolver 和组织依据，但不强耦合 tag-regulator，也不直接负责标签受控词表治理。

### 10.5 与 ACP / agent 对话

ACP Chat 可以读取 Synthesis Artifact 作为上下文。

Synthesis Layer 不替代 ACP Chat，也不把普通对话 transcript 当作 synthesis 主资产。

## 11. 质量边界

Synthesis Artifact 中的所有关键结论必须能追溯到来源：

- Zotero item；
- derived artifact；
- Zotero note；
- citation analysis；
- attachment / Markdown manifest；
- 用户明确提供的上下文。

文档中必须区分：

- established finding；
- weak evidence；
- disputed point；
- inferred conclusion；
- open question；
- missing coverage。

如果输入缺失较多，artifact 应标记为 `partial`，而不是伪装为完整综述。

## 12. later phase 候选能力

后续 phase 可以逐步增加：

- `method_synthesis`；
- `gap_synthesis`；
- `related_work_synthesis`；
- `dataset_synthesis`；
- claim support / challenge graph；
- verified interpretive graph；
- embedding search / semantic rerank；
- stale-soft / stale-hard 自动传播；
- patch-based incremental update；
- SQLite / FTS5 retrieval index；
- 批量 synthesis 生成和更新。

这些能力应建立在 v1 的 artifact schema、持久化方案和 UI 主入口稳定之后。
