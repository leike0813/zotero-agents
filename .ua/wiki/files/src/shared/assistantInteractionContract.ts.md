
# src/shared/assistantInteractionContract.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/assistantInteractionContract.ts -->

Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。
源码：[src/shared/assistantInteractionContract.ts](../../../../../src/shared/assistantInteractionContract.ts)

## 符号（11）
<!-- node: function:src/shared/assistantInteractionContract.ts:boundedJsonValue -->
<!-- node: function:src/shared/assistantInteractionContract.ts:deterministicInteractionResponseText -->
<!-- node: function:src/shared/assistantInteractionContract.ts:hasExactKeys -->
<!-- node: function:src/shared/assistantInteractionContract.ts:normalizeFileReply -->
<!-- node: function:src/shared/assistantInteractionContract.ts:normalizeFileSlot -->
<!-- node: function:src/shared/assistantInteractionContract.ts:normalizeInteraction -->
<!-- node: function:src/shared/assistantInteractionContract.ts:normalizeInteractionAuth -->
<!-- node: function:src/shared/assistantInteractionContract.ts:normalizeOption -->
<!-- node: function:src/shared/assistantInteractionContract.ts:parseAssistantPendingInteraction -->
<!-- node: function:src/shared/assistantInteractionContract.ts:projectAssistantPendingInteraction -->
<!-- node: function:src/shared/assistantInteractionContract.ts:projectAssistantPendingInteractionFromHints -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| boundedJsonValue | 函数 | 188–199 | 简单 | validation、limits、contract | 0 | 按深度与字节上限校验并裁剪任意 JSON 值，阻断超大或过深的选项载荷。 |
| deterministicInteractionResponseText | 函数 | 506–520 | 简单 | determinism、contract、text、exported | 0 | 为确定性交互（确认/单选）生成稳定的回传文案，保证幂等与可测试。 |
| hasExactKeys | 函数 | 127–138 | 简单 | validation、contract、defensive | 0 | 校验对象是否恰好包含期望键集合且无多余字段，是交互负载的严格入口守卫。 |
| normalizeFileReply | 函数 | 241–265 | 简单 | normalization、upload、limits | 0 | 归一化文件回复负载，限制文件数量与总字节并拒绝非法 mime。 |
| normalizeFileSlot | 函数 | 221–239 | 简单 | normalization、upload、contract | 0 | 归一化文件上传槽位，校验名称、mime 与大小约束。 |
| normalizeInteraction | 函数 | 345–404 | 中等 | normalization、contract、dispatch | 0 | 待用户交互的统一归一化入口，按输入类型分派并对未知类型安全降级。 |
| normalizeInteractionAuth | 函数 | 267–337 | 中等 | normalization、permission、contract | 0 | 归一化待授权交互（permission / choice / 确认），裁剪提示与选项数量上限。 |
| normalizeOption | 函数 | 201–219 | 简单 | normalization、contract、validation | 0 | 归一化单个交互选项：裁剪 label/description 并保留结构化 value。 |
| parseAssistantPendingInteraction | 函数 | 500–504 | 简单 | parsing、contract、defensive、exported | 1 | 解析页面回传的待交互负载，失败时返回空值而不抛出。 |
| projectAssistantPendingInteraction | 函数 | 406–410 | 简单 | projection、contract、boundary、exported | 0 | 投影已归一化的待交互对象为页面 wire 形状，是跨界传输前的最后一道裁剪。 |
| projectAssistantPendingInteractionFromHints | 函数 | 412–498 | 中等 | projection、contract、boundary、exported | 0 | 从宿主侧 hint 字段投影出可下发给页面的待交互视图，隐藏仅宿主可见的内部字段。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunInteractionFiles.ts](../modules/acp/skillRun/acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [acpSkillsWorkspaceSurface.ts](../modules/acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [assistantReadonlyPublication.ts](../modules/harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [assistantWorkspaceAcpChild.js](../sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |
| [assistantWorkspaceActionRouter.ts](../modules/assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublication.ts](../modules/assistant/publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [managementClient.ts](../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [skillRunnerHandshakeProtocol.ts](../modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts | 握手协议的契约层：定义请求/响应 schema id、已支持的协议常量集合，以及旧版后端的兼容能力合成与交互文件能力协商逻辑。 |
| [skillRunnerRunDialog.ts](../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerWorkspaceSurface.ts](../modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| deterministicInteractionResponseText | 函数 | 506–520 | 为确定性交互（确认/单选）生成稳定的回传文案，保证幂等与可测试。 |
| parseAssistantPendingInteraction | 函数 | 500–504 | 解析页面回传的待交互负载，失败时返回空值而不抛出。 |
| projectAssistantPendingInteraction | 函数 | 406–410 | 投影已归一化的待交互对象为页面 wire 形状，是跨界传输前的最后一道裁剪。 |
| projectAssistantPendingInteractionFromHints | 函数 | 412–498 | 从宿主侧 hint 字段投影出可下发给页面的待交互视图，隐藏仅宿主可见的内部字段。 |
