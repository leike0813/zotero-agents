# Literature Search Ingest

## 用途

从研究问题、论文线索或空白引导对话出发，执行多来源、多语言文献发现，也支持以种子论文扩展相关工作以及定向核验并入库单条记录。工作流先检查本地 Zotero/Synthesis 覆盖，再由用户确认搜索方案与入库范围；范围确认后，每篇文献由一个隔离 subagent 并行执行一次有界元数据与公共 PDF 检索，主 agent 汇总、修复并提交正式载荷，最后逐篇写入 Zotero。

## 参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `query` | 空 | 主题、题名、identifier 或种子线索；空白 `auto` 进入引导模式。 |
| `searchMode` | `auto` | 自动、引导、主题扩展、种子扩展或定向入库。 |
| `searchBreadth` | `broad` | `broad`、`balanced`、`quick`，控制查询和来源覆盖。 |
| `languageHints` | `[]` | 用于扩展查询和地区来源的语言提示，不会过滤其他语言。 |
| `targetCollection` | 空 | 可选目标 Zotero collection。 |

## 执行边界

1. 工作流整体保持 `interactive`。外部 discovery 前必须完成只读本地覆盖检查，并在 Stage 10 等待用户确认搜索方案；非空 `auto` 也不能提前搜索。
2. Stage 20 按批准方案执行 core、multilingual、seed、gap 查询 lane，保留实际来源证据、原始文字、材料版本和去重依据。
3. Stage 30 分批展示 `ready`、`needs_curation` 与 `lead_only` 候选。用户可批准范围、取消，或提出聚焦补检；补检返回 Stage 20，增加 discovery round。agent 只提交当轮新增候选和有依据的更新，由运行时合并并保留累计候选。
4. Stage 10 和 Stage 30 是仅有的等待阶段。范围批准后不再等待用户，也不以新的候选替换身份不符的已批准候选。
5. 只有用户在 Stage 30 明确批准入库范围后，工作流才创建 Stage 40 单篇研究 assignment。批准候选按确认顺序稳定拆分为一篇一个 assignment。prepare 完成后，gate 一次返回 `dispatch_plan.assignments` 中全部 `result-missing` assignment；主 agent 必须在同一调度轮次为每个 descriptor 启动一个新 subagent，启动完全部任务前不得等待任一 worker、读取早到结果或重跑 gate，严禁 `paper-1 → 等待 → gate → paper-2` 的串行派发。
6. subagent 的唯一行为指令是 `SKILL.md` 中的静态委派 prompt，gate、runner 和 workflow 不生成或补充另一套 prompt。assignment spec 只提供一个批准候选、查询/页面上限和 `result_path`。worker 将元数据检索与公共 PDF 检索作为一个原子任务，写一个简单扁平的 `result.json` 后退出；不得运行 gate、finalizer、validator、import 或 Zotero 命令，也不得等待另一 worker。
7. Stage 40 元数据研究采用 identifier-first 或严格 title-path，保留权威原题名；PDF 研究按 authoritative landing、open access、public web search 顺序进行，找到可靠同文献公共 PDF 后立即停止后续搜索。worker 只提供发现事实、来源 URL、可用 PDF URL 和简短不确定性说明，不需要 manifest、hash、覆盖图或复杂嵌套语义。
8. 只要任一 gate-issued `result_path` 仍缺失，gate 就继续返回完整 result-missing assignment 集合，主 agent 必须先派发该完整集合再统一等待。所有 raw result 就绪后，gate 才逐篇返回 `review_agent_result`：主 agent 核对来源、修复遗漏、将合法摘要字段写为 `abstractNote`（不得写 `abstract`）、形成正式 metadata/PDF review 并提交。raw result 本身不推进全局状态；全部正式 review 通过后，运行时才生成不可手改的一文一载荷并绑定 Stage 70 所需 hash。
9. Stage 70 只能由主 agent 执行：每次 gate 只返回一篇文献的一条 `zotero-bridge` mutation，主 agent 写入精确 Host JSON receipt、提交 receipt 并重新运行 gate 后，才能取得下一篇命令。不得把 Host mutation 委派给 subagent，不得并发执行多篇，不得把多篇组装为 `papers[]`；Host 回执仍是 existing、failed 和附件状态的事实源。
10. 除 all-assignment dispatch 外，每次状态变化后必须重新运行初始 gate。一个 dispatch plan 的全部非阻塞 subagent 启动与统一等待构成同一调度轮次，必须在该轮所有 worker 到达终态后才重新运行 gate，不得在两个 assignment 启动之间重跑 gate。输入漂移、状态损坏、已接受 payload 或生成载荷被修改、错误回执绑定与冲突重放均 fail closed。
11. worker 不填写正式 schema；主 agent 只填写 gate 返回的 review 模板与 schema 所要求的语义内容。action、round、候选绑定、hash、计数和固定策略由运行时派生。Stage 70 回执直接保存 Host 原始 JSON，不再手填绑定 wrapper。

## 状态与恢复

- `runtime/literature-search-ingest-gate.json` 是轻量执行状态真源；`runtime/agent-batches/<batch-id>/` 只保存 data-only `spec.json` 与简单 `result.json`，正式 review 和生成的 ingest payload 位于 `runtime/payloads/`，Host receipt 位于 `runtime/host/`。不得写入系统临时目录或工作目录外的自动 fallback 位置。
- Gate 返回当前 stage、真实 `next_action`、合法 actions、discovery round、阶段专属 reference、路径、schema、模板、命令与恢复摘要。prepare 后的 delegation gate 返回全部 result-missing assignment，而不是单篇游标，也不返回 worker prompt 或脚本。所有 raw result 就绪后才进入主 agent review；结果文件存在只满足调度 barrier，不等于通过身份、字段、PDF 或 schema 校验。
- 若多个 assignment 缺少结果，主 agent 在同一恢复轮次派发 gate 返回的完整集合。raw result 畸形、信息不足或相互冲突时，主 agent 检查来源并进行小规模有界修复，随后亲自写正式 review；不要求原 worker 或 replacement worker 执行内部 repair/finalizer。工作流不写持久化 dispatch receipt 或外部 worker registry。
- subagent 无法写入共享工作目录时，只返回同一个简单 JSON 对象；主 agent 可将其写入 spec 声明的 `result_path` 后继续 review。工作目录或 `runtime/` 不可写时直接报告失败，不改用 `/tmp`、用户缓存目录或其他外部目录。
- `runtime/payloads/` 保存主 agent 正式 review 与运行时生成的 canonical 单篇 ingest payload；`runtime/host/` 只保存主 agent 按顺序执行 Stage 70 后得到的单篇 Host receipt。fatal Host failure 立即停止后续 mutation，并保留已接受 review、payload 与 receipt 供恢复使用。
- `result/search-ledger.json` 仅保存决策、轮次、路径、hash 和终态摘要，不能驱动阶段推进或修复状态。
- completed 与 canceled 都由 terminal gate 构造；最终原样输出 gate 的 `final_output`。

## 产出

- 最终结果：搜索与入库数量摘要，以及仅含已批准候选的紧凑 `outcomes`。
- `created`/`existing` 条目只包含题名、入库状态、数字 item id、PDF 状态和整理标记；`failed`/`not_attempted` 只包含题名与状态。标识符、证据、路径、详细原因和 Host 原始回执保留在 ledger 与阶段工件中，避免候选较多时终态刷屏。
- DOI 统一通过 typed payload 的 `identifiers.doi` 传入 Host；支持 DOI 的 item type 写入原生 DOI 字段，只有不支持时使用 Extra。
- 新建条目固定加入 `status:need-markdown`、`status:need-analysis`、`status:need-deep-reading`；只有本次结果明确需要整理元数据或未取得 PDF 时，才分别加入 `status:need-metadata-curation`、`status:need-fulltext`。
- 复用已有条目时不会重新排入完整处理流程，只会根据本次明确结果补充 metadata/fulltext 待办。
- 这些内建状态的词表定义由插件启动初始化；Search workflow 只增删条目上的标签实例，不创建或修改词表定义。状态变更失败会作为部分成功警告返回，不回滚已入库条目。

## 依赖

- Skill-Runner interactive 后端
- 可联网搜索的模型
- Zotero Host Bridge 写权限
