# Literature Search Ingest

## 用途

从研究问题、论文线索或空白引导对话出发，执行多来源、多语言文献发现，也支持以种子论文扩展相关工作以及定向核验并入库单条记录。工作流先检查本地 Zotero/Synthesis 覆盖，再由用户确认搜索方案与入库范围；范围确认后自动完成权威元数据核验、三路线公共 PDF 探测、typed payload 生成与逐篇 Zotero 入库。

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
5. Stage 40 对每个批准候选执行 identifier-first 或严格 title-path 元数据核验，保留权威原题名；无法核实完整中文作者时使用空 creators 并标记需整理。
6. Stage 50 必须覆盖 authoritative landing、open access、public web search 三条 PDF 路线。未找到公共 PDF 不阻止安全的元数据入库，缺少任何路线则不能推进。
7. Stage 60 由运行时生成不可手改的一文一载荷，并以 hash 绑定候选；Stage 70 逐篇执行 `zotero-bridge` mutation，以 Host 回执作为 existing、failed 和附件状态的事实源。
8. 每次状态变化后必须重新运行初始 gate。输入漂移、状态损坏、已接受 payload 或生成载荷被修改、错误回执绑定与冲突重放均 fail closed。
9. agent 只填写 gate 返回的模板与 schema 所要求的语义内容；action、round、候选绑定、hash、计数和固定策略由运行时派生。Stage 70 回执直接保存 Host 原始 JSON，不再手填绑定 wrapper。

## 状态与恢复

- `runtime/literature-search-ingest-gate.json` 是轻量执行状态真源；阶段 payload 保存完整证据，生成的 ingest payload 与 Host receipt 保存于各自目录。
- Gate 返回当前 stage、真实 `next_action`、合法 actions、discovery round、阶段专属 reference、payload path、schema 引用、最小模板、相关枚举、命令与恢复摘要。
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
