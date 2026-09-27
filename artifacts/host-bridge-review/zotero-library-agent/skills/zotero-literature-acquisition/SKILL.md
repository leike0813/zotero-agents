---
name: zotero-literature-acquisition
描述：为 Zotero 库发现、评估并获取文献。当用户要求为当前研究任务查找、导入、准备或去重文献时使用。
---

# Zotero 文献获取

## 目标

将有界的文献需求转化为可追踪的候选评估或实时验证且已批准的 acquisition 成果，同时保留外部来源、Zotero identity、重复状态与 attachment 就绪度。

## 输入

- 研究问题、纳入/排除标准、日期或来源约束，以及期望的结果边界。
- 当请求包含 acquisition 时，以目标 Zotero library、collection 或当前选择为目标。
- 外部候选元数据与溯源，以及导入、附件检索、合并、重新链接或其他写入的当前 authority。

## 自然语言输入

在用户意图受限前，将“find”“collect”“get”“import”与“prepare”视为不同的可能结果。

| 用户措辞 | 候选结果 | 实质性澄清 |
| --- | --- | --- |
| “找一些关于 X 的论文” | 候选报告 | 时间窗口、结果上界、来源覆盖、语言与停止规则 |
| “找找 X 的最新工作” | 候选报告 | 用具体日期窗口定义“最新”，并说明预印本是否计入 |
| “收集关于 X 的研究材料” | 候选报告或获取 | 询问用户只要引文、可访问全文还是 Zotero 导入 |
| "Add these papers to my project"（把这些论文添加到我的项目） | 导入与 collection 指派 | 解析目标 library/collection、重复、版本与 attachment 预期 |
| “获取 PDF” | Attachment 获取 | 确立合法来源、访问边界、确切 items 与可接受的缺失文件 |
| “对这些结果去重” | 候选比较或整理 | 确定用户想要报告还是已批准的合并/删除决定 |
| "Find papers and summarize them"（查找论文并总结） | Acquisition 后接 analysis | 在交给 analysis 前补全并验证源集 |

捕获：

- 研究概念与同义词；
- 显式纳入与排除标准；
- 日期、语言、venue、出版类型与地域约束；
- 要搜索的外部来源或数据库；
- 期望的计数或基于证据的停止规则；
- 仅候选、导入、可附加或可分析的交付物；
- 请求写入时的目标库与 collection；
- 预印本/已发表、译本/原版、会议/期刊与重复关系的处理。

当任何缺失值会实质改变候选集、目标状态、provider 成本、许可边界或破坏性重复决策时提问。不要问不改变有界结果的偏好。

安全默认值：

- 产出候选报告而非导入；
- 在实时重复检查完成前，把外部记录保留为候选；
- 包含书目元数据与来源，但不要承诺全文可用性；
- 向用户声明适度的结果界限；
- 保留不同版本，除非有强证据确立重复。

对目标库/collection、重复幸存者、元数据覆盖、受限附件检索、合并、删除或重新链接没有安全默认。在该效果之前停下并获取当前决策。

## 工作流

### 确立候选边界

1. 将请求转化为显式概念、收录与排除标准、日期/语言/venue/来源约束、期望广度、停止规则与预期成果：候选报告、导入、attachment 获取、去重或可分析集。
2. 只澄清会实质改变哪些作品合格、目标 library/collection 或所请求写入影响的抉择。
3. 搜索所请求的外部来源，并记录标识符、书目事实、provider 来源、搜索限制与纳入理由。让每个外部结果保持候选状态。

### 解析实时身份与重复项

4. 为每个保留候选搜索当前 Zotero 库。先比较强标识符，然后是标题、作者、年份、出处、版本、译本、预印本与出版关系。
5. 读取可能的实时匹配，并检查其 attachments、collection 成员关系、notes、tags 与获取决定所需的就绪事实。不要把相关版本合并成重复决定。
6. 对于仅候选的工作，返回带未解决身份或访问问题的有界评估。不要制造写入阶段。

### 提议、授权并核实

7. 对于请求的写入，呈报确切目标、候选集、重复影响、元数据来源、attachment 来源、collection 影响、预期输出与最小的可审阅批次。
8. 为 provider 交互或可复用的多步 ingest 选择有描述的获取 workflow；仅当身份与预期效果已经具体时才使用直接语义 operation。分别验证 workflow 选项与 provider profile。
9. 执行当前已批准的范围一次。重新读取每个获取的 item、collection 成员关系、重复结果或附件状态，并保持成功、失败与未尝试的候选分开。
10. 返回 `zotero-library-task.result.v1`，带候选出处或持久 operation/workflow receipt 及实时验证。

对于单篇论文的 ingest，将书目 item 与显式请求的 collection 成员关系视为必需完成证据。命中的 item 保留其精选元数据；应检查其身份与成员关系，而不是假定传入的 provider 字段已替换它。若本次 invocation 创建了 item 之后必需 collection 成员关系失败，只回滚本次 invocation 创建的对象与成员关系变更，绝不删除被复用的 item 或先前已存在的成员关系。返回 failed/compensated 核心结果，而不是报告 ingest 成功。将 PDF 与 landing-URL 的补充与核心结果分开报告。干净的附件失败可以保留成功的核心 ingest，但残留或不确定的写入需要返回的修复或对账结果。调查该结果时保留原始 operation 身份，并在尝试任何残余获取前获得新的 authority。

### 呈报候选与写入决策

对仅候选工作，报告：

1. 搜索概念、来源、日期、语言与出版筛选。
2. 查询限制与停止规则。
3. 每个保留候选的强标识符、书目事实、来源与纳入理由。
4. 当前 Zotero 匹配状态：新增、疑似重复、相关版本、含混或已存在。
5. 在请求时的附件/访问状态。
6. 被排除的候选与重要的排除理由。

对于写入，呈现一份可审查批次，包含：

- 确切候选与目标身份；
- 拟议的元数据来源；
- 重复关系与幸存者选择；
- 请求的 collection 效果；
- 附件来源与预期就绪状态；
- 保持不变的 items；
- workflow 或 mutation 路径；
- approval 点与写入后验证。

不要将未解决的候选合并进已批准批次。执行后，将每个候选分类为已导入并验证、已存在且未变更、失败、未尝试、存疑或等待新决策。

### 获取完成清单

搜索边界：

- 记录概念、排除项、日期、语言、出处、来源与停止规则。
- 报告区分已搜索来源与未覆盖来源。
- 每个保留的候选都有来源信息与收录理由。
- 结果计数不暗示超出声明边界的穷尽性。

身份：

- 模糊元数据之前先比较强标识符。
- 疑似重复已实时检查。
- 除非重复决定有支持，相关版本仍保持独立。
- 现有 Zotero items、外部候选与导入 items 保持独立身份。

写入准备：

- 目标库与 collection 是显式的。
- 元数据与 attachment 来源已知。
- 重复效果与幸存者选择可审阅。
- Workflow options 与 provider profile 分别校验。
- 批次足够小而可检查与恢复。

验证：

- 每个已批准 item 在操作后重新读取。
- Collection 成员关系实时确认。
- 需要的附件状态通过检查确立，而非从下载或 run 状态推断。
- 失败与未尝试的候选保留在结果中。

接近命中：

- 搜索成功不是导入成功。
- 下载的字节不是 Zotero 附件。
- DOI 相等可识别疑似重复，但不选择幸存者。
- 相似标题与年份不证明重复身份。
- Provider 元数据不会自动高于精选的库数据。
- 终态 workflow 不能证明请求的 collection 或附件效果。

若完成的结果只是候选报告，直说。不要将其表述为“已收集到 Zotero”。

## 硬性约束

- 没有当前权限与 Zotero 中显示的 approval 时，不要导入、合并、删除、重链或获取 attachments。
- 在对照实时 library 检查身份与重复状态前，把外部发现结果视为候选。
- 不要作出可用来源不支持的关联性、许可或元数据论断。
- 将检索保持在请求范围内；不要建立常驻监视列表或后台收割。
- 当替代方案具有实质不同的影响时，不要静默选择重复项保留记录、目标 collection、版本、attachment 来源或元数据覆盖。
- 不要将成功的搜索、被接受的请求、下载的文件或终止的 workflow 当作可用 Zotero item 与附件现已存在的证明。
- 未经单独批准的 curation 决策，不要用冲突的 provider 元数据替换精选的库元数据。

## LLM 与工具职责

LLM 负责搜索策略、纳入判断、来源比较、重复评估、就绪解读与授权检查。捆绑的 CLI 与 runner 负责精确 argv、实时 Zotero 调用、workflow 与变更校验、approval 传输、handles 与结果 schema 校验。不要捏造 handles、receipts、已获取状态、许可或重复解决方案。

## 结果契约

返回与 `assets/output.schema.json` 匹配的一个业务 JSON 对象。

必需：

- `schema`：`zotero-library-task.result.v1`。
- `status`：`completed`、`canceled` 或 `failed`。
- `summary`：描述候选边界或已验证的获取结果，包括计数与实质限制。

可选：

- `evidence` 是可选数组；每个条目要求 `kind` 与 `ref`；用于外部来源、实时 Zotero 匹配、已获取 item 引用、collection 引用、attachment 引用、workflow run 或 operation receipt。仅在已知时添加 `locator` 与 `description`。
- `artifacts` 是可选数组；每个条目要求既有 `path` 与 `role`，如 `candidate-report` 或 `duplicate-review`；已知时添加 `mediaType`。
- `diagnostics` 是可选数组；每个条目对未解决的重复、不可访问来源、缺失的目标权限、部分批次结果或其他稳定限制要求 `code` 与 `message`。

状态规则：

- `completed`：所声明的候选搜索边界已满足，或每个已批准获取影响都已实时核验。
- `canceled`：写入前缺少标准、目标、重复选择、attachment 权限或其他重要决策。
- `failed`：尝试的 provider、workflow、导入、attachment 或核实路径无法完成声明目标。

最小结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Prepared a bounded report of twelve candidates, including live duplicate status, without importing any item."
}
```

不要虚构 `partial`。当已批准批次的一部分成功但所请求的总体获取未完成时，使用 `failed`，将成功的实时 refs 作为证据纳入，并诊断失败与未尝试的候选。

Runner 的 `__SKILL_DONE__` 标记是传输元数据，不是此业务对象中的字段。只对有具体用户决策的情况使用 pending 分支；最终输出不含 Markdown 围栏、解释性前缀或第二个 JSON 对象。

## 完成

返回一个最终的 `zotero-library-task.result.v1` 对象，含必需的 `schema`、`status` 与 `summary`。对声明的搜索边界已满足的候选评估，或 item/collection/attachment 状态已实时核实的已批准结果，使用 `completed`。当标准、目标选择、重复决策或写入权限缺失时使用 `canceled`；当尝试的操作无法安全完成时使用 `failed`。

## 失败处理

保留候选出处、重复替代、目标 refs、被接受的 workflow 或 operation handles、approval receipts 与结构化失败。若获取部分成功，将成功 items 与失败或未尝试候选分开返回。被拒绝或含混之后，带着准备好的选择停下；不要切换到不同的 import、mutation、attachment 或 workflow 路径。

## 参考

当任务需要详细搜索计划模板、标识符/版本比较、重复决策记录、许可或 provider 边界分析、workflow/provider 选择、attachment 就绪路径或批次与部分结果恢复时，查阅[综合获取 playbook](references/playbook.md)。
