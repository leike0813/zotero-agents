# Literature Search Ingest

## 用途

从研究问题、主题、种子论文或精确文献线索出发，执行多来源、多语言发现，审核候选，并将用户批准的直接作品逐篇入库到 Zotero。

工作流先检查本地 Zotero/Synthesis 覆盖，再由用户确认检索计划和入库范围。范围批准后，主 agent 组织 subagent 完成每篇论文的 metadata、直接作品身份和公开 PDF 研究；每篇 metadata-qualified 论文形成独立 Host ingest payload。任一 payload 完成后即可被主 agent 收集和检查，Zotero mutation 始终逐篇串行执行。

## 参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `query` | 空 | 主题、问题、题名、identifier 或种子线索；空白 `auto` 进入 guided planning。 |
| `searchMode` | `auto` | 自动、引导、主题扩展、种子扩展或定向入库。 |
| `searchBreadth` | `broad` | `broad`、`balanced`、`quick`，控制查询和来源覆盖，不降低候选质量标准。 |
| `languageHints` | `[]` | 扩展查询和地区来源，不过滤其他语言。 |
| `targetCollection` | 空 | 可选目标 Zotero collection；空值使用当前默认文库。 |

## 阶段

### 阶段 10：检索计划

- 读取参数并确定 `auto`、`guided`、`topic_expansion`、`paper_seed_expansion` 或 `targeted_ingest` 路由。
- 只读检查 Zotero/Synthesis 覆盖、重复记录、可复用种子和缺口。
- 形成 query lanes、source lanes、纳入/排除标准、语言、材料类型、广度和停止条件。
- 等待用户批准或取消。
- 用户批准前不执行外部搜索、下载或 Zotero 写入。

### 阶段 20：发现轮次

- 按检索计划执行 core、multilingual、seed、gap、identifier 和 version lanes。
- 组合权威、跨领域 metadata、地区/语言索引、机构库、开放获取和公开网络来源。
- 记录实际 query/source attempts、结果、错误和 fallback。
- 建立稳定 candidate identity，处理版本关系和本地重复。
- 在累计候选集上合并新候选和有证据的更新。

### 阶段 30：入库范围

- 分层展示 `ready`、`needs_curation` 和 `lead_only`。
- 用户可以批准 candidate ids、请求聚焦补检或取消。
- 补检保留已有候选并返回阶段 20，随后回到同一个范围审核。
- 只有 `ready` 和具有可解决缺口的 `needs_curation` 可以批准。

阶段 10 和阶段 30 是仅有的用户等待点。

### 阶段 40：研究与载荷准备

主 agent 根据候选数量、语言、来源复杂度和并发能力决定 subagent 分组。一个 subagent 可以处理一个或多个候选，但每篇论文始终保持独立：

- 独立的直接作品身份判断；
- 独立的 metadata 研究；
- 独立的三路线 PDF 探测；
- 独立的 Host payload 输出路径；
- 独立的修复和终态结果。

每篇批准论文必须完成：

1. identifier-first metadata 搜索；
2. 原文题名、完整 creators、日期、容器、材料类型和版本核验；
3. direct-work identity 判断；
4. 权威落地页、开放获取、公开网络搜索三路线 PDF 探测；
5. 合法性、可达性、文件内容和作品身份检查；
6. canonical Zotero Host payload 准备。

metadata-qualified 论文直接写一个单篇 Host payload。没有公开 PDF 时仍写 metadata-only payload；direct-work identity 或最低 metadata 无法确认时记录 `not_attempted`，不替换为相关作品。

subagent 可以在 stdout 报告来源、路线结果和不确定性。主 agent 可以选择汇总内部审计，但该信息不构成阻塞条件，也不进入最终 JSON。

任一 payload 完成后，主 agent 即可立即检查和处理，无需等待其他 subagent。缺失或畸形 payload 只影响对应论文。

### 阶段 70：逐篇入库

只有主 agent 执行 literature-ingest mutation：

1. 检查 candidate、direct-work identity、item type、canonical fields、creators、identifiers、landing/PDF URL 和 collection；
2. 提交一个单篇 payload；
3. 等待 terminal Host response；
4. 保存原始 receipt 并更新该论文 outcome；
5. 完成当前论文后再执行下一篇 mutation。

subagent 研究可以并行，但 Zotero mutation 始终一次一篇。Host response 是 `created`、`existing`、`failed`、item id 和 PDF 附件结果的事实源。

## Metadata 与字段

- 优先使用权威 identifier；无 identifier 时使用权威题名、创建者、年份和材料类型路径。
- 保留正式原文题名和创建者，不用翻译或 romanization 覆盖。
- 摘要写入 `fields.abstractNote`。
- creators 写入 `paper.creators`。
- DOI、ISBN、PMID 和 arXiv 写入 `paper.identifiers`。
- landing page 和 PDF 分别使用 `landingUrl` 与 `pdfUrl`。
- 字段必须与 `itemType` 兼容。
- identifier 未找到但身份和权威 metadata 充分时，可入库并标记 `needsCuration`。

## PDF

三路线按顺序执行：

1. 权威落地页；
2. 合法开放获取来源；
3. 公开网络搜索。

只有较早路线找到合法、公开、可达且身份匹配的 PDF 时，后续路线才能使用 `skipped_after_verified_pdf`。不得使用 paywall 绕过、登录 session、机构代理、验证码绕过、Sci-Hub、LibGen 或来源不明镜像。

未找到 PDF 不阻止 metadata 入库。`pdfStatus: "attached"` 只能来自 Host receipt 的附件确认。

## 状态、恢复与输出

中间 payload 和 receipts 保存在当前运行的 `runtime/` 中；`result/search-ledger.json` 保存 discovery round、批准范围、每篇 payload/receipt 路径和终态摘要。

恢复时逐篇判断：

- 已有 terminal receipt：恢复 outcome，不重复 mutation；
- payload 有效但无 receipt：进入串行入库；
- payload 缺失或畸形：只修复或重新委派该论文；
- identity/metadata unresolved：恢复为 `not_attempted`；
- mutation 是否已生效无法确认：停止后续写入并报告 `execution_blocked`。

普通 paper-specific Host failure 记录为 `failed` 并继续。`host_unavailable`、`approval_denied` 和 `execution_blocked` 属于致命失败，停止后续 mutation 并返回 canceled。

最终 completed 输出只包含：

- discovered、selected、created、existing、failed 和 notAttempted 计数；
- 每篇批准候选的紧凑 outcome；
- `result/search-ledger.json` 路径。

详细 identifiers、URLs、证据、错误和 raw receipts 保留在运行工作区和 ledger，不进入最终 JSON。

## 应用结果

- 新建条目加入 `status:need-markdown`、`status:need-analysis`、`status:need-deep-reading`。
- metadata 仍需整理时加入 `status:need-metadata-curation`。
- 本轮未取得 PDF 时加入 `status:need-fulltext`。
- 复用已有条目时不重新排入完整处理流程，只补充本轮明确需要的 metadata/fulltext 状态。
- 状态标签由插件治理词表提供；本工作流只更新条目上的标签实例。
- 标签更新失败属于部分成功，不回滚已经完成的 Zotero 入库。

## 依赖

- SkillRunner interactive 后端；
- 支持联网搜索的模型；
- Zotero Host Bridge 写权限。
