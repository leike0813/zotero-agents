# Synthesis Layer 实现 Roadmap

## 1. 目标

本 roadmap 将四份 Synthesis Layer 设计工件收束为可执行的实现顺序。

v1 的核心目标是：

- 建立可同步、可恢复的 Synthesis Layer 资产体系；
- 建立可重建的 Paper Registry；
- 建立确定性 Unified Citation Graph；
- 通过 ACP Skills 后端实现 `synthesize-topic` workflow；
- 在 Zotero 主区域提供 Synthesis tab，用于管理 artifact、registry 和 citation graph。

v1 不追求一次性实现论文综述 workflow 的全部生成逻辑，但必须为后续“论文综述 workflow”提供稳定基础设施。

## 2. 实施原则

实现时遵守以下原则：

- canonical assets 是 Synthesis Layer 自有资产真源；
- Zotero anchor / note shards 只是同步镜像和恢复入口；
- Paper Registry 是可重建投影，不参与同步真源；
- Unified Citation Graph 是可重建的确定性投影快照，由插件根据已有 metadata 和 derived artifacts 构建，不依赖 LLM；
- topic timeline 是 `topic_synthesis` 工件内容，不是底层 graph；
- agent 负责 Topic Definition、Resolver proposal 和 synthesis narrative；
- 插件负责 schema、resolver 校验、resolver 执行、MCP host capability、持久化和 UI；
- 正式写入必须走 workflow result bundle 和 applyResult；
- v1 synthesis skill 只支持 ACP Skills 后端。

## 3. Phase 0：OpenSpec 与合同冻结

目标：把设计口径转成可验证的 spec 和 schema，避免后续边做边改边界。

工作项：

- 新建 OpenSpec change，例如 `add-synthesis-layer-v1`。
- 定义 `TopicDefinition` schema。
- 定义 `TopicResolver` schema。
- 定义 `ResolvedPaperSet` schema。
- 定义 `SynthesisArtifactMetadata` schema。
- 定义 `PaperRegistryRow` schema。
- 定义 `UnifiedCitationGraph` schema。
- 定义 Zotero anchor / note shard mirror manifest schema。
- 冻结 Zotero anchor item 格式：document item，标题 `Zotero-Skills Synthesis Layer Anchor`。
- 冻结 note shard title 格式：`ZS Synthesis Mirror [<library-id>] <kind> <seq:000>/<total:000>`。
- 冻结 note shard payload 格式：可见正文只显示元数据，机器 payload 放在 HTML comment `ZOTERO_SKILLS_SYNTHESIS_SHARD` 中。
- 冻结 shard encoding / compression：canonical JSON -> SHA-256 payload_hash -> gzip -> base64 -> SHA-256 encoded_hash；允许 `compression: none` 降级。
- 冻结 shard size：target encoded payload 64 KB，max encoded payload 96 KB。
- 冻结 manifest 排序：kind order + seq ascending，`manifest_hash` 排除自身字段。
- 定义 workflow result bundle schema。
- 定义作业期 Synthesis MCP 工具输入输出合同。
- 冻结 schema 工具链：JSON Schema draft 2020-12 + Ajv runtime validation。
- 冻结 canonical JSON envelope：`schema_id`、`schema_version`、`created_at`、`updated_at`、`data`。
- 冻结 schema version 规则：semver，v1 初始 `1.0.0`。
- 冻结 unknown fields 策略：canonical preserve、result bundle reject、MCP input reject、MCP output extensible、SQLite strict。
- 冻结 migration 策略：patch / minor 可自动，major 需要用户确认，写回前创建本地 backup。
- 冻结 hash 规范：统一 SHA-256，格式 `sha256:<lowercase-hex>`。
- 冻结 canonicalization 规则：JSON stable key order，Markdown line endings normalize to LF，set-like arrays sorted。
- 冻结 graph/layout hash 边界：graph hash 排除 layout，layout hash 包含 graph hash、preset、params 和 coordinates。
- 冻结个人 library 绑定策略：一个 Zotero personal library 对应一个 synthesis root 和一个 Zotero anchor。
- 冻结 artifact 版本策略：同步 root 只保存 current，本地不可变历史版本放在 local data 中，且不参与文件同步或 Zotero note shard 同步。
- 冻结并发写入策略：本机 library 级写锁 + result bundle base hashes + applyResult compare-and-swap。
- 冻结冲突策略：v1 不自动 merge，base hash mismatch 时保存本地 conflict candidate 并拒绝覆盖 current。
- 冻结自动监控策略：自动能力只维护确定性资产和 freshness 状态，不自动运行 agent update workflow。
- 冻结 preferences：source watch、Registry auto rebuild、Graph rebuild mode、staleness scan、debounce 和 startup check 都必须可配置。
- 冻结作业期 MCP 连接策略：参考 ACP Chat 的插件内 host capability 连接方式，不要求远程 MCP。
- 冻结 derived artifact discovery 合同：复用现有 `data-zs-payload` hidden payload marker，artifact hash 来自 decoded payload。
- 冻结 Topic Resolver 语义：`tag_query` 支持 AND / OR / NOT，collection 递归包含子 collection，mixed 使用 `exclude > include > query-derived candidates`。
- 冻结 citation edge 语义：direction 为 citing -> cited，同一 paper 多次引用同一 target 聚合为一条 edge，primary role + aux roles。
- 冻结 D3-force layout 默认策略：确定性初始坐标、固定 preset 参数、固定 iteration count、固定输出精度。

验收：

- spec 能独立说明 v1 scope。
- schema 能覆盖 create 和 update 两条 synthesis 流程。
- schema registry 能统一校验 canonical assets、MCP tool I/O 和 workflow result bundle。
- 明确 `topic_synthesis` 是 v1 唯一 synthesis kind。
- 明确普通 Skill-Runner、Generic HTTP 和远程 agent 不进入 v1 支持范围。
- 明确 group library 不进入 v1 支持范围。
- 明确 topic synthesis 不会被后台自动重写。

## 4. Phase 1：本地存储与同步锚骨架

目标：先把 Synthesis Layer 的资产落点、索引、日志和 Zotero 同步锚建立起来。

工作项：

- 增加 Synthesis storage root 配置与绑定状态。
- v1 仅支持 Zotero personal library；每个 personal library 绑定一个 synthesis root 和一个 Zotero anchor。
- 实现 canonical assets 目录初始化：

```text
synthesis/
  topics/
    <topic-id>/
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

- 实现 canonical JSON / Markdown 读写 helper。
- 实现 JSON Schema registry。
- 实现 Ajv validator 封装。
- 实现 canonical JSON envelope 读写。
- 实现 schema migration registry。
- 实现 patch / minor 自动 migration。
- 实现 major migration 用户确认入口。
- 实现 migration local backup / recovery copy。
- 实现 SHA-256 hash provider。
- 实现 canonical JSON hashing。
- 实现 normalized Markdown hashing。
- 实现 set-like array sorting policy。
- 在插件 local data / Zotero profile 下实现本地不可变历史目录。
- 实现 `current` 指针与本地历史快照。
- 实现本地版本清理策略，避免长期 local assets 膨胀。
- 实现 library 级本机写锁。
- 实现 result bundle base hash 校验。
- 实现 applyResult compare-and-swap。
- 实现本地 conflict candidate 保存。
- 实现 temp-write + replace 写入策略。
- 实现 append-only `log.jsonl`。
- 实现 Zotero parent anchor 查找、创建和识别。
- 实现 document anchor 创建。
- 实现 note shard title 生成和解析。
- 实现 note visible metadata 渲染。
- 实现 HTML comment payload 写入和提取。
- 实现 gzip/base64 shard payload 编码。
- 实现 shard target / max size 切片。
- 实现 note shard mirror manifest 的写入和读取。
- 实现 manifest deterministic sort。
- 实现 payload_hash、encoded_hash 和 manifest_hash 校验。
- 实现 canonical assets 到 note shards 的镜像刷新。
- 实现 anchor / shard 被删除后的重建路径。
- 实现 root missing / anchor missing / degraded mirror 状态。

验收：

- 新机器可以通过 anchor 找到 root path hint。
- anchor 或 shards 被删除后，可从 canonical assets 重建。
- canonical assets 缺失但 shards 存在时，可进入恢复流程。
- note shards 不被视为真源。
- 历史版本仅本地保留，不进入同步 root 或 Zotero note shard mirror。
- base hash mismatch 时不得覆盖 current artifact。
- conflict candidate 仅本地保存，不进入同步 root 或 Zotero note shard mirror。
- group library 明确不支持。

建议测试：

- storage root 初始化测试。
- canonical JSON envelope validation 测试。
- schema migration happy path 测试。
- major migration confirmation gate 测试。
- unknown fields preserve 测试。
- SHA-256 hash format 测试。
- canonical JSON hash stability 测试。
- Markdown LF normalization hash 测试。
- graph hash excludes layout 测试。
- layout hash includes graph hash / preset / params / coordinates 测试。
- hash / manifest 生成测试。
- shard 分片和重建测试。
- shard title parse / format 测试。
- HTML comment payload extract 测试。
- gzip/base64 payload roundtrip 测试。
- manifest sort / hash excludes self 测试。
- shard size split 测试。
- anchor missing recovery 测试。
- 版本保留与清理策略测试。
- library write lock 测试。
- compare-and-swap mismatch 测试。
- conflict candidate 保存测试。
- `npx tsc --noEmit`。

## 5. Phase 2：Paper Registry 投影

目标：实现可随时重建的 Paper Registry，为 resolver diagnostics、missing artifacts 和 UI 表格提供基础。

工作项：

- 从 Zotero metadata 构建 registry 基础行。
- 读取 tag membership 和 collection membership。
- 读取已有 derived artifact notes / payload manifests / attachments。
- 识别 digest、structured references、citation analysis、markdown 等 artifact availability。
- 复用现有 note payload codec 发现 `digest-markdown`、`references-json`、`citation-analysis-json`。
- artifact hash 来自 decoded payload canonical content，而不是 note 可见 HTML。
- 计算 artifact hash、updated_at、coverage、readiness 和 diagnostics。
- 建立本地 SQLite materialized cache。
- 实现 source event log / change ledger。
- 根据 preferences 监听 Zotero item、tag、collection、derived artifact 和 storage 变化。
- 实现事件 debounce / coalescing。
- 实现 Registry dirty 标记和自动 / 手动 rebuild。
- 提供 registry rebuild 命令或服务入口。
- 暴露 `synthesis.get_paper_registry` 作业期 MCP 工具。
- 为 UI Registry View 提供查询模型。

验收：

- 删除本地 SQLite 后可以完整重建 Paper Registry。
- Paper Registry 不写入 canonical assets 作为同步真源。
- Paper Registry 不写入 Zotero note shards。
- registry 能回答 missing digest / missing citation analysis / ready-for-synthesis。
- preferences 关闭时不会自动监听或自动 rebuild。

建议测试：

- 从 mock Zotero items 构建 registry。
- artifact manifest 缺失和损坏时给出 diagnostics。
- derived artifact payload marker discovery 测试。
- decoded payload hash 测试。
- duplicate payload candidates diagnostics 测试。
- 删除 SQLite 后 rebuild 得到等价结果。
- source event debounce / coalescing 测试。
- Registry auto rebuild pref 开关测试。
- `npx tsc --noEmit`。

## 6. Phase 3：Unified Citation Graph

目标：把库内引用、外部 reference、unresolved reference 和已有 citation role annotation 合并为一张确定性 citation graph。

工作项：

- 定义 graph node：
  - library paper；
  - external reference；
  - unresolved reference。
- 定义 provisional reference key schema，作为 external / unresolved reference 的 work-level 指纹。
- 定义 graph edge：
  - internal citation；
  - external citation；
  - unresolved citation。
- 定义 citation edge direction：citing paper -> cited target。
- 定义 edge id 生成规则。
- 定义 repeated citations aggregation：同一 source paper 多次引用同一 target 聚合为一条 edge。
- 定义 citation role projection：primary_role + aux_roles。
- 读取 structured references。
- 读取 reference matching workflow 结果。
- 读取 citation analysis 中已有 citation role annotation。
- 将 citation role 作为 edge annotation 投影，不重新解释。
- 为 external / unresolved reference 生成 provisional reference key。
- graph rebuild 时对库内 paper 使用同一规则生成 provisional reference key。
- 若库内 paper 的 provisional reference key 命中 external / unresolved node，则自动 promotion 为 library paper target。
- promotion 时保留 alias、重定向 citation edges，并记录 merge diagnostics。
- 多个 Zotero items 命中同一 provisional reference key 时，记录 duplicate candidates，并用确定性规则选择 canonical library item。
- 写入 canonical `unified-citation-graph.json`，作为可重建投影快照和 synthesis 复现依据，不作为不可替代真源。
- 写入 canonical `unified-citation-layouts.json`，作为与 `graph_hash` 和 layout preset 绑定的可重建布局快照。
- 建立本地 graph query index。
- 引入 Graphology 作为 graph data model。
- 引入 D3-force 作为后台 / worker layout engine。
- 引入 Sigma.js 作为 WebGL renderer。
- 实现 layout presets：`compact`、`balanced`、`expanded`。
- 实现 deterministic layout input sorting。
- 实现 deterministic initial coordinates from SHA-256。
- 实现 fixed D3-force iteration count per preset。
- 实现 fixed coordinate precision output。
- Graph rebuild 后优先计算 `balanced` layout；其他 presets 可后台或 idle 计算。
- 实现 Graph dirty 标记。
- 实现 Layout dirty 标记。
- 根据 preferences 支持 Graph rebuild mode：off / idle / auto。
- 根据 preferences 支持 default layout preset 和 compute-all-presets 策略。
- 对超过自动重建规模阈值的大库，只标记 dirty 并提示用户手动 rebuild。
- 暴露 `synthesis.query_citation_graph` 作业期 MCP 工具。
- 提供 graph slice 查询接口，供 UI 分页和过滤。

验收：

- 图构建过程不调用 LLM。
- 图快照可删除后重建。
- 内部、外部、unresolved 三类 target 都可表示。
- external / unresolved node 有稳定 provisional reference key。
- `title + year + first author` 命中时可自动 promotion。
- preprint / formal publication variants 在 v1 按同一 intellectual work 合并。
- promotion 保留 alias 和 merge diagnostics。
- duplicate candidates 不阻塞 graph rebuild。
- citation role 只来自已有 citation analysis。
- 同一 source-target citation edge 聚合 mention_count 和 role evidence。
- primary_role 按 evidence count、role priority、lexicographic label 选择。
- 图可按 tag、collection、year、topic resolver、neighborhood 查询 slice。
- UI 使用持久化 layout preset，不默认运行全图 D3-force simulation。
- Graph rebuild mode 为 off 时不会后台重建。

建议测试：

- internal citation graph fixture。
- external reference fixture。
- unresolved reference fixture。
- provisional reference key fixture。
- promotion from external / unresolved to library paper fixture。
- duplicate candidate canonical selection fixture。
- role annotation projection fixture。
- repeated citation edge aggregation fixture。
- primary / aux role selection fixture。
- graph slice 查询测试。
- Graph dirty / rebuild mode 测试。
- layout preset snapshot 测试。
- layout dirty / recompute 测试。
- `npx tsc --noEmit`。

## 7. Phase 4：作业期 Synthesis MCP 工具

目标：把 synthesis workflow 中除首尾之外的 host capability 全部 MCP 化，避免 UI 多轮 wizard。

工作项：

- 实现 `synthesis.get_topic_context`。
- 实现 `synthesis.get_schemas`。
- 实现 `synthesis.get_library_index`，支持分页或压缩表示。
- 实现 `synthesis.resolve_resolver`。
- 接入 `synthesis.get_paper_registry`。
- 接入 `synthesis.get_citation_graph_slice`，只读 persisted snapshot 的有界切片，不触发 graph rebuild。
- paper-level derived artifact 正文读取走通用 Zotero note payload 工具链，不再暴露 synthesis 专用 artifact read MCP tools。
- 明确作业期 MCP 不提供正式写入工具。
- 作业期 MCP 连接方式参考 ACP Chat 的插件内 host capability 实现，同一 v1 不要求远程 MCP 调用。
- MCP 实现参考现有 Zotero MCP / host capability broker：bounded read、DTO、cursor / chunked access、note payload codec、structured errors。

验收：

- agent 可以基于 schema 和 global lightweight library index 生成 resolver。
- resolver 必须由插件校验并执行。
- MCP 返回 resolved papers、match reasons、coverage diagnostics、registry readiness 和 graph slice diagnostics。
- 大库 index、graph slice 和 note payload 读取不会一次性塞入完整正文。

建议测试：

- resolver schema validation。
- `tag_query` resolver execution。
- `tag_query` AND / OR / NOT expression 测试。
- `collection` resolver execution。
- collection recursive subcollection 测试。
- `explicit_paper_set` resolver execution。
- `mixed` resolver execution。
- mixed exclude-over-include 测试。
- note payload chunked read guidance。
- `npx tsc --noEmit`。

## 8. Phase 5：`synthesize-topic` workflow 与 ACP Skills 合同

目标：实现 v1 核心 synthesis 生成与更新流程。

工作项：

- 新增 `synthesize-topic` workflow。
- workflow provider 固定为 ACP Skills 兼容后端。
- 支持 create 模式：用户输入 Topic Seed。
- 支持 update 模式：用户选择已有 Topic Definition / Artifact。
- 为 ACP Skills skill 定义输入约束和输出 bundle。
- workflow request 必须携带 SHA-256 base artifact hash、base metadata hash、base index hash、base resolver hash 和 base resolved paper set hash。
- skill 通过 MCP 获取 schema、library index、registry、bounded graph slice，并通过通用 note payload tools 读取 paper artifacts。
- skill 输出 Markdown、metadata、Topic Definition、Resolver、Resolved Paper Set 和 diagnostics。
- skill 输出 result bundle 必须原样带回 base hashes。
- skill 在 Markdown 中生成 topic timeline narrative 或结构化段落。
- applyResult 校验 result bundle。
- applyResult 在本机写锁内执行 compare-and-swap。
- applyResult 写入 canonical current artifact，并在本地 local data 中保留不可变历史版本。
- applyResult 刷新 Zotero mirror shards。
- applyResult 追加 log，并触发本地 index rebuild。
- applyResult 触发 deterministic projections dirty 标记和 staleness scan，但不触发自动 agent update。

验收：

- create 可以生成完整 `topic_synthesis` artifact。
- update 可以读取旧 resolver，生成 patch 或确认 no-op。
- 正式 artifact 保存 resolver 和 resolved paper set 快照。
- Zotero note shard mirror 只同步 current artifact metadata / manifest，不同步本地历史版本正文。
- base hash mismatch 时保存本地 conflict candidate，不覆盖 current，不刷新 mirror。
- agent 不直接写文件、Zotero raw source、canonical index 或 note shards。
- timeline 存在于 topic synthesis 工件内，不进入底层 graph。
- 相关输入变化时 artifact 可被标记为 `stale`，但不会被后台自动重写。

建议测试：

- result bundle schema validation。
- applyResult happy path。
- applyResult invalid bundle rejection。
- applyResult base hash mismatch rejection。
- conflict candidate local save。
- create workflow integration fixture。
- update workflow integration fixture。
- `npx tsc --noEmit`。

## 9. Phase 6：Synthesis Tab UI MVP

目标：提供主区域 Synthesis tab，把 artifact、registry 和 citation graph 做成可用工作台。

工作项：

- 实现打开 Synthesis tab 的菜单或工具栏入口。
- 使用 browser-hosted web app 加载 Synthesis UI。
- 建立 host/web bridge：
  - `synthesis:init`；
  - `synthesis:snapshot`；
  - `synthesis:action`。
- 实现 Artifacts View：
  - artifact list；
  - search / filter；
  - freshness / coverage；
  - Markdown preview；
  - open canonical Markdown；
  - open synthesis folder；
  - run synthesize-topic workflow。
  - stale 状态提示。
- 实现 Registry View：
  - registry table；
  - tag / collection / missing artifact / readiness filter；
  - open Zotero item；
  - run missing artifact workflow entrypoint。
- 实现 Preferences 状态展示和入口：
  - source watch enabled；
  - Registry auto rebuild；
  - Graph rebuild mode；
  - staleness scan；
  - debounce interval；
  - startup hash check。
- 实现 Citation Graph Explorer：
  - graph slice 加载；
  - Graphology graph model 接入；
  - Sigma.js WebGL render；
  - pan / zoom；
  - node search；
  - node / edge hover highlight；
  - selected node / edge details drawer；
  - citation role filter；
  - tag / collection / year / topic resolver filter；
  - layout preset segmented control / discrete slider；
  - neighborhood depth 控制；
  - manual recompute layout action；
  - open Zotero item。
- 实现 Sidebar fallback 入口。

验收：

- 主 tab 可展示当前 storage / anchor / registry / graph 状态。
- 主 tab 可展示 auto watch / rebuild preferences 状态。
- UI 不直接访问文件系统或 Zotero API。
- graph layout 控件只影响 UI slice 和布局，不修改 canonical graph。
- layout preset 切换只切换已持久化坐标，不运行全图 simulation。
- 大图默认按 topic、collection 或 neighborhood slice 加载，不默认渲染全库。
- Sidebar fallback 能打开主 tab 或提供降级入口。

建议测试：

- bridge action routing 测试。
- snapshot shape 测试。
- graph filter state 测试。
- layout preset switching 测试。
- registry filter state 测试。
- preferences snapshot / action routing 测试。
- 手动验证 Zotero tab 与 Sidebar fallback。
- `npx tsc --noEmit`。

## 10. Phase 7：多机同步、恢复与冲突处理

目标：让 Synthesis Layer 在多机同步环境下可解释、可恢复，不因 mirror 损坏丢资产。

工作项：

- 实现 canonical hash 与 mirror manifest 对比。
- 实现 local root missing 提示与重新绑定。
- 实现 canonical assets 优先策略。
- 实现 shards 恢复 canonical assets 的 disaster recovery 流程。
- 实现 divergent canonical versions 的冲突副本保留。
- 实现 conflict candidate 列表、清理和重新 update 入口。
- 实现 degraded sync mirror state 的 UI 展示。
- 实现 registry / graph local index 损坏后的自动重建。
- 实现启动时 hash mismatch 检查，并受 preferences 控制。
- 实现 topic synthesis staleness scan，并受 preferences 控制。

验收：

- 删除 SQLite 不影响 canonical assets。
- 删除 anchor / shards 不影响 canonical assets。
- root path 不同机器可重新绑定。
- 不自动用 note shard 覆盖本地 canonical assets，除非用户确认恢复。
- 自动监控关闭时只能手动 refresh / rebuild。
- synthesis artifact 不会被后台自动 agent 重写。

建议测试：

- missing root scenario。
- missing anchor scenario。
- stale mirror manifest scenario。
- SQLite corruption rebuild scenario。
- conflict copy scenario。
- `npx tsc --noEmit`。

## 11. Phase 8：论文综述 workflow 对接准备

目标：为后续“论文综述 workflow”提供稳定输入，而不把综述写作逻辑提前塞进 Synthesis Layer。

工作项：

- 为 review workflow 暴露 topic synthesis 读取入口。
- 为 review workflow 暴露 resolved paper set。
- 为 review workflow 暴露 Paper Registry readiness view。
- 为 review workflow 暴露 Unified Citation Graph slice。
- 文档化 review workflow 推荐输入：
  - topic synthesis Markdown；
  - topic synthesis metadata；
  - resolved paper set；
  - citation graph slice；
  - missing artifacts diagnostics；
  - topic timeline narrative。
- 明确 method lineage、claim conflict、research gap graph 留到后续 phase。

验收：

- 论文综述 workflow 不需要重新决定 topic scope、resolver、paper set 和 citation graph 取数方式。
- review workflow 可以直接消费 Synthesis Layer v1 资产。
- Synthesis Layer 仍不承担深层解释性 graph 构建。

## 12. v1 不做项

以下内容不进入 v1 实现：

- raw PDF 解析；
- 单篇 digest 生成或重写；
- structured references 重新抽取；
- LLM 构建 Unified Citation Graph；
- LLM 构建 Paper Registry；
- SQLite 作为同步真源；
- Paper Registry 通过 Zotero note shards 同步；
- topic timeline graph；
- method lineage graph；
- claim conflict graph；
- research gap graph；
- embedding search；
- stale-soft / stale-hard 复杂传播；
- 远程 MCP 调用；
- 普通 Skill-Runner / Generic HTTP synthesis 后端；
- MCP 直接写正式 Synthesis Artifact。

## 13. 推荐里程碑

建议按以下 milestone 管理：

- M1：schema、OpenSpec、storage root、Zotero anchor 骨架完成。
- M2：Paper Registry 可重建，Registry View 可读。
- M3：Unified Citation Graph 可构建、查询和 UI 浏览。
- M4：作业期 Synthesis MCP 工具完成。
- M5：`synthesize-topic` create / update workflow 完成。
- M6：Synthesis tab MVP 完成。
- M7：多机恢复、mirror 降级和冲突处理完成。
- M8：论文综述 workflow 对接合同完成。

每个 milestone 的最低验收线：

- 关键 schema 有测试；
- 关键持久化路径有测试；
- 关键 UI state 有可验证 snapshot 或 model test；
- `npx tsc --noEmit` 通过；
- 不引入超出 v1 scope 的深层分析能力。
