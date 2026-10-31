# 向量检索 OpenSpec 交接方案

状态：用户于 2026-10-07 回复“认可”，确认交接范围和验收顺序。对应[确认 OpenSpec 交接范围与实施验收路径的最终决议](https://github.com/leike0813/zotero-agents/issues/87#issuecomment-6021012655)。本稿是已确认的规划输入，不是正式 OpenSpec 工件，也不代表功能已实现。

核对日期：2026-10-07；交接时源码基线：`840c5254292f105ad609bdd06adb04400b82c988`。现有非向量基础已经通过[固定搜索契约与非向量能力的结票验收](https://github.com/leike0813/zotero-agents/issues/88#issuecomment-6018603386)。实施已进入 `openspec/changes/add-synthesis-vector-retrieval/`；实现进度和验证证据由该 change 持有。

## 交接形式与完成边界

后续用一个协调的 OpenSpec change（候选名 `add-synthesis-vector-retrieval`）生成 proposal、design、delta specs 和 tasks，内部按下面的任务组推进。这样三搜索入口、索引维护和消费界面的共同规则只有一个落稿与验收入口。正式 change 由后续 OpenSpec 会话创建。

只新增一个 `synthesis-vector-retrieval` capability，承载 embedding、检索应用、向量索引和私有派生资产的特有契约。其他行为扩展现有 capability；相似推荐、Discovery 和维护无需各建一个新规格域。既有词法内核仍独立可用。

实现及生产验收由[实现向量检索增强并完成来源、生命周期与生产验收](https://github.com/leike0813/zotero-agents/issues/92)承接。地图完成只表示实现前的产品边界已确定。数据库表、模块文件、批大小等具体实现选择进入 design；实测预算、人工质量阈值、设备与服务可用性进入 tasks 的明确待办，不在本稿猜定。

## 规格与任务映射

下表的既有 capability 均对应 `openspec/specs/<名称>/spec.md`。后续只为实际语义变化写 delta，不按表机械修改全部文件。

| 任务组                     | 新增或扩展的规格                                                                                                                                                                                                                     | 要承接的行为与完成证据                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 来源、embedding 与检索应用 | 新增 `synthesis-vector-retrieval`；扩展 `synthesis-application-foundation`、`synthesis-sidecar-isolated-repository-foundation`、`synthesis-sidecar-recursive-dto-contracts`、`synthesis-cross-language-sidecar-contract`             | 现有 Rust runtime 内新增 Retrieval Application，复用现有 Repository；Zotero Broker 与 canonical Topic 持有原始事实，Host 持有文件读取、连接凭据和 embedding 网络请求。先确定有界 DTO、来源版本、原文定位、切分规则和模型/维度/编码身份，再接入 OpenAI-compatible 与 Ollama。整体校验响应数量、关联、维度和有限数值，失败不写部分向量；有序 fallback 和查询/批次预算沿用已定规则。                                                                          |
| SQLite 索引与维护          | `synthesis-vector-retrieval`；扩展 `synthesis-maintenance`、`synthesis-native-webdav-maintenance-surface`、`synthesis-persistence-performance`，按需要扩展 runtime/operation-observability 规格                                      | 现有 SQLite 保存 float32 原向量、来源定位、可见性与发布依据；归一化矩阵可重建。初建、重建、增量、取消、重试、继续与重启复用 public maintenance owner 和 durable winner，向量/进度与整组发布保持事务一致。来源已变则局部暂停；整体重建期间语义整体暂停，完整发布才恢复。发布后清理失败保留已发布成功。迁移只管理本机派生数据，默认不进入 Git/WebDAV 导出；备份恢复后核验依据再供查询。                                                                      |
| 三搜索入口与结果           | 扩展 `synthesis-search-contracts`、`synthesis-evidence-search`、`synthesis-topic-lexical-search`、`zotero-host-broker-capability-api`、`workflow-host-api-v12` 及实际涉及的 Bridge/MCP/CLI projection 规格                           | 沿用 `library.searchItems`、`topics.search`、Synthesis `searchEvidence` 三个文本查询入口及现有分页/状态契约。硬范围先于候选评分，Rust 按有效原向量精确重排、聚合文献最佳片段后与词法等权 RRF（k=60）融合。可选增强不可用时按既定入口政策词法回退，推荐不能用纯词法冒充相似结果。同轮冻结依据与方法；Evidence 同次读取核验现有来源正文、版本及 UTF-16 定位，失效来源跳过并保留其他有效结果。Topic 按 dataRoot 查 canonical sections，不纳入 Evidence 语料。 |
| Home、相似推荐与 Discovery | 扩展 `synthesis-workbench-ui`、`synthesis-workbench-index-actions`、`synthesis-workbench-surface-refresh`、`topic-synthesis-skills` 与实际涉及的 Topic application 规格                                                              | Home 提供配置、范围、显式维护及状态；读取页面不自动建索引。论文详情相似推荐展示标题、材料类型和短摘录：优先 metadata 摘要，其次已有 digest 概述，缺失时标题弱材料明确标记，不从全文用固定语法猜摘要。Discovery 用 Topic 描述和正向兴趣检索；must/exclude 交现有 Stage 30 语义审阅。候选不是来源，只有成功 apply 后才采用；拒绝意图持久保留。区域更新互相隔离。                                                                                             |
| 文档、Agent surface 与交付 | 扩展实际涉及的 `host-bridge-agent-surfaces`、`host-bridge-service`、`zotero-mcp-tool-suite`、`host-bridge-cli-synthesis-subcommands`、`acp-embedded-zotero-mcp-server`、`synthesis-sidecar-runtime-packaging`、`system-e2e-strategy` | 原有公开入口保持一致；Agent/Workflow 不增加索引维护工具或私有引用起点。更新漂移文档。凡改动 Host Bridge 三个 Agent surface 的语义源，先固定 baseline 和 materialized 指标，删除清单为空；按项目厚度与逐条语义 parity 规则审阅。最终完成当前源码的七平台构建/smoke、包体、许可证与统一 Zotero E2E。                                                                                                                                                         |

## 采用的决议

规格生成应引用下列最终决议和修订链，不把本稿作为另一份产品规则事实源：

- [首版语料与结果粒度](https://github.com/leike0813/zotero-agents/issues/76#issuecomment-5976905771)、[规模、质量与资源目标](https://github.com/leike0813/zotero-agents/issues/77#issuecomment-5977325643)。
- [应用、Host 与存储所有权](https://github.com/leike0813/zotero-agents/issues/80#issuecomment-5977462482)、[embedding 配置与索引空间](https://github.com/leike0813/zotero-agents/issues/81#issuecomment-5979998325)。
- [索引初建、增量、失效与恢复](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980714524)、[三入口、混合排序与证据契约](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-6019183704)。
- [SQLite 与 Rust 最终选型](https://github.com/leike0813/zotero-agents/issues/84#issuecomment-6019346923)、[Agent、Workflow 与 Synthesis 消费边界](https://github.com/leike0813/zotero-agents/issues/85#issuecomment-6020179791)。
- [用户接受的四组实际任务样例](https://github.com/leike0813/zotero-agents/issues/86#issuecomment-6020755011)：推荐、Agent 证据、工作流选材、Discovery。

其中索引生命周期决议取代 embedding 票早期的“整体重建期间仍使用旧索引”描述；最终查询决议采用公共文本 query，Evidence 归 Synthesis；最终消费决议不把已采用论文放进首版 Discovery 正向查询。

## 文档更新范围

在正式规格与实现同批更新下列既有文档，不新建并行架构文档：

- `docs/synthesis-layer/library-ssot-and-sidecar-cache.md`、`persistence-and-files.md`：补充用途受限的本机检索派生资产及恢复核验；保留 Zotero/canonical Topic 的事实所有权，不恢复旧 Library 全量镜像。
- `docs/synthesis-layer/runtime-and-rebuild.md`、`performance-and-scale.md`：索引维护和查询预算、三档规模、性能/资源证据及已测/未测条件。
- `docs/synthesis-layer/topics-and-discovery.md`、`topic-application.md`、`state-machines.md`、`workbench-ui.md`、`README.md`：核对旧 token-overlap 与 lexical-only 描述，写明透明增强、材料分级、triage、采用/拒绝与 Home 控制行为。
- `docs/components/zotero-host-capability-broker-ssot.md`、`host-bridge-capability-registry.md`：同步三入口所有权、实际方法、覆盖和失败行为。

`CONTEXT.md` 只记录已经确定的领域词汇；本票没有新术语，不继续填入接口或实施细节。新 owner 和关键不变量实际落地时，再将必要约束加入项目 `AGENTS.md`。用户帮助从其源文件生成，不直接改自动生成的 help-docs。

## 验收顺序与证据要求

### 1. 先验证正确性与恢复

复用既有测试，再为新增稳定行为补充用例。按 TDD 先覆盖公开行为与风险边界，不锁定内部调用顺序、SQL 表名、文案或 Skill 指令文本；不为测试复制生产 runtime 或扩大 API。

- 搜索：复用 `tests/zotero-host/102-zotero-host-broker-capability-api.test.ts`、`tests/synthesis/276-synthesis-evidence-search-projection.test.ts`、`280-synthesis-host-evidence-source-contract.test.ts`、`281-synthesis-evidence-production-route.test.ts`、`282-synthesis-topic-search-projection.test.ts`。覆盖库/多库、collection/tag/type、itemRefs/sourceKinds 空数组及交集、Topic sections、版本/删除/依据变化、分页完整性及词法回退。验证候选相对完整 eligible 参照的覆盖，候选内精确重排不等于全范围精确 top-k。
- Workflow/Agent：复用 `tests/workflows/187-workflow-host-contract-governance.test.ts`、`tests/host-bridge/107-host-bridge-capabilities.test.ts`、`108-mcp-host-bridge-mirror.test.ts`。验证同一搜索行为在 projection 间一致，分页失败的选材轮不能继续依赖其完整输入的分析；正常 bounded 结果仍按实际状态可消费。
- UI/Discovery：复用 `tests/synthesis/253-synthesis-home-region.test.ts`、`254-synthesis-topics-region.test.ts`、`133-topic-synthesis-runtime-contract.test.ts`。核验材料来源标记、范围确认、候选/来源区分、成功采用、拒绝恢复和无关区域 DOM 身份。
- Rust/Repository：复用现有 Rust workspace 单元与 process integration 测试，补齐实际来源回读、4 reader/1 writer 正常业务争用、短事务、原子发布、过期输出、提交/发布/清理阶段故障、取消、retry/continue、重启分类及有效进度复用。Zotero 7/9/10 的 Trash/merge 和附件版本可观测性需实机证据。

最小对应命令为 `npm run test:node:synthesis`、`npm run test:node:workflow`、`npm run test:node:host-bridge`、`npm run test:synthesis-rust-sidecar`；随实际修改执行 TypeScript、Rust clippy 和相应跨语言/maintenance/service-boundary/Agent surface 检查，不机械运行无关检查。

### 2. 再用真实材料确认质量、性能与预算

- 2k、10k、25k 三档使用可复核的真实独立语料；25k 按密集 Markdown 全文与分析产物统计，记录实际文本字节、片段/向量数、模型/维度、切分、范围和查询负载，不能当成 25k 条向量。已接受原型只是表达和模拟执行证据；研究中的复制身份压力档及 Agent 评分不替代人工相关性。
- 人工分别评估中文、英文、跨语言，以及文献、最佳证据和 Topic 结果；先固定参照模型与标注方法，再请用户确认数值质量阈值。当前没有已批准的 recall、top-k 质量分数或查询集数量，不自行填数。
- 本地索引与查询向量就绪的查询 p95 ≤1 秒为目标、≤2.5 秒为最低要求；embedding/网络耗时另列，并报告包含实际来源与协议的端到端 P50/P95。记录范围选择性、k/maxResults、并发、首次/预热、模型加载与 OS 页缓存条件；不可控的冷盘记为未验证。
- CPU Xeon E5-2680 v4（14 核/28 线程、约 64 GB）、Tesla P4 8 GB、用户 RTX 4090 服务作为三组参考条件。用户已提供 RTX 4090 endpoint `http://192.168.13.11:11434`；模型列表可读取，但实际编码与设备性能仍需验证，不能提前记通过。默认模型预设的真实 ID、配对编码、长度与维度需服务验证。
- 初建/重建/增量/取消/恢复成本以及正式数据、staging、矩阵、WAL、备份峰值均记录。资源预算和远程费用预算经测量后由用户确认；远程初建先估算输入量与费用并确认预算。实验的 6400 候选、4096 阈值、1024 维与 16/32/128 GiB 不成为生产默认。
- 25k 尚无查询达标证据，必须补验；超出实测容量显式退化，未达标携具体证据重新讨论，不能自动换引擎、延长探索或降低目标。真实查询的片段阅读、跨片段归纳与候选解释反馈由实施验收观察；出现能明确表述的问题再建票。

### 3. 最后验证实际交付

以项目 matrix 完成七平台 native 构建与 smoke，核对压缩包体、依赖/工具链和许可证，以及当前源码 sidecar 与插件打包身份。预构建和受治理发布按各自技能/授权处理。

真实 Zotero 验收只使用 `tests/zotero/e2e/full` 与 `npm run test:zotero:e2e`，运行当前源码构建的 sidecar；真实库/profile 仅作为只读来源复制到隔离测试目录，提交的金例脱敏。Citation Graph stress runner 仅负责其自身生命周期压力，不替代向量质量或性能验收。

大型语料、构建缓存、性能数据与临时 payload 放 `/mnt/HotData/tmp`，遵守隔离测试入口与 staging 约束，避免占用本机剩余磁盘。本交接会话不运行这些实验、构建或生产测试。

## 已确认的交接结果

用户已经确认这份范围和路径，可闭合交接票并清空地图残余规划问题：真实体验观察由实施验收承接。正式 OpenSpec 工件和实现仍是后续阶段；将设备、服务、质量阈值及预算待办明确写进 tasks，避免把“规划完成”记为“生产验收完成”。
