
# src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts -->

Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。
源码：[src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts)

## 符号（7）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts:collisionSafeName -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts:pickAssistantInteractionFiles -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts:randomSubmissionKey -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts:renderFileReplyPrompt -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts:safeManagedFileName -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts:stageAcpSkillRunInteractionFiles -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts:submitAcpSkillRunInteractionFiles -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collisionSafeName | 函数 | 97–115 | 简单 | acp、filesystem、safety | 0 | 在受管目录中为文件挑选不冲突的名称，避免同名覆盖。 |
| pickAssistantInteractionFiles | 函数 | 222–255 | 中等 | acp、interaction、file-picker | 0 | 驱动平台文件选择器收集用户文件，产出待暂存的路径列表。 |
| randomSubmissionKey | 函数 | 58–72 | 简单 | acp、interaction、security | 0 | 生成一次性提交键，用于把用户回传的交互文件绑定到具体请求。 |
| renderFileReplyPrompt | 函数 | 117–132 | 简单 | acp、interaction、prompt | 1 | 渲染把交互文件交给 Agent 的回复提示，包含文件路径与提交键说明。 |
| safeManagedFileName | 函数 | 74–95 | 中等 | acp、security、path-normalization | 1 | 把用户文件名规范化为受管目录内的安全名称，剥离路径分隔符与危险字符。 |
| stageAcpSkillRunInteractionFiles | 函数 | 134–220 | 复杂 | acp、interaction、file-transfer、entry-point | 0 | 把用户选择的文件暂存到受管目录并生成提交键，供 Agent 在下一轮读取。 |
| submitAcpSkillRunInteractionFiles | 函数 | 257–309 | 复杂 | acp、interaction、entry-point、validation | 0 | 提交交互文件：校验提交键、渲染回复提示并把请求投递回运行中的 Skill。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePromptTemplates.ts](acpRuntimePromptTemplates.ts.md) | src/modules/acp/skillRun/acpRuntimePromptTemplates.ts | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |
| [acpSkillRunActions.ts](acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [assistantInteractionContract.ts](../../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [filePicker.ts](../../../platform/filePicker.ts.md) | src/platform/filePicker.ts | 跨运行时文件选择器：优先使用宿主提供的原生多选文件对话框，在不可用时回退到 toolkit 的 FilePicker，并负责挑选可用的 parent window。 |
| [path.ts](../../../platform/path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [runtimeFileTransfer.ts](../../runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| pickAssistantInteractionFiles | 函数 | 222–255 | 驱动平台文件选择器收集用户文件，产出待暂存的路径列表。 |
| stageAcpSkillRunInteractionFiles | 函数 | 134–220 | 把用户选择的文件暂存到受管目录并生成提交键，供 Agent 在下一轮读取。 |
| submitAcpSkillRunInteractionFiles | 函数 | 257–309 | 提交交互文件：校验提交键、渲染回复提示并把请求投递回运行中的 Skill。 |
