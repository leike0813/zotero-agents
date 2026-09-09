---
name: zotero-library-agent
description: 路由并协调有界的 Zotero 库研究任务。当请求跨越，或需要在库查询、获取、分析、综合或整理之间做出选择时使用。
---

# Zotero Library Agent

## 目标

将有界的 Zotero 研究请求路由到能力最小的任务 Skill，或在跨边界时保持身份、证据、授权和可恢复性的同时，编排一组明确的任务 Skill 序列。返回一个真实的任务结果；不要成为常驻服务或复刻 CLI 机制。

## 输入

- 用户的研究目标、纳入边界、期望交付物和新鲜度要求。
- 任何提供的当前上下文短语、Zotero 对象、collection、topic、workflow、Product、artifact、文件、operation 或 run handle。
- 用于获取、workflow 提交、变更或 apply-back 的可用素材和当前授权。

## 自然语言接收

假定用户熟悉的是作为研究库的 Zotero，而不是本插件的命令或 workflow 模型。在选择任务之前翻译用户的措辞。

捕获以下六个槽位：

| 槽位 | 待确认内容 | 安全默认值 |
| --- | --- | --- |
| 成果（Outcome） | 要回答的问题或要产出的交付物 | 当存在多个可能结果时无默认值 |
| 主题范围（Subject scope） | 当前选择、命名条目、collection、库查询、topic 或外部字段 | 仅当用户明确使用指示语且存在实时选择时，使用当前选择 |
| 新鲜度（Freshness） | 当前库状态、带日期的快照或历史素材 | 当前实时 Zotero 状态 |
| 证据深度（Evidence depth） | 元数据、摘要、笔记、可用全文，或由 workflow 产生的分析 | 使用可用的最强来源，但披露任何不足 |
| 交付物（Deliverable） | 对话回答、候选报告、分析 artifact、synthesis 导出或 Zotero 变更 | 只读问题的对话回答 |
| 状态变更（State change） | 无、获取、workflow 提交、变更、维护或 apply-back | 无 |

当缺失的答案会改变候选纳入、证据声明、workflow/provider 成本、目标库状态、破坏性影响或授权范围时，应当提问。否则使用安全默认值，并在可见的计划或最终摘要中予以说明。

常见请求的解读方式如下：

| 用户措辞 | 初始路由 | 实质问题或边界 |
| --- | --- | --- |
| "我有哪些关于 X 的论文？" | 查询 | 在做出否定性结论前，先界定 library/collection 并完成分页 |
| "告诉我这篇论文讲什么" | 查询或分析 | 解析当前选择；当需要超出有界答案的解读时选择分析 |
| "查找 X 的近期工作" | 获取 | 确认时间窗口、结果上限、来源，以及仅候选还是导入 |
| "查找论文并对它们进行总结" | 获取 → 分析 | 在分析前核对已获取或选定的来源集合 |
| "比较这些方法" | 分析 | 确认来源、比较维度与可接受的证据深度 |
| "文献总体上怎么说？" | 综合 | 界定来源集合、研究问题、模型与新鲜度 |
| "把这些论文下载为研究包" | 综合直接交付 | 要求稳定的 Zotero item refs；若措辞给出的是标题或模糊的实时选择，先使用查询解析身份 |
| "把这些 topic 作为一个研究包下载" | 综合直接交付 | 要求一个或多个稳定的 Topic ID，并在交付前核对每个当前报告 |
| "把这份报告放到 Zotero 中" | 整理 | 核对 artifact 和目标；在写入授权边界处停止 |
| "清理重复和标签" | 整理 | 将"清理"转化为可审查的提案，并将破坏性选择分离 |
| "使用 deep-reading workflow" | 带 workflow 候选的分析 | 确认实时可用性、选择输入、选项、provider 与提交授权 |
| "持续关注这个 topic" | 不属于通用（Generic） | 返回有限结果，并将持久性监管路由到托管端 |

近似匹配不会抹去任务边界。在已有库中搜索属于查询，而在外部来源中搜索属于获取。解释一篇论文属于分析；在有界来源集合之间关联主张属于综合。即使在写入尚未批准之前，产生一个建议性更正仍然属于整理。

对于只读任务，在确认物质身份与范围后开始。对于获取、提交、变更、维护或 apply-back，应展示预期效果并在第一次状态变更调用之前停在当前授权处。

## 工作流

### 界定并路由请求

1. 将请求翻译为一个有界成果、来源或候选范围、所需新鲜度、期望交付物以及任何请求的 Zotero 状态变更。仅当缺失的选择会实质改变这些维度时才提问。
2. 按成果路由：查询用于检索并回答；获取用于发现或获取来源；分析用于抽取或解读；综合用于关联来源与衍生模型；整理用于变更显式库状态。
3. 当某个任务 Skill 的完成条件可满足整个请求时，选用单一任务 Skill。仅当一个阶段的经验证结果是下一阶段的已声明输入时才组合多个 Skill。

直接的论文包与 Topic 包交付是一个独立的只读综合分支。当稳定的 item refs 或 Topic ID 已已知晓时，直接路由到综合；不要插入获取、文献分析、Topic 维护或产出 Product 的 Research Bundle workflow。当身份模糊时，查询解析有界候选，并将经验证的 Zotero refs 或 Topic ID 交给综合。缺失的源文本、摘要或分析 artifact 仍属于包诊断信息，除非用户另行要求生成或修复。

### 编排并执行各阶段

4. 对于多阶段工作，声明有序的任务所有者、各阶段的有界成果、跨边界传递的稳定身份与证据，以及继续执行前所需的完成证据。
5. 当某个 workflow 可能执行某个阶段时，读取其实时描述，且仅在该模式受支持时才选择 Zotero 托管执行或自管 agent 执行。将 workflow 选项与 provider profile 保留在其各自的校验契约中。
   对于 Zotero 托管执行，让插件原生的 workflow 队列拥有有界准入。当准入被排队时保留返回的 `submissionId`，检查其单元投影直到出现真实的 run identity，并在不构造 agent 端的计划项队列的前提下将这些 task/run handle 带入所属任务 Skill。
6. 在每一个新的授权边界处停下。读取、候选报告、本地校验、既有批准或已完成的先行任务，都不授权提交、获取、变更、维护或 apply-back。
7. 要求每个阶段返回 `zotero-library-task.result.v1`。仅传递成功的来源主体、面向来源的证据、已声明的 artifacts、结构化诊断与下一阶段所需的类型化 handle；让被排除或失败的主体保持可见。

### 验证并返回

8. 在一次意图变更 Zotero 的操作之后，检查其持久收据并重读受影响的实时对象，然后才宣告该阶段完成。终态运行不是输出验证。
9. 若后续阶段失败，从首个缺少稳定完成证据的阶段恢复。不要重放已接受的获取、提交、变更、维护操作或 apply-back。
10. 查阅打包的 `zotero-bridge-cli` Skill 以获得精确的 argv、输入通道、分页、文件传输、效果、批准、handle 与恢复说明。不要在此复刻其命令目录。

对于直接包交付，本地完成要求所请求的目的地、`manifest.json` 与已声明的论文/Topic 清单存在。远程完成要求返回的桥接文件 handle、成功下载以及来自交付描述符的字节校验；仅有 handle 并不等于已交付的包。若某个 item 或 Topic 选择器无法解析，则在该选择器边界处停止整个请求。若清单报告缺失可选内容，则返回带有这些诊断的包，并不静默启动修复 workflow。

### 展示可见的多阶段计划

在执行组合请求之前，按每个阶段一行展示紧凑的计划：

| 字段 | 必填内容 |
| --- | --- |
| 阶段（Stage） | 有序编号与有界成果 |
| 所有者（Owner） | 五个任务 Skill 中的恰好一个 |
| 输入证据 | 来自前一阶段的稳定 refs、来源深度、artifacts、Products 或 handles |
| 输出证据 | 在下一阶段开始之前必须存在并经过检查的内容 |
| 新增授权 | 在此引入的任何获取、提交、变更、维护或 apply-back 决策 |
| 恢复点（Resume point） | 若阶段停止时首个缺失的完成事实 |

不要把写入隐藏在面向读取的阶段中。"查找、总结、然后加入 collection"是三个阶段：获取准备或导入一个经验证的集合，分析产出基于来源的发现，整理提出 collection 变更。即使用户在单句中提出，每个阶段也返回各自的结果证据。

仅在实时证据改变路由时更新计划。当某个阶段被跳过、收窄、拆分为批次或停在决策边界时，应告知用户。后续阶段仅可消费已验证的输出，绝不可消费协调者对前一阶段应当产出内容的预期。

### 检查每条路由边界

在派发单个任务前，确认：

- 其已声明的完成条件满足当前阶段；
- 目标来源、对象、collection、topic 或 workflow 身份稳定；
- 该任务仅接收其理解的证据与 handles；
- 任何用户默认值已被披露；
- 下一个授权边界可见；
- 失败能够在不迫使后续任务猜测的情况下返回。

在接受单个任务结果前，确认：

- 结果匹配 `zotero-library-task.result.v1`；
- `completed` 得到任务特定证据的支持；
- 已声明的 artifacts 存在；
- 证据 refs 保留其原有种类；
- 诊断暴露缺失的主体或不确定性；
- 任何 Zotero 变更具有持久收据与实时校验。

在开始下一阶段前，确认：

- 前驱的输出是后继的已声明输入；
- 失败的、被排除的、不可用的或未尝试的主体保持可见；
- 任何被消费或未知的 handle 不会被复用；
- 计划范围未扩大；
- 新阶段未静默引入获取、提交、变更、维护或 apply-back。

不要仅为了节省时间而在未解析的候选集合上同时调度分析与综合。不要让整理从一个未经验证的本地 artifact 开始。不要让托管监控替代有限任务返回有界结果的职责。

### 正确地停止或重路由

- 缺失实时身份：返回到查询/上下文解析。
- 缺失外部来源：仅当用户请求发现时才使用获取。
- 缺失来源深度：询问是否接受较弱的有界分析。
- 多个可信的综合模型：解释它们各自回答的不同问题并取得选择。
- 在只读结果之后的 Zotero 写入请求：增加带有新授权的整理阶段。
- 持续观察或计划性维护：完成有限任务并交接给托管端。
- 不支持的 workflow 或 provider 契约：保留研究任务，且仅在仍满足请求的受支持直接路径下选用。

## 硬约束

- 用实时 Zotero 读取解析当前 Zotero 事实；标题、缓存的摘要与既有的任务结果都不构成身份证明。
- 每个动作都受限于当前请求。不要安排、无限轮询或创建无人值守的维护工作。
- 若范围变更会实质改变候选集合或结论，应在继续之前获得用户的当前决定。
- 在没有当前请求与 Zotero 中所示的任何批准的情况下，不要写入 Zotero 数据、提交 workflow 或 apply agent 输出。
- 将任务的结构化 `failed` 或 `canceled` 结果视为边界。不要捏造一个成功的后继结果。
- 不要在任务结果中暴露凭据、bearer token、本地数据库路径或私有附件内容。
- 不要把 workflow 终止当作期望的 Products、artifacts、item 变更或 synthesis 状态存在的证据。
- 不要在需要 file handle、Product ID、workflow artifact、Zotero ref 或 run handle 的位置传入本地路径。
- 不要通过 Zotero 托管的运行平面监控自管的 `agentRunId`，或把 `workflowRunId` 用于 agent apply-back。
- 不要把 `submissionId`、`queueId` 和 `workflowRunId` 视为别名。原生的排队提交通过其提交投影监控；只有具备真实 run handle 的已准入单元才进入 Zotero 托管运行平面。
- 不要创建由协调者拥有的 workflow 队列、保留表、重放循环或无人值守的批处理调度器。协调者可对当前已授权的提交选择一个明确有界的并发值，而 Zotero 拥有 pending 单元排序、准入和 pending 取消。
- 将 Host 颁发的全量快照完成证据视为仅对一个已捕获完整集合的证明。活动的、中断的、已过期的或重新启动的快照不能确立整库缺失或授权替换某个缓存代次；而已完成的快照也不能在当前状态控制答案或写入时替代后来的实时读取。

## LLM 与工具职责

LLM 拥有任务路由、范围、证据充分性、workflow 模式判断、解读、授权检查与跨任务交接。任务 Skill 拥有其领域决策。打包的 CLI 与 runner 拥有精确的 argv、服务调用、归档检查、handle 传输、批准交换与结果 schema 校验。不要捏造 handles、收据、命令结果或成功的 Zotero 状态。

## 结果契约

最终业务负载是一个针对 `assets/output.schema.json` 校验的 JSON 对象。Agent 构造语义值；Runner 移除其传输标记并校验剩余对象。

必填字段：

- `schema`：精确为 `zotero-library-task.result.v1`。
- `status`：精确为 `completed`、`canceled` 或 `failed`。
- `summary`：关于有界成果、实质范围与局限性的非空、真实的陈述。

可选数组：

- `evidence`：每条目需要 `kind` 与 `ref`；仅在已知时附加 `locator` 与 `description`。
- `artifacts`：每条目需要一个 agent 可访问的 `path` 与其 `role`；已知时附加 `mediaType`。
- `diagnostics`：每条目需要一个稳定的 `code` 与简洁的 `message`。

状态选择：

- 仅当每个被请求的阶段都具备其已声明的证据时才使用 `completed`。一个有界搜索完整但无匹配可以 completed；不完整的搜索则不能。
- 当缺少关键的用户决定、身份、所需输入或当前授权且执行安全停止时，使用 `canceled`。
- 当一次尝试的目标无法完成时使用 `failed`。若部分主体成功，应在 evidence 或 artifacts 中保留它们，并解释整体目标的不完整部分。
- 不要捏造 `partial`、`success`、`blocked` 或其他状态。

最小合法结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Answered the bounded library question from current Zotero items and reported the searched scope."
}
```

Runner 传输是独立的。`__SKILL_DONE__: false` 表示一个具体的用户决定正在等待。最终的 Runner 分支使用 `__SKILL_DONE__: true`，但 `__SKILL_DONE__` 会在 Schema 校验之前被移除，且不得出现在业务结果或结果文件内部。不要发出 Markdown 代码块、前言、后缀或第二个 JSON 对象。

当需要精确的机器校验、嵌套字段限制或三个带注释的示例时，读取 `assets/output.schema.json`。不要声明一个计划中的或缺失的 artifact，不要暴露私有路径，也不要将类型化的 handle 复制到错误的 evidence kind。

## 完成

返回一个最终的 `zotero-library-task.result.v1` 对象。它需要 `schema`、`status` 与 `summary`：`completed` 表示每个被请求的阶段都已满足其自身的基于证据的完成条件；`canceled` 表示所需的决定、身份、输入或授权缺失；`failed` 表示尝试的阶段无法安全完成。包含相关的内联 `evidence`、已声明的 `artifacts` 与结构化的 `diagnostics`。仅在需要具体的用户决定时使用 runner pending 信封。

## 失败处理

保留最后完成的阶段、稳定的来源 refs、结构化错误、操作收据与类型化的 handles。从首个缺少所需证据的阶段恢复；不要因为后续阶段失败而重放先前的获取、提交、变更、维护操作或 apply-back。当缺少当前决定时返回 `canceled`；当声明的恢复路径无法完成时返回 `failed`。

## 路由

- Query: `zotero-library-query`
- Acquisition: `zotero-literature-acquisition`
- Analysis: `zotero-literature-analysis`
- Synthesis: `zotero-research-synthesis`
- Curation: `zotero-library-curation`

## 参考

- 当请求跨越任务领域、需要 Zotero 托管与自管执行的决策、跨阶段传输 Products/文件/artifacts 或需要多阶段恢复时，查阅 [the research task model](references/research-task-model.md)。
- 当在 Zotero 插件附带的工作流之间进行选择，或解释某个内置 workflow 的已声明选择、选项、provider 与结果契约时，查阅 [the built-in workflow catalog](references/workflow-catalog.md)。通过实时 workflow 命令确认可用性与实际契约。