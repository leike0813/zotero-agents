---
name: zotero-library-agent
description: 路由和协调有明确边界的 Zotero 文献库研究任务。当请求跨越文献库查询、采集、分析、综合或整理任务，或者需要在这些任务之间进行选择时使用。
---

# Zotero 文献库 Agent

## 目标

将有边界的 Zotero 研究请求路由到能够完成任务的最小 Skill，或协调一组显式有序的任务 Skills，并在边界间保留身份、证据、权限与恢复信息。返回一个真实的任务结果；不得转变为常驻服务，也不得复述 CLI 机制。

## 输入

- 用户的研究目标、纳入边界、期望交付物及新鲜度要求。
- 调用方提供的当前上下文短语、Zotero 对象、分类、topic、工作流、Product、artifact、文件、operation 或 run handle。
- 可用来源材料，以及对获取、工作流提交、变更或 apply-back 的当前授权。

## 自然语言输入理解

假设用户知道 Zotero 作为研究库，而不是该插件的命令或 workflow 模型。在选择任务之前翻译他们的话。

捕获这六个插槽：

|插槽|建立什么 |安全默认|
| --- | --- | --- |
|结果|要回答的问题或要生成的交付物 |当多个结果都合理时，不存在违约 |
|主题范围 |当前选择、命名项目、集合、库查询、主题或外部字段 |仅当用户明确使用指示语言并且存在当前 selection时当前选择
|新鲜度|当前库状态、过时快照或历史材料 |当前 Zotero 状态|
|证据深度|元数据、摘要、注释、可用全文或 workflow 生成的分析 |使用最强大的可用来源，但披露任何不足 |
|可交付成果 |对话答案、候选报告、分析artifact、综合导出或 Zotero 更改 |只读问题的对话答案 |
|状态变化 |无、获取、workflow 提交、变更、维护或申请返回 |无 |

当缺少的答案会改变候选项纳入、证据声明、workflow/provider成本、目标库状态、破坏性影响或批准范围时提出问题。否则，请使用安全默认值并在可见计划或最终摘要中注明。

常见请求解释如下：

|用户措辞 |初始路线|实质性问题或边界|
| --- | --- | --- |
| “我有什么关于 X 的文件？” |查询 |在否定声明之前绑定文献库/馆藏并完成分页 |
| “告诉我这篇论文说了什么” |查询或分析 |解决当前选择；当需要超出有限答案的解释时选择分析 |
| “查找有关 X 的最新工作”|采集|建立日期窗口、结果范围、来源以及仅限候选与导入 |
| “查找论文并总结它们” |获取→分析|分析前验证获取或选择的源集 |
| “比较这些方法” |分析|解析来源、比较维度和可接受的证据深度 |
| “文献总体上说了什么？” | Synthesis |绑定源集、研究问题、模型和新鲜度 |
| “将此报告放入 Zotero”|整理|验证artifact和目标；停在写权限边界|
| “清理重复项和标签” |整理|将“清理”转变为可审查的提案并单独的破坏性选择 |
| “使用深度阅读 workflow” | workflow 候选者分析 |确认实时可用性、选择输入、选项、provider和提交权限 |
| “继续关注这个话题” | Generic 之外 |返回有限结果并将持久监督路由到托管方面 |

接近匹配不会消除任务边界。搜索现有文献库是查询，而搜索外部资源是获取。解释一篇论文是分析；跨有限源集关联声明就是综合。即使在写入被批准之前，产生建议的更正仍然是策划。

对于只读任务，请在了解材料身份和范围后开始。对于获取、提交、写入变更、维护或申请返回，在第一次状态更改调用之前显示建议的效果并停止当前授权。

## 工作流

### 界定并路由请求

1. 将请求转化为一个有边界的结果、来源或候选范围、所需新鲜度、预期交付物，以及任何请求的 Zotero 状态变更。只有缺失选择会实质改变这些维度时才提问。
2. 按结果路由：query 负责检索和回答；acquisition 负责发现或获取来源；analysis 负责提取或解释；synthesis 负责关联来源与派生模型；curation 负责变更明确的文献库状态。
3. 若一个任务 Skill 的完成条件能满足整个请求，就只选择该 Skill。仅当一个阶段经过验证的结果是下一阶段声明的输入时，才组合多个 Skill。

### 组合并执行阶段

4. 对多阶段工作，声明有序的任务所有者、每个阶段的有边界结果、跨越各边界的稳定身份与证据，以及继续之前所需的完成证据。
5. 当 workflow 可执行某个阶段时，读取其实时描述，并且只有相应模式受支持时，才选择 Zotero 托管执行或 Agent 自主执行。工作流选项与 provider profile 必须保持在各自独立的校验合同中。
6. 遇到每个新权限边界都必须停止。读取、候选报告、本地校验、既往 approval 或已完成前置任务都不授权 submission、acquisition、mutation、maintenance 或 apply-back。
7. 要求每个阶段返回 `zotero-library-task.result.v1`。跨阶段只传递成功的来源对象、面向来源的证据、已声明 artifact、结构化诊断及下一阶段所需的类型化 handle；失败或排除的对象仍须可见。

### 验证并返回

8. 任何意在改变 Zotero 的操作之后，必须检查持久 receipt 并重新读取受影响的实时对象，才能声明该阶段完成。run 进入 terminal 状态不等于输出已验证。
9. 后续阶段失败时，从第一个缺少稳定完成证据的阶段恢复。不得重放已接受的 acquisition、submission、mutation、maintenance operation 或 apply-back。
10. 精确 argv、输入通道、分页、文件传输、effect、approval、handle 与恢复信息应查阅随附 `zotero-bridge-cli` Skill。不得在此重构其命令目录。

### 提出一个可见的多阶段计划

在执行组合请求之前，显示一个紧凑的计划，每个阶段一行：

|领域|必填内容 |
| --- | --- |
|舞台|有序数和有界结果 |
|负责方 |正是五项任务技能之一 |
|输入证据|从前一阶段接受的稳定refs、来源深度、artifacts、Products或handles |
|输出证据|在下一阶段开始之前必须存在并检查什么 |
|新权威|此处介绍的任何获取、提交、写入变更、维护或申请返回决策 |
|恢复点 |如果阶段停止，第一个缺失的完成事实 |

不要将写入隐藏在面向读取的阶段内。 “查找、总结，然后添加到集合中”分为三个阶段：获取准备或导入经过验证的集合，分析产生基于源的发现，以及管理提出集合更改。即使用户用一句话询问，每个阶段也会返回自己的结果证据。

仅当现场证据改变路线时才更新计划。告诉用户何时跳过、缩小阶段、分成批次或在决策边界处停止。后面的阶段可能只消耗经过验证的输出，而不会消耗协调者对早期阶段应该产生的内容的期望。

### 检查每条路线边界

在分派一项任务之前，请确认：

- 其申报的竣工条件满足现阶段；
- 目标源、对象、集合、主题或 workflow 身份稳定；
- 任务只收到证据并且handles它理解；
- 任何用户违约行为已被披露；
- 下一个权限边界可见；
- 失败可以返回，而无需强制稍后的任务进行猜测。

在接受一项任务结果之前，请确认：

- 结果匹配`zotero-library-task.result.v1`；
- `completed` 有特定任务证据支持；
- 声明artifacts存在；
- 证据refs保留其原始种类；
- 诊断暴露了缺失的受试者或不确定性；
- 任何 Zotero 更改都有持久的receipt和实时验证。

在开始下一阶段之前，请确认：

- 前任者的输出是后继者声明的输入；
- 失败、被排除、不可用或未尝试的主题仍然可见；
- 已消耗或未知的handle不会被重复使用；
- 规划范围未扩大；
- 新阶段不会默默地引入获取、提交、写入变更、维护或apply-back。

不要仅仅为了节省时间而对未解决的候选集同时进行分析和综合。不要让整理从未经验证的本地artifact开始。不要让托管监控取代有限任务返回有限结果的责任。

### 正确停止或改道

- 缺少实时身份：返回查询/上下文解析。
- 缺少外部来源：仅当用户请求发现时才使用获取。
- 缺少来源深度：询问是否可以接受较弱的有界分析。
- 多种合理的综合模型：解释它们回答的不同问题并获得选择。
- 请求在只读结果后写入 Zotero：添加具有新权限的管理阶段。
- 持续监视或定期维护：完成有限任务并移交给托管方面。
- 不支持的 workflow 或provider合约：保留研究任务，仅在仍满足请求时选择受支持的直接路径。

## 硬约束

- 通过实时 Zotero 读取解析当前事实；标题、缓存摘要和先前任务结果不能证明对象身份。
- 所有操作都必须限定在当前请求范围内。不要安排定时任务、无限期轮询或创建无人值守的维护工作。
- 如果范围变化会实质改变候选集或结论，继续执行前必须取得用户当前的决定。
- 没有当前请求以及 Zotero 中显示的必要审批，不得写入 Zotero 数据、提交 workflow 或应用 Agent 输出。
- 将任务的结构化 `failed` 或 `canceled` 结果视为边界。不得虚构后续成功结果。
- 绝不能在任务结果中暴露凭据、bearer token、本地数据库路径或私有附件内容。
- 不得把工作流终态当作预期 Product、artifact、条目变更或 synthesis 状态存在的证据。
- 需要文件 handle、Product ID、工作流 artifact、Zotero ref 或 run handle 时，不得传入本地路径。
- 不得通过 Zotero 托管 run 平面监控 Agent 自主的 `agentRunId`，也不得使用 `workflowRunId` 执行 Agent apply-back。

## LLM 与工具职责

LLM 负责任务路由、scope、证据充分性、工作流模式判断、解释、权限检查及跨任务 handoff。各任务 Skill 负责其领域决策。随附 CLI 与 runner 负责精确 argv、服务调用、归档检查、handle 传输、approval 交换和结果 schema 校验。不得虚构 handle、receipt、命令结果或 Zotero 成功状态。

## 结果契约

最终的业务负载是一个针对 `assets/output.schema.json` 进行验证的 JSON 对象。 Agent构造语义值； Runner 删除其传输标记并验证剩余的对象。

必填字段：

- `schema`：正是`zotero-library-task.result.v1`。
- `status`：正好是`completed`、`canceled` 或`failed`。
- `summary`：对有限结果、实质性范围和限制的非空真实陈述。

可选数组：

- `evidence`：每个条目需要`kind`和`ref`；仅在已知时添加 `locator` 和 `description`。
- `artifacts`：每个条目都需要一个现有的agent可访问的`path`及其`role`；已知时添加`mediaType`。
- `diagnostics`：每个条目都需要稳定的`code`和简洁的`message`。

状态选择：

- 仅当每个请求的阶段都有其声明的证据时才使用`completed`。可以完成没有匹配项的完整有界搜索；不完整的搜索不能。
- 当重大用户决策、身份、所需输入或当前授权丢失并且执行安全停止时，请使用`canceled`。
- 当尝试的目标无法完成时，请使用`failed`。如果某些科目成功，请将其保存为证据或artifacts，并解释不完整的总体目标。
- 请勿发明 `partial`、`success`、`blocked` 或其他状态。

最小有效结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Answered the bounded library question from current Zotero items and reported the searched scope."
}
```

Runner 运输是分开的。 `__SKILL_DONE__: false` 表示具体的用户决定正在等待。最后一个Runner分支使用`__SKILL_DONE__: true`，但`__SKILL_DONE__`在Schema验证之前被删除，并且不得出现在业务结果或结果文件中。不发出 Markdown 栅栏、前言、后缀或第二个 JSON 对象。

当需要精确的机器验证、嵌套字段限制或三个带注释的示例时，请阅读`assets/output.schema.json`。不要声明计划的或缺失的artifact、暴露私有路径或将键入的handle复制到错误的证据类型中。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象。必需字段为 `schema`、`status` 与 `summary`：`completed` 表示每个请求阶段均满足各自基于证据的完成条件；`canceled` 表示缺少必要决策、身份、输入或权限；`failed` 表示已尝试阶段无法安全完成。包含相关内联 `evidence`、已声明 `artifacts` 与结构化 `diagnostics`。仅在等待具体用户决策时使用 runner pending envelope。

## 失败处理

保留最后完成阶段、稳定来源 ref、结构化错误、operation receipt 和类型化 handle。从首个缺少必要证据的阶段恢复；不得仅因后续阶段失败，就重放更早的 acquisition、submission、mutation、维护 operation 或 apply-back。缺少当前决策时返回 `canceled`；声明的恢复路径无法完成后返回 `failed`。

## 路由

- 查询：`zotero-library-query`
- 采集：`zotero-literature-acquisition`
- 分析：`zotero-literature-analysis`
- 综合：`zotero-research-synthesis`
- 整理：`zotero-library-curation`

## 参考资料

- 当请求跨越任务领域、需要决定 Zotero 托管还是 Agent 自主执行、跨阶段传递 Product/file/artifact，或需要多阶段恢复时，查阅[研究任务模型](references/research-task-model.md)。
- 需要在 Zotero 插件随附的 workflow 中进行选择，或说明内建 workflow 所声明的 selection、option、provider 与结果合同时，查阅[内建 workflow 目录](references/workflow-catalog.md)。实际可用性与真实合同必须通过实时 workflow 命令确认。
