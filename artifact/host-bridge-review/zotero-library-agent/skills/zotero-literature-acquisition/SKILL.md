---
name: zotero-literature-acquisition
description: 为 Zotero 文献库发现、评估并采集文献。当用户要求为当前研究任务查找、导入、准备文献或进行去重时使用。
---

# Zotero 文献采集

## 目标

将有边界的文献需求转化为可追溯候选评估，或经实时验证且获批的获取结果，同时保留外部 provenance、Zotero 身份、重复状态与附件 readiness。

## 输入

- 研究问题、纳入/排除标准、日期或来源限制，以及期望结果边界。
- 请求包含获取时的目标 Zotero library、collection 或当前 selection。
- 外部候选项元数据与 provenance，以及 import、附件获取、merge、relink 或其他写入的当前授权。

## 自然语言输入理解

将“查找”、“收集”、“获取”、“导入”和“准备”视为不同的可能结果，直到用户意图受到限制。

|用户措辞 |候选项结果 |材料澄清|
| --- | --- | --- |
| “找到一些关于 X 的论文”|候选项报告|时间窗口、结果范围、源覆盖范围、语言和停止规则 |
| “查找 X 上的最新作品”|候选项报告|用具体的日期窗口定义“最新”以及预印本是否计数 |
| “收集有关X的研究资料”|候选项报告或采集|询问用户是否只需要引用、可访问的全文或 Zotero 导入 |
| “将这些论文添加到我的项目中” |进口和收集任务|解决目标库/集合、重复项、版本和附件期望 |
| “获取 PDF”|附件获取|建立合法来源、访问边界、确切项目和可接受的丢失文件 |
| “对这些结果进行重复数据删除” |候选比较或整理|确定用户是否需要报告或批准的合并/删除决定 |
| “查找论文并总结它们” |采集后进行分析 |在进行分析之前完成并验证源集 |

捕获：

- 研究概念和同义词；
- 明确的纳入和排除标准；
- 日期、语言、地点、出版物类型和地理限制；
- 要搜索的外部资源或数据库；
- 期望的计数或基于证据的停止规则；
- 仅候选、导入、附件就绪或分析就绪的可交付成果；
- 请求写入时的目标库和集合；
- 处理预印本/已出版、翻译/原创、会议/期刊和重复关系。

询问任何缺失值何时会实质上改变候选集、目标状态、provider成本、许可边界或破坏性重复决策。不要询问不会改变有限结果的偏好。

安全默认值：

- 生成候选报告而不是导入；
- 保留外部记录作为候选记录，直到实时重复检查完成；
- 包括书目元数据和出处，但不承诺全文可用性；
- 使用向用户声明的适度结果范围；
- 保留不同的版本，除非有强有力的证据证明存在重复。

目标库/集合、重复幸存者、元数据覆盖、受限附件检索、合并、删除或重新链接没有安全默认值。在该效果发生之前停止并获得当前的决定。

## 工作流

### 确立候选边界

1. 将请求转化为明确概念、纳入与排除标准、日期/语言/venue/source 约束、所需广度、停止规则与预期结果：候选报告、import、attachment 获取、去重或分析就绪集合。
2. 只有某项选择会实质改变合格文献、目标 library/collection 或请求写入效果时，才要求澄清。
3. 搜索请求的外部来源，并记录 identifier、书目事实、provider provenance、搜索限制与纳入理由。所有外部结果都保持 candidate 状态。

### 解析实时身份与重复项

4. 对每个保留候选项搜索当前 Zotero 文献库。优先比较强 identifier，再比较 title、author、year、venue、edition、translation、preprint 与 publication 关系。
5. 读取可能的实时匹配项，并检查其 attachment、collection membership、note、tag 与获取决策所需的 readiness 事实。不得把相关版本直接折叠为重复项决策。
6. 仅候选项工作返回有边界评估，并列出未解决的身份或访问问题。不得虚构写入阶段。

### 提议、授权并验证

7. 对请求写入，呈现精确 target、candidate set、重复项影响、metadata 来源、attachment 来源、collection 影响、预期输出及最小可审阅批次。
8. 需要 provider 交互或可复用多步 ingest 时，选择已经描述的 acquisition workflow；只有身份与期望效果均已明确时才使用直接语义 operation。分别校验 workflow option 与 provider profile。
9. 将当前获批范围执行一次。重新读取每个已获取 item、collection membership、重复项结果或 attachment 状态，并区分成功、失败与未尝试 candidate。
10. 返回 `zotero-library-task.result.v1`，包含 candidate provenance，或持久 operation/workflow receipt 加实时验证。

### 呈现候选项并记录决策

对于仅限候选项的工作，请报告：

1. 搜索概念、来源、日期、语言和出版物过滤器。
2. 查询限制和停止规则。
3. 每个候选项都保留了强有力的标识符、书目事实、出处和纳入理由。
4. 当前 Zotero 匹配状态：新、可能重复、相关版本、不明确或已存在。
5. 请求时的附件/访问状态。
6. 排除候选项和排除材料的原因。

对于写入，请提供一个可审查的批次，其中包含：

- 准确的候选项和目标身份；
- 提议的元数据源；
- 重复关系和幸存者选择；
- 要求采集效果；
- 附件来源和预期准备情况；
- 将保持不变的项目；
- workflow 或写入变更路径；
- 批准点和写后验证。

不要将未解决的候选项合并到已批准的批次中。执行后，将每个候选者分类为已导入且已验证、已存在且未更改、失败、未尝试、不明确或正在等待新决定。

### 采集完成清单

搜索边界：

- 概念、排除、日期、语言、地点、来源和停止规则均被记录。
- 该报告将搜索来源与未涵盖的来源区分开来。
- 每个保留的候选项都有出处和入选原因。
- 结果计数并不意味着超出声明范围的详尽性。

身份：

- 在模糊元数据之前比较强标识符。
- 对可能的重复项进行了现场检查。
- 除非支持重复的决定，否则相关版本仍然不同。
- 现有 Zotero 条目、外部候选项和导入项目保留单独的标识。

编写准备：

- 目标库和集合是明确的。
- 元数据和附件源是已知的。
- 重复效果和幸存者选择是可审查的。
- workflow 选项和 provider profile 单独验证。
- 该批次足够小，可以进行检查和恢复。

验证：

- 每个批准的项目在操作后都会重新读取。
- 收藏归属关系已实时确认。
- 检查所需的附件状态，而不是从下载或运行状态推断。
- 失败和未尝试的候选项仍保留在结果中。

有惊无险：

- 搜索成功并不等于导入成功。
- 下载的字节不是 Zotero 附件。
- DOI 相等性可以识别可能的重复项，但不会选择幸存者。
- 相似的头衔和年份并不能证明重复的身份。
- provider元数据的排名不会自动超过精选的文献库数据。
- 终端 workflow 不证明所请求的收集或附件效果。

如果完成的结果只是一份候选项报告，那就直白地说出来。不要将其表述为“收集到 Zotero”。

## 硬约束

- 没有当前授权以及 Zotero 中显示的必要审批，不得导入、合并、删除、重新链接或获取附件。
- 在对照实时文献库检查身份和重复状态前，将外部发现结果视为候选。
- 不得对现有来源无法支持的相关性、许可或元数据作出断言。
- 获取范围必须限定在请求内；不要创建长期监视列表或后台采集任务。
- 备选项 effect 存在实质差异时，不得静默选择重复项 survivor、目标 collection、版本、附件来源或元数据覆盖。
- 不得把成功搜索、已接受请求、已下载文件或终态工作流视为可用 Zotero 条目和附件已存在的证据。
- 未经单独批准的整理决策，不得用冲突的 provider 元数据替换已整理文献库元数据。

## LLM 与工具职责

LLM 负责搜索策略、纳入判断、provenance 比较、重复评估、readiness 解释与权限检查。随附 CLI 和 runner 负责精确 argv、实时 Zotero 调用、工作流与 mutation 校验、approval 传输、handle 及结果 schema 校验。不得虚构 handle、receipt、获取状态、许可或重复处理结果。

## 结果契约

返回与 `assets/output.schema.json` 匹配的一项业务 JSON 对象。

要求：

- `schema`：`zotero-library-task.result.v1`。
- `status`：`completed`、`canceled` 或`failed`。
- `summary`：描述候选边界或经过验证的采集结果，包括计数和材料限制。

可选：

- `evidence`是一个可选数组；每个条目需要`kind`和`ref`；将其用于外部出处、实时 Zotero 匹配、获取的项目 refs、集合 refs、附件 refs、workflow 运行或操作 receipts。仅在已知时添加 `locator` 和 `description`。
- `artifacts`是一个可选数组；每个条目都需要现有的`path`和`role`，例如`candidate-report`或`duplicate-review`；已知时添加`mediaType`。
- `diagnostics`是一个可选数组；每个条目都需要`code`和`message`来解决未解决的重复、无法访问的来源、缺少目标权限、部分批次结果或其他稳定限制。

状态规则：

- `completed`：满足声明的候选搜索边界，或者对每个批准的获取效果进行实时验证。
- `canceled`：在写入之前缺少标准、目标、重复选择、附件权限或其他重要决定。
- `failed`：尝试的provider、workflow、导入、附件或验证路径无法完成声明的目标。

最小结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Prepared a bounded report of twelve candidates, including live duplicate status, without importing any item."
}
```

不要发明`partial`。当已批准批次的一部分成功但请求的整体采集未成功时，请使用`failed`，包括成功的实时refs作为证据，并诊断失败和未尝试的候选者。

Runner 的 `__SKILL_DONE__` 标记是传输元数据，而不是此业务对象中的字段。仅将挂起分支用于具体的用户决策；最终输出不包含 Markdown 栅栏、解释性前缀或第二个 JSON 对象。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象，必需字段为 `schema`、`status` 和 `summary`。已满足声明搜索边界的候选评估，或条目/collection/附件状态经实时验证的获批结果，使用 `completed`。缺少标准、目标选择、重复项决策或写权限时使用 `canceled`；已尝试操作无法安全完成时使用 `failed`。

## 失败处理

保留候选 provenance、重复项备选方案、目标 ref、已接受 workflow 或 operation handle、approval receipt 与结构化失败。获取部分成功时，分别返回成功条目与失败或未尝试候选项。遭拒或存在歧义后，在已准备选项处停止；不得切换到其他 import、mutation、附件或工作流路径。

## 参考资料

当任务需要详细 search-plan 模板、identifier/version 比较、重复项决策记录、licensing 或 provider 边界分析、workflow/provider 选择、attachment-readiness 路径，或批次与部分结果恢复时，查阅[完整获取操作手册](references/playbook.md)。
