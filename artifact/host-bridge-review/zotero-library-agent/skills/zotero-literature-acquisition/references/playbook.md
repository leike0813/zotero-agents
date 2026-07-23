# 文献采集操作手册

## 搜索边界与候选项

将文献需求转化为可审阅搜索 plan：

- 研究概念和可接受同义词；
- 纳入与排除标准；
- 出版时期、语言、venue、文档类型或来源限制；
- 期望广度、停止规则与排序偏好；
- 结果是候选报告、Zotero import、附件获取还是可分析集合。

若合理选择会实质改变哪些作品符合条件，应请求澄清；否则执行有界搜索并说明所搜来源与限制。保留 DOI、ISBN、PMID、arXiv ID、URL 或 provider record ID 等外部标识符，以及足以解释纳入理由的书目字段。

外部结果始终只是候选项。声称某作品新增或不存在前，先搜索实时 Zotero 文献库。独立记录 provider provenance 与 Zotero 条目身份，以便后续元数据分歧仍然可见。

## 重复项与身份检查

比较候选项时先使用最强可用标识符，再比较作者、归一化标题、年份、venue、版本和文档类型。实时条目读取确认相关字段前，将可能匹配视为备选项。不同版次、译本、版本、预印本与正式发表文章可能相关，却不一定是可合并重复项。

对每个可能重复项，报告：

- 每个实时 Zotero ref 与外部候选 ID；
- 匹配与冲突字段；
- 可见时附件、笔记、分类、标签、关系与工作流 artifact 影响；
- 建议保留项或共存结果；
- 需要人工决策的不确定性。

重复项评估不授权 merge、delete、relink 或元数据覆盖。provider 元数据与已策展文献库字段冲突时，保留两个来源，并把任何修正路由给 curation。

## 获取与 readiness

| 结果 | 所需预检 | 完成证据 |
| --- | --- | --- |
| 候选短名单 | 明确标准与当前文献库比较 | 候选 provenance、理由及未解决身份字段 |
| Import 已知参考文献 | 目标 library/collection、重复检查、import payload 审阅 | 实时 item ref，以及请求时的 collection membership |
| 文献搜索与 ingest | 已描述工作流、已校验 selection/options 与 provider profile | 终态 run 加成功 ingest 的实时条目与 provenance |
| 附件获取 | 当前条目/附件/readiness 状态及允许来源 | 实时附件记录与已验证交付文件元数据 |
| 去重 | 完整记录及已审阅 survivor effect | 持久 receipt 加 merge 后或共存的实时状态 |
| 分析准备 | 已识别必要 PDF/Markdown/分析输入 | 每个成功条目的已验证 readiness 状态 |

选择修复前，使用 readiness 读取识别缺失 PDF、source Markdown 或分析 artifact。缺失输入列表是诊断结果，不是下载或附加的权限。涉及本地或交付文件时，验证 checksum 与大小，必要时通过声明机制上传，并从父条目确认生成的附件。

全文不可用时，候选评估仍可完成；附件获取则不能。保留许可/访问不确定性，不得声称搜索 provider 授予其未声明的再利用权。

## 工作流与写权限

请求需要搜索 provider 交互、多步 ingest、provenance 捕获或可复用业务逻辑时，优先使用声明的获取工作流。描述其当前 requirements 与执行模式。对于 Zotero 托管执行，分别校验工作流选项与 provider profile；只有用户请求获取且 Zotero 端 approval 路径可用后才提交。

只有目标与期望 effect 已具体明确时才使用直接语义 mutation，例如 import 已审阅 payload，或把已验证文件附加到已知条目。呈现确切目标 library/collection 与重复 effect。执行一个已批准 scope，并保留 operation 或 workflow handle。

显式 provider profile 只适用于当前 submission。不得与连接 profile 混淆，不得为 Agent 自主 handoff 静默复用，也不得未经校验就假设已配置 backend 兼容。除非用户或已批准政策明确允许有界并发，否则默认串行提交工作流。

## 搜索计划模板

选择能够公开决策边界的最小模板：

### 探索性领域扫描

```text
question:
concept groups and synonyms:
sources/providers:
date/language/type limits:
ranking preference:
review budget:
stop rule:
output: landscape report | candidate shortlist
```

在术语与经典文献尚不确定时使用。记录每个候选项由哪个 concept group 产生，以便后续收窄过程可解释。

### 定向证据搜索

```text
claim or subquestion:
required study/document characteristics:
must-include and must-exclude signals:
known seed works:
identifier and citation expansion rules:
stop rule:
output: candidate shortlist | reviewed import set
```

在问题稳定且误报控制比广度更重要时使用。每个被拒候选项保留简洁的排除理由。

### 已知记录获取

```text
external identifiers or complete citations:
target library and collection:
duplicate policy to review:
required attachments:
metadata source priority:
output: import proposal | analysis-ready set
```

对有限且已声明的列表使用。除非用户另行请求相关文献，否则不要扩展发现范围。

## 候选决策记录

为每个候选项维护一份决策记录，使搜索结果、Zotero 身份与获取结果始终可区分：

```text
candidate_id:
provider_and_query:
bibliographic_identity:
external_identifiers:
inclusion_decision: include | exclude | unresolved
rationale:
live_zotero_matches:
identity_conflicts:
requested_destination:
attachment_expectation:
next_action: report | import-proposal | acquire-file | human-review
```

对于存在可能 Zotero 匹配的已纳入候选项，在同一记录中保留 candidate 与实时 item ref，但不得折叠为一个身份。对于排除项，只保存说明决策并避免立即重复发现所需的字段。对于未解决项，明确缺失的判别信息——edition、author、year、document type 或 identifier——而不要给出没有决策后果的置信分数。

批次摘要应从这些记录推导：included-new、included-existing、excluded、unresolved、imported、attached 与 failed。摘要绝不能取代重试或重复项审阅所需的逐候选 provenance。

## 批次与部分结果矩阵

| 观察到的批次状态 | 稳定完成的范围 | 剩余范围 | 安全下一步 |
| --- | --- | --- | --- |
| 搜索完成；未请求写入 | 已审阅 candidate record | 仅未解决候选项 | 请求缺失判别信息，或带限制完成 |
| 部分候选项已经存在 | 已确认实时匹配 | 新候选与歧义候选 | 从 import 中排除已有 item；审阅歧义记录 |
| Import 部分成功 | 已实时验证的新 item ref | 失败或未验证的 candidate ID | 根据当前状态重建 residual proposal |
| Item 已 import，但 collection 放置失败 | 已验证 item 创建 | 缺失 membership | 仅提出 collection delta |
| Attachment 获取部分成功 | 已验证 child attachment ref | 仍缺少所需文件的 item | 重新读取 readiness，仅重试缺失文件 |
| Workflow 已终止但输出缺失 | Run receipt 与任何已找到实时结果 | 承诺的 item、attachment 或 provenance | 保留诊断；解决重复风险前不得重新提交 |
| 用户或 Zotero 拒绝写入 | Candidate report 与 preflight 仍有效 | 全部被拒 mutation scope | 返回报告；再次写入前需要新请求 |

当 target collection、重复项状态、provider input 或预期 effect 发生变化时，剩余批次需要新的 preflight。即使后续阶段失败，也要保留成功的实时身份，因为重跑原始批次可能产生重复 item 或 attachment。

## 恢复与易错边界

- 找到有用候选项但无写权限时，返回报告并保持 Zotero 不变。
- 目标 collection 或 library 有歧义时，在 import 前取消；不得为方便而选择当前 UI 位置。
- import 仅部分成功时，验证并返回成功 item ref，保留失败候选 provenance，且只恢复失败 scope。
- 工作流终止但缺少预期条目或附件时，报告缺失交付物，不得把 run 完成视为获取完成。
- 附件访问过期时，从所属条目或来源获取新 handle；绝不能复用猜测的存储路径。
- 获取后出现元数据冲突时，保留已 import 记录，并把建议修正路由给 curation，不得静默修复。
- 重复项 effect 比已审阅 proposal 更广时，在 mutation 前停止并呈现新发现后果。
