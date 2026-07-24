---
name: zotero-bridge-cli
description: 操作 Zotero Bridge CLI，以精确访问 Zotero 文献库、工作流和 Synthesis。用于 Agent 需要底层 Zotero 操作、命令发现或结构化恢复时。
许可证：AGPL-3.0 或更高版本
---

# Zotero 桥CLI

## 目标

安全、确定地使用已安装的 `zotero-bridge` CLI 执行 Zotero 文献库、工作流、文件、运行及 Synthesis 操作。本 Skill 是完备的机制合同：负责可执行文件选择、连接设置、命令发现、精确调用、effect 与 approval 解读、类型化 handle、输出证据以及恢复；不负责选择或组合研究目标。

## 输入

- 请求执行的 CLI 操作，或已经选定的规范命令。
- 运行期本地 CLI shim、已安装的 `zotero-bridge` 可执行文件，或在两者都不可用时使用随附的安装程序。
- 当前 release envelope 与连接 profile，包括调用方提供的 endpoint、scope、mode 及机密环境变量值。
- 所选规范命令的输入，包括 JSON payload、对象 ref、不透明 handle、cursor、provider profile、工作流选项和输出目标。

## 工作流

1. 按下述规则选择一个可执行文件和一个连接 profile，并确保 binary、内嵌合同、profile 与 release envelope 属于同一 release set。
2. 运行 `zotero-bridge surface identity --json`。将 `protocol`、`cliSchema`、`version`、`buildFingerprint` 和 `commandCatalogChecksum` 与当前 release envelope 比较；任一不一致都必须停止。
3. 如果规范操作未知，请阅读命令目录，选择最接近的任务族，并仅使用`surface search --intent '<operational terms>' --json`来缩小候选范围。在执行之前运行 `surface describe '<canonical command>' --json` 并仅读取拥有该命令的第一个标记的生成的命令表面引用。
4. 由外而内确认实时身份与就绪状态：先检查服务健康状态，再检查已认证的 manifest/profile，必要时检查 backend 就绪状态，最后检查领域对象或工作流合同。
5. 仅准备命令 descriptor 声明的输入；工作流选项、provider profile、selection、payload、不透明 handle 和输出路径必须保持各自独立的 binding。
6. 调用前检查 effect、approval 时机、类型化 handle 转移、分页、目标与恢复规则。显示 Zotero 端要求的 approval，不得把有效输入视为授权。
7. 执行一个规范命令。将 stdout 视为单一 JSON envelope，并保留其中的标识符、cursor、checksum、receipt、路径和结构化错误字段。
8. 按返回合同完成分页、文件交付、工作流控制或 receipt 检查。请求变更后必须验证 Zotero 实时状态，不得仅凭提交或终态执行推断成功。
9. 返回有效结果及其证据；若失败，则分类失败，并且只采取声明过的安全后续动作。

## 可执行文件与 profile 选择

优先使用当前工作区提供的运行期本地 shim，否则使用已安装的可执行文件；仅在两者均不存在时使用随附安装程序。绝不能混用不同 release set 的 binary、profile、内嵌 descriptor、asset 或 release envelope；版本字符串相同不足以证明身份一致。

保留调用方提供的 `ZOTERO_BRIDGE_PROFILE`、`ZOTERO_BRIDGE_ENDPOINT`、`ZOTERO_BRIDGE_SCOPE` 和 `ZOTERO_BRIDGE_CONNECTION_MODE`。仅当随附安装程序需要选择 Zotero 端连接 profile 时，才使用 `ZOTERO_BRIDGE_HOST_PROFILE` 或 `ZOTERO_BRIDGE_HOST_HOME`。`ZOTERO_BRIDGE_TOKEN` 属于机密输入：不得打印、持久化、放入 argv 或纳入证据。

离线 `surface` 命令描述内嵌合同，并不能证明 Zotero、Zotero Bridge 服务或已配置 backend 可访问。遇到实时调用失败时，按以下顺序诊断：

1. 用 `bridge status` 检查服务健康状态；
2. 用 `bridge profile inspect` 和 `bridge profile diagnose` 检查脱敏后的连接事实；
3. 用 `bridge manifest` 检查已认证的服务合同；
4. 用 `bridge backend list` 或 `bridge backend status` 检查 provider 就绪状态；
5. 检查所选领域读取、工作流描述、运行状态或持久 operation receipt。

## 命令发现与调用

使用 `surface search` 发现操作，而不是用它决定研究任务。argv binding、调用与 payload schema、结果形状、分页、effect、approval scope、handle 转移、恢复及目标均以 `surface describe` 为准。只有某项高级诊断能力不存在规范语义命令时，才使用原始 `call`。

### 从用户意图出发

agent 在知道任何 CLI 名称之前，经常会收到诸如“向我展示有关该主题的论文”、“下载分析结果”或“运行深读 workflow”之类的请求。不要让用户将该请求翻译成命令。

使用这个序列：

1. 阅读[命令目录](references/command-catalog.md)。
2. 确定请求的 Zotero 对象、任务系列、新鲜度、可交付成果和状态更改边界。
3. 从目录中选择最小的候选命令或有序命令序列。
4. 仅当多个候选仍然匹配时才使用`surface search`。
5. 使用`surface describe`获取准确的实时合约。
6. 阅读一份包含命令根的详细参考资料。
7. 仅在已知输入、效果、approval、handle、完成证据和恢复后才构建和执行调用。

目录故意紧凑。它拥有用户意图的发现，而命令引用自己的可执行细节。不要仅仅因为其摘要与用户的请求共享关键字而从目录表构造 argv 或复制命令。

### 翻译常见的请求形状

- “本文”、“这些项目”和“当前集合”首先需要 `context` 命令来解析当前 selection。
- “我的文献库里有什么？”以及“我有关于 X 的论文吗？”需要 `library` 读取和完整的有界分页决策。
- “更改这些标签”或“将其放入集合中”需要实时身份读取、经过审查的写入变更、当前授权和写入后验证。
- “获取生成的报告”可能需要读取Product或workflowartifact，然后传送文件；它不会自动读取附件。
- “运行 workflow X”需要 workflow 发现、描述、选择验证、provider-profile声明时验证以及提交。
- “workflow 进展如何？”应从提交返回的类型化 handle 开始。direct admission 时，保留返回的 `workflowRunId` 并使用 `run`，而不是 workflow 发现。host-queue admission 时，保留 `submissionId`，检查 `workflow submission get`，并且仅将 `workflow queue list` 或 `workflow queue cancel` 用于 queue 层观察或 pending 取消；在 admitted task 暴露 run handle 之前不得虚构 `workflowRunId`。
- “刷新综合图”需要在任何写入之前诊断准确的派生模型和维护范围。
- “为什么这座桥会塌陷？”从语义健康和profile诊断开始； raw `call` 是最后的手段。

当请求跨越系列时，保留每个结果和下一个输入之间的边界。上下文读取不授权变更，workflow 验证不授权提交，运行终止不证明Product交付，维护receipt不证明不相关的模型是当前的。

### 确认所选命令

在执行之前，请从实时 descriptor和详细参考中回答所有这些问题：

- 将运行什么规范命令？
- 哪些值是位置、标志、内联 JSON、标准输入或文件？
- 需要什么对象或类型化的handle身份？
- 该操作是只读的、导航的、写入变更的、维护的还是诊断的？
- 批准可以在哪里进行，其具体范围是什么？
- 结果页面是否发出另一个handle，或者需要稍后的receipt？
- 哪些活生生的证据可以证明所要求的结果？
- 如果调用被中断，重试之前必须检查什么状态或handle？

如果没有任何答案，请不要猜测。继续发现、解析实时身份或将丢失的输入或权限返回为当前阻止程序。

仅在 descriptor 允许时选择相应输入通道：

- 短标量值与类型化 ref 使用直接 flag 和位置参数；
- 仅对简短且已审阅的 payload 使用内联 JSON；
- 较大 payload 使用已记录的路径、`@file` 或表示 stdin 的 `-`；
- 工作流 selection、工作流选项和 provider profile 必须是独立值；
- 命令或 profile helper 要求时使用绝对输出路径。

不得依据名称相似的其他命令重新解释 CLI 选项。生成的命令分面参考会公开全部 binding；若已加载 artifact 与可执行文件不一致，则以当前 binary 的 `surface describe` 结果为准。

## 身份、分页与新鲜度

标题、引文字符串、缓存索引行、生成报告或搜索候选项都不是 Zotero 对象身份。对于指示性请求，先解析当前上下文；保留返回的 library ID 和 item key；仅当后续合同要求父条目时，才把子笔记或附件归一到顶层父条目；报告详细状态或写入前必须读取所选对象。

对于 cursor 或 offset 分页，保留已接受页面以及最后返回的 cursor 或 offset。持续读取，直至响应报告完成或有界请求已满足。中断后从最后接受的位置继续，绝不能重复合并已接受页面。首页为空或搜索被截断都不能证明不存在。

本地索引、snapshot、工作流目录、通知及生成的 Synthesis artifact 都有明确的新鲜度限制。只要请求的结论或写入依赖当前状态，就要重新读取实时对象、selection、permission、run、Product、operation 或工作流描述。

## Effect、approval 与 handle

command card 区分读取、导航、写入、维护和调试操作。导航可能改变可见的 Zotero UI 状态，但不修改书目数据。临时输出或工作流控制不自动等同于文献库变更。维护与调试修复必须有各自经过诊断的 scope，不得作为绕过失败语义命令的捷径。

Zotero 托管写入和 apply-back 始终受声明的 Zotero 端 approval 路径约束。permission 读取仅用于观察，不能批准或拒绝请求。既往 approval、有效 preview、本地校验、通知、缓存 proposal 或终态 run 都不能授权另一项操作。

将每个返回的标识符视为不透明的类型化 handle。Zotero ref、`submissionId`、`queueId`、`workflowRunId`、`skillRunId`、`agentRunId`、`agentRequestId`、`permissionRequestId`、`operationId`、`eventId`、`fileId` 和 Product 标识符必须留在各自声明的命令族内。不得合成、重解释或互换。`submissionId` 标识一次不可变的 native-queue admission，`queueId` 标识该 submission 中的一个 pending unit；二者都不是 workflow-run identity。若 `handleConsumption` 为 `consumed` 或 `unknown`，除非领域 receipt 明确允许继续，否则不得复用该 handle。

## 文件、Product 与 artifact

Zotero 端路径并不自动可供 Agent 读取。附件、Product、artifact 或 operation 返回 `fileId` 或交付说明时，使用声明的下载命令，并在将字节用作证据前校验 checksum 和字节数。访问过期后应从所属对象重新获取，不得猜测存储路径。

区分以下身份：

- 本地路径指向 Agent 可访问的字节；
- `fileId` 是 bridge 签发的短期传输 handle；
- Product 身份指向 Dashboard 记录及其可下载 asset；
- 工作流 artifact 归属于其工作流或条目合同；
- Zotero 附件属于实时文献库状态，必须通过条目读取验证。

对于本地文件回写，先验证 artifact，再上传并保留返回的 checksum 和 `fileId`，执行已批准的附件变更，随后重新读取父条目的附件。已完成的工作流 run 不能证明 Product 或预期 artifact 存在；必须单独检查并下载所需输出。

## 工作流与 run 控制

对于 Zotero 托管执行，发现当前工作流，读取其描述或要求，校验 selection 和工作流选项，再独立校验 backend provider profile，然后通过声明的汇合点提交。在选择监控命令族之前读取返回的 `admission` 分支。direct admission 返回 `workflowRunId`；保留它，并使用 run 命令处理状态、取消、skill 交互、permission 观察、通知、历史与事件。direct-run 取消请求在后续 run 读取确认终态之前仅表示意图。

host-queue admission 返回 `submissionId`、unit 计数和 queue 链接，而不是伪造已经启动的 run。保留该 submission handle，并使用 `workflow submission get` 检查不可变 unit projection 及当前聚合状态。使用 `workflow queue list` 观察 active queue units，仅使用 `workflow queue cancel <queueId>` 取消仍处于 pending 状态的 unit，并使用 `run list --submission <submissionId>` 发现已 admitted 的 Zotero-managed tasks，且不得把 task lineage 与 queue membership 混为一谈。unit 一旦 admitted 或 running，queue cancellation 必须 fail closed；执行取消或交互应使用返回的 `workflowRunId` 及正常 run-control plane。

native queue 负责有界 admission，并让每个 admitted slot 一直占用到 terminal execution 与 apply-back。queue position 或 aggregate submission state 不是 workflow 结果、Product receipt，也不能证明请求的 Zotero 变更存在。分别检查每个 admitted task 及其预期输出，保留 failed 与 canceled units 的不同结果；不得仅因初始响应没有 `workflowRunId` 就重新提交状态不确定的 submission。

active submission 与 queue projections 是 process-local 的。如果 Host 重启后原始 `submissionId` 不再可用，通过 submission-filtered task discovery 和实时 run 读取恢复已经 admitted 的 units；不得根据 label 或 member count 重建 pending units。将不再 active 的未 admitted units 如实报告，在 queue 内部之外保留其原始 source scope，并且只有取得当前授权后才能提交替代的有界请求。

对于 Agent 自主执行，先确认工作流支持该模式，准备 handoff，保留 `agentRunId`、每个 `agentRequestId`、bundle 位置和 checksum，再检查每份请求合同。apply-back 前在本地校验每个已完成结果。通过 `workflow agent-apply` 应用完整的请求到结果映射，并用 `workflow agent-apply-status` 获取持久 receipt。绝不能通过 Zotero 托管 run 平面监控 `agentRunId`。

`workflow agent-bundle inspect` 和 `workflow agent-result validate` 是本地预检命令。它们可接收目录或 ZIP，期间不联系服务、不应用数据、不续租、也不消费 handle。不安全路径、符号链接、重复条目、条目数过多、JSON 过大、归档格式错误或不支持的压缩方式都会返回结构化本地输入失败。本地成功只证明结构有效，不能证明语义正确，也不授权 apply-back。

通知是生命周期信号，不是 transcript、交互目标或授权。回复/连接使用 `skillRunId`，permission 检查使用 `permissionRequestId`，确认事件使用 `eventId`。仅在事件要求的动作已经处理后确认该事件。

## Synthesis 操作边界

将 topic、graph、index、resolver、artifact、concept、schema 与 attention queue 视为不同的派生模型。派生关联不自动构成学术或因果主张，生成的 artifact 也不能证明当前 Zotero 写入。

提出维护前先读取 cache 与 index 状态。reference-sidecar refresh、citation-graph update、graph-metric refresh 与 cache invalidation 是彼此独立的操作，具有不同的 scope、approval、operation ID 和 receipt。需要时保留已提交的 basis hash；不得把一个操作的完成视为另一派生模型仍然最新的证据。

## 硬约束

- 仅使用文档列出的规范 CLI 命令，以及经 `surface describe` 或命令参考确认的 argv。不得猜测 flag，也不得在已有语义命令时改用原始 `call`。
- 绝不能直接读取或修改 Zotero 数据库、存储或应用内部状态。所有文献库写入和 apply-back 操作都必须经过 Zotero 端审批路径。
- 将每个返回的标识符视为不透明的类型化 handle。不得互换不同 handle 类型，不得复用已消费或状态未知的 handle，也不得在需要 bridge 签发的 handle 的位置传入本地路径。
- bearer token 和其他凭据不得出现在命令参数、JSON 结果、诊断信息或任务证据中。
- 将 stdout 视为一个 JSON envelope。按返回值原样保留分页 cursor、文件 checksum、操作 receipt 和输出位置。
- 本地校验成功并不授权后续的 `workflow agent-apply`；Zotero 端预检与审批对 apply 仍具有最终决定权。
- CLI 二进制文件、profile、内嵌合同和 release envelope 必须来自同一个 release set。仅版本字符串一致不足以证明身份一致。
- 不得从缓存 projection、工作流终态、通知、本地 artifact 或生成分析推断 Zotero 当前状态。
- 在持久状态和 handle 消费情况明确前，不得重试会改变状态的调用。
- 不得围绕 `workflow submit` 实现 agent-side workflow queue、plan-entry registry、reservation loop、replay loop 或后台 batching layer。有界 concurrency 与 pending-unit ownership 属于 Zotero 的 native workflow queue。
- 不得把 `submissionId`、`queueId` 和 `workflowRunId` 视为可互换。queue cancellation 仅适用于 pending `queueId`；admitted work 必须通过真实 run handle 控制。

## LLM 与工具职责

- Agent 负责操作选择、语义解读、考虑 approval 的决策、证据使用和恢复选择。
- CLI 负责准确解析 argv、向 Zotero Bridge 服务发送请求、传输类型化 handle、返回结构化错误，以及进行本地 bundle/结果校验。
- renderer 负责生成命令分面参考和内嵌 Agent Surface；不得手工拼装这些 artifact，也不得虚构 handle、receipt、checksum 或结果 envelope。

## 完成条件

当请求操作已返回有效 JSON envelope、所有必要页面或交付字节均已取得、相关 handle 与 receipt 已保留，且所有请求的状态变更都经实时验证时，本 Skill 完成。若结构化失败已完成分类、给出下一项安全动作，并且未发生不安全重复，同样视为完成。

将证据与操作相匹配：

- 对于有界读取，保留稳定对象ref以及响应请求的字段；
- 对于分页结果，保留已完成的边界或最后接受的cursor；
- 对于传递的字节，保留校验和、字节计数和所属对象；
- 对于写入变更，保留批准结果、操作receipt和实时读后；
- 对于异步运行，保留最终状态并单独验证请求的可交付成果；
- 对于 host-queue submission，保留 `submissionId`、每个 unit 的 `queueId`、存在时的 admitted task identity、aggregate terminal projection，以及每个请求 unit 独立验证后的结果或失败；
- 对于本地验证器，仅报告结构有效性，并不暗示远程授权。

## 失败处理

1. 保留命令、脱敏输入、结构化错误码、相关 handle、已接受页面，以及所有 operation 或输出标识符。
2. 从 envelope 读取 `retryable`、`stateChange`、`handleConsumption`、`safeNextActions` 和 `nextCommand`。
3. 若 `stateChange` 为 `changed` 或 `unknown`，再次变更前先读取持久 operation、apply-back receipt、workflow/run 状态或受影响的实时对象。
4. 若 `handleConsumption` 为 `consumed` 或 `unknown`，除非领域 receipt 声明存在可恢复动作，否则不得复用 handle。
5. 仅当 `retryable` 为 true、当前状态允许，且重试不会重复已接受页面、提交、变更、上传或 apply-back 时才可重试。
6. 对部分 apply-back，按 receipt 分别报告已应用、失败及未尝试请求；不得把结果简化成成功，也不得重放完整映射。
7. 对文件或分页失败，保留已验证字节/页面，并且只能通过返回的 cursor、文件所属对象或安全后续命令恢复。
8. 若缺少权限、输入、身份、profile 就绪状态或 approval，返回结构化失败和所需决策，不得绕过 CLI 或 Zotero 端边界。
9. 对状态不确定的 host-queue submission，检查原始 `submissionId`，随后通过 `run list --submission` 关联 admitted tasks；在第一次 admission 结果明确之前绝不能创建第二次 submission。
10. 当 pending cancellation 与 admission 发生竞争时，将 queue endpoint 返回的 conflict 视为所有权已转移到 run plane 的证据，重新读取 submission projection，并且只能使用暴露的 task 或 run handle 继续。

## 参考资料

当不知道规范命令时，首先阅读[命令目录](references/command-catalog.md)。选择规范命令后，仅读取列出的根与命令的第一个标记匹配的引用。每个文件的根目录都是详尽的；活动可执行文件的 `surface describe` 结果在实时操作之前获胜。

- 命令以 `surface`、`bridge` 或 `context` 开头时，阅读[连接与上下文命令](references/commands/connection-and-context.md)。
- 命令以 `library` 开头时，阅读[文献库命令](references/commands/library.md)。
- 命令以 `mutation` 开头时，阅读[变更命令](references/commands/mutation.md)。
- 命令以 `file`、`product` 或 `operation` 开头时，阅读[文件、Product 与操作命令](references/commands/files-products-and-operations.md)。
- 命令以 `workflow` 开头时，阅读[workflow 命令](references/commands/workflow.md)。
- 命令以 `run` 开头时，阅读[run 命令](references/commands/run.md)。
- 命令以 `synthesis` 开头时，阅读[Synthesis 命令](references/commands/synthesis.md)。
- 命令以 `debug` 或 `call` 开头时，阅读[诊断命令](references/commands/diagnostics.md)。
