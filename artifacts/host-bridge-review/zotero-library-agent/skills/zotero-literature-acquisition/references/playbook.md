# 文献获取 Playbook

## 搜索边界与候选

将文献需求转化为可审查的搜索计划：

- 研究概念与可接受的同义词；
- 纳入与排除标准；
- 出版时期、语言、出处、文献类型或来源约束；
- 期望广度、停止规则与排序偏好；
- 无论成果是候选报告、Zotero 导入、attachment 获取还是可分析集。

当可能的选择会实质改变哪些作品符合条件时，先请求澄清。否则执行有界搜索并说明所搜索的来源与限制。保留 DOI、ISBN、PMID、arXiv ID、URL 或 provider record ID 等外部标识符，连同足够解释纳入理由的书目字段。

外部结果仍然是候选。在说某作品是新的或不存在的之前，先搜索实时 Zotero 库。独立于 Zotero item 身份记录 provider 来源信息，使后续元数据分歧保持可见。

## 重复与身份检查

先用最强的可用标识符比较候选，然后是作者、标题规范化、年份、出处、版本与文献类型。在实时 item 读取确认相关字段前，将可能匹配当作替代项。不同版本、译本、版本、预印本与已发表文章可能相关但不一定可合并为重复。

对每个可能的重复，报告：

- 每个实时 Zotero ref 与外部候选 ID；
- 匹配与冲突的字段；
- 可见时的 attachment、note、collection、tag、关系与 workflow-artifact 影响；
- 拟议的幸存者或共存结果；
- 需要人类决定的不确定性。

重复评估不授权 merge、删除、relink 或元数据覆盖。若 provider 元数据与策展的库字段冲突，保留两个来源并将任何修正导向策展。

## 获取与就绪

| 结果 | 必需预检 | 完成证据 |
| --- | --- | --- |
| 候选短名单 | 显式标准与当前库比较 | 候选来源信息、理由与未解决的身份字段 |
| 导入已知参考文献 | 目标库/collection、重复检查、import payload 审查 | 实时 item refs，请求时含 collection 成员资格 |
| 文献搜索与摄取 | 描述过的 workflow、已验证的选择/选项与 provider profile | 终态 run 加成功摄取的实时 item 与来源信息 |
| Attachment 获取 | 当前 item/attachment/就绪度状态与允许的来源 | 实时 attachment 记录与已验证的投递文件元数据 |
| 去重 | 完整记录与已审查的幸存者效果 | 持久 receipt 加实时合并后或共存状态 |
| 分析准备 | 识别必需的 PDF/Markdown/分析输入 | 每个成功 item 的已验证就绪状态 |

在选择补救措施前，使用就绪读取识别缺失的 PDF、source Markdown 或分析 artifact。缺失输入清单是诊断结果，而非下载或附加的许可。当涉及本地或已交付文件时，验证其校验和与大小，需要时通过声明的机制上传，并从父级 item 确认生成的附件。

若全文不可用，候选评估仍可完成；attachment 获取不能。保留许可/访问不确定性，不要声称搜索 provider 授予了其未声明的复用权。

## Workflow 与写入权限

当请求需要搜索 provider 交互、多步摄取、来源捕获或可复用业务逻辑时，优先使用声明的获取 workflow。描述其当前要求与执行模式。对于 Zotero 管理的执行，分别校验 workflow options 与 provider profile，并且只在用户请求了获取且 Zotero 侧 approval 路径可用之后才提交。

仅当目标与期望效果已经具体时才使用直接语义 mutation，例如导入已审阅 payload 或将已验证文件附加到已知 item。呈现精确的目标 library/collection 与重复效果。执行一个已批准作用域并保留其 operation 或 workflow 句柄。

显式的 provider profile 仅适用于当前提交。不要将其与连接 profile 混淆、为自有的 handoff 静默复用，或未经验证就假定配置的 backend 兼容。除非用户或已批准的策略明确允许有界并发，否则默认串行 workflow 提交。

对多候选的 Zotero 受管理获取，将已审查的有界并发传给当前 workflow 提交，并让原生 Zotero 队列拥有待处理单元的排序与准入。当宿主将工作排队时保留 `submissionId`，将每个已准入任务与其候选身份关联，且仅对仍待处理的单元使用队列取消。不得持久化第二个候选队列、在本地预留条目，或重放准入结果不确定的单元。

完成仍然是候选特定的：检查每个真实 run，然后验证每个成功摄取的 Zotero item、来源记录、所请求的 collection 成员关系与附件状态。聚合提交完成不证明每个候选都被摄取，已取消或失败的单元必须保持可见，而不是从获取报告中消失。

## 搜索计划模板

选择暴露决策边界的最小模板：

### 探索性字段扫描

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

当词汇与规范作品不确定时使用此方法。记录每个候选由哪个概念组产生，使后续收窄可以解释。

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

问题稳定且误报比广度更重要时使用本项。被拒候选保留简洁的排除原因。

### 已知记录获取

```text
external identifiers or complete citations:
target library and collection:
duplicate policy to review:
required attachments:
metadata source priority:
output: import proposal | analysis-ready set
```

对有限的已声明列表使用此方式。除非用户另行要求相关工作，否则不要添加发现扩展。

## 候选决策记录

为每个候选维护一条决策记录，使搜索结果、Zotero identity 与 acquisition 结果保持可分离：

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

对于具有可能 Zotero 匹配的纳入候选，将候选与实时 item refs 保存在同一记录中，但不要把它们合并成一个身份。对于排除项，只存储解释该决定与防止立即重新发现所需的字段。对于未解决的情况，指明缺失的判别信息——版本、作者、年份、文献类型或标识符——而不是在无决策后果的情况下给出置信度分数。

批次摘要应来源于这些记录：included-new、included-existing、excluded、unresolved、imported、attached 与 failed。摘要绝不替代重试或重复审阅所需的逐候选来源记录。

## 批次与部分结果矩阵

| 观察到的批次状态 | 稳定的已完成范围 | 剩余范围 | 安全下一步 |
| --- | --- | --- | --- |
| 搜索完成；未请求写入 | 已审阅的候选记录 | 仅未解析候选 | 询问缺失的判别信息，或带局限收尾 |
| 一些候选已存在 | 已确认的实时匹配 | 新候选与存疑候选 | 从导入中排除既有 items；审查存疑记录 |
| 导入部分成功 | 实时验证的新 item refs | 失败或未验证的候选 ID | 从当前状态重建残余 proposal |
| Item 已导入但 collection 放置失败 | 已验证的 item 创建 | 缺失的成员关系 | 只提出 collection delta |
| Attachment 获取部分成功 | 已验证的子 attachment 引用 | Item 仍缺必需文件 | 重新读取就绪度，仅重试缺失文件 |
| Workflow 已终态但输出缺失 | Run receipt 及找到的任何实时结果 | 承诺的 items、attachments 或出处 | 保留诊断；在重复风险解决前不要重新提交 |
| 用户或 Zotero 拒绝写入 | 候选报告与预检仍然有效 | 整个被拒变更范围 | 返回报告；再次写入前要求新请求 |

当目标 collection、重复状态、provider 输入或预期效果改变时，残余批次会获得新的预检。即使后续阶段失败也保留成功的实时身份，因为重跑原始批次可能创建重复项或重复附件。

## 恢复与接近命中

- 若在无写入 authority 的情况下找到有用候选，返回报告并保持 Zotero 不变。
- 若目标 collection 或 library 不明，在导入前取消；不要为了方便选择当前 UI 位置。
- 若导入只对批次的一部分成功，验证并返回成功的 item refs，保留失败候选的来源记录，且只恢复失败的范围。
- 若 workflow 终止但预期 item 或附件缺失，报告缺失的可交付物，而不是把 run 完成当作获取。
- 若附件访问过期，从所属 item 或来源获取新 handle；绝不复用猜测的存储路径。
- 若获取后出现元数据冲突，保留导入的记录并把拟议修正路由到策展，而不是悄悄修复它。
- 若重复影响比已审阅的提案更广，在 mutation 前停止，并呈报新发现的后果。
## 端到端决策轨迹

这些轨迹展示一个有界的 acquisition 请求如何从人类措辞走向候选、实时重复决策、权限与验证。

### Trace 1："找 X 的近期论文"

用户表述：

> 找一些关于检索增强科学 Agent 的近期论文。

歧义：

- “recent”没有日期窗口；
- “some”没有结果边界；
- 外部来源与语言未指明；
- 用户未请求导入；
- 预印本与已发表版本可能重叠。

澄清/默认：

当时效性实质控制纳入时，询问日期窗口。若用户接受默认，披露具体的窗口、结果上限、语言策略、已搜索来源与仅候选的结果。

候选计划：

1. 将研究概念扩展为声明的搜索词。
2. 搜索所指名的来源。
3. 记录查询限制与 provider 来源信息。
4. 保留符合纳入规则的候选。
5. 比较强标识符与版本。
6. 为每个保留候选搜索实时 Zotero library。
7. 标记每个为新的、已存在的、可能重复的、相关版本或有歧义的。

禁止：

- 因用户说“find”而导入；
- 隐藏不可用的全文；
- 没有版本决定就把 preprint 与期刊文章称为重复项；
- 把结果描述为超出声明来源与停止规则的穷举。

面向人的结果：

> 我从声明的 2024–2026 时间窗口与来源准备了十二个候选。其中四个已存在于当前 Zotero 库中，两个是相关的 preprint/已发表成对版本，六个看起来是新的。尚未导入任何内容。

已完成结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Prepared twelve bounded candidates with provenance and current Zotero duplicate status; no item was imported.",
  "artifacts": [
    {
      "path": "/workspace/candidate-report.md",
      "role": "candidate-report",
      "mediaType": "text/markdown"
    }
  ]
}
```

### Trace 2：将审阅批次导入 collection

用户表述：

> 将这些论文添加到我的 "Agent Research" collection，并在可能时获取 PDF。

已解析输入：

- 确切的候选记录；
- 目标 library 与 collection 身份；
- 重复备选；
- 元数据来源；
- 合法 attachment 来源；
- 最小的可审查批次。

每个候选的 proposal：

- 强标识符与书目版本；
- 当前 Zotero 匹配；
- 导入对复用决策；
- collection 成员关系效果；
- 附件来源与预期就绪状态；
- 元数据冲突；
- 未修改字段；
- approval 与验证路径。

授权：

1. 显示精确批次。
2. 获取导入与 collection 变更的当前权限。
3. 未经单独批准，把 merge、overwrite、delete 与 relink 排除在批次之外。
4. 若使用 workflow，则校验 workflow options 与 provider profile。

执行：

1. 提交或应用已批准的批次一次。
2. 保留 operation/workflow handle。
3. 重读每个结果 item。
4. 验证 collection 成员关系。
5. 单独检查 attachment 状态。
6. 将成功、已存在、失败、未尝试与存疑候选分类。

部分结果：

- 七个 items 已导入或复用并实时核验。
- 一个 provider 请求在 item 创建前失败。
- 两个 PDF 不可用。

结果决策：

- 请求的整体批次未完全成功，因此使用 `failed`。
- 保留七个成功 item refs。
- 诊断一个失败的获取与两个 attachment 缺口。
- 不要重放整个批次。

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "Verified seven of eight requested items in the target collection; one acquisition failed and two verified items still lack requested attachments.",
  "evidence": [
    {
      "kind": "collection",
      "ref": {
        "libraryId": 1,
        "key": "COLLECT1"
      },
      "description": "Target collection re-read after the approved batch."
    }
  ],
  "diagnostics": [
    {
      "code": "residual_acquisition",
      "message": "One candidate was not created and two attachment requests remain unavailable."
    }
  ]
}
```

恢复：

- 仅为失败候选准备残余提议。
- 将缺失附件视为与缺失书目 items 不同。
- 若提出不同的来源或元数据覆盖，获取新权限。

### Trace 3：provider 发现后的重复歧义

用户表述：

> 导入最佳版本并移除重复。

观察到的候选：

- 一篇已在 Zotero 中且带 annotations 的会议论文；
- 来自 provider 的一个期刊扩展；
- 相似标题与重叠作者；
- 不同的 DOI 与额外实验。

决策：

- 这些可能是相关版本而非重复。
- “最佳”是用户偏好，不是身份事实。
- 移除现有 item 是破坏性操作，可能影响 annotations、collections、relations 与 attachments。

澄清：

> 该库 item 与 provider 结果似乎是标识符不同的会议版与期刊版。您想同时保留两者、导入期刊版并链接它们，还是审查破坏性合并/移除 proposal？

未提供决策时的已取消结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "canceled",
  "summary": "Stopped before import or removal because the two records are related versions and no survivor or linking decision was provided.",
  "evidence": [
    {
      "kind": "zotero-item",
      "ref": {
        "libraryId": 1,
        "key": "CONF2024"
      },
      "description": "Existing annotated conference version."
    }
  ],
  "diagnostics": [
    {
      "code": "version_decision_required",
      "message": "Choose whether to keep, link, or separately review destructive consolidation."
    }
  ]
}
```

不安全的备选方案：

- 因为更新而选择期刊版本；
- 在保留 annotations 前删除会议记录；
- 用 provider 字段覆盖精选元数据；
- 把标题相似当作重复证明。

恢复：

- 用户决定后重新读取两个身份与受影响的子级。
- 将破坏性整合导向策展提议。

## 对话与记录模式

候选报告语言：

> 搜索覆盖了声明的来源并在商定界限处停止。报告区分外部候选、当前 Zotero 匹配、相关版本与未解决身份。

写入 proposal 语言：

> 本批次将创建六个 items、复用三个既有 items、把全部九个加入指定的 collection，并尝试从所列来源附加 attachments。它不会合并、删除或覆盖冲突的策展元数据。

Attachment 限制语言：

> 书目 item 已实时验证，但未获取到可用 attachment。我没有将其标记为分析就绪。

残余恢复用语：

> 第一批创建了五项。残余提案只含两个失败候选，不重放已验证的成功。

每个候选决策记录都应保留：

- 外部标识符与溯源；
- 已搜索来源与查询边界；
- 收录理由；
- 实时 Zotero 候选；
- 重复/版本判断；
- 目标效果；
- attachment 状态；
- authority 状态；
- 最终实时核实或诊断。

不要把“已存在”、“新导入”、“相关版本”与“获取失败”折叠成一个已获取计数。
