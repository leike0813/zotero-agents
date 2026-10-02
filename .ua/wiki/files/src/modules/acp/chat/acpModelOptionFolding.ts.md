
# src/modules/acp/chat/acpModelOptionFolding.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpModelOptionFolding.ts -->

ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。
源码：[src/modules/acp/chat/acpModelOptionFolding.ts](../../../../../../../src/modules/acp/chat/acpModelOptionFolding.ts)

## 符号（8）
<!-- node: function:src/modules/acp/chat/acpModelOptionFolding.ts:buildAcpFoldedModelGroups -->
<!-- node: function:src/modules/acp/chat/acpModelOptionFolding.ts:foldAcpModelOptions -->
<!-- node: function:src/modules/acp/chat/acpModelOptionFolding.ts:listAcpModelOptionsForProvider -->
<!-- node: function:src/modules/acp/chat/acpModelOptionFolding.ts:parseAcpEffortFromModelText -->
<!-- node: function:src/modules/acp/chat/acpModelOptionFolding.ts:parseAcpModelEffortVariant -->
<!-- node: function:src/modules/acp/chat/acpModelOptionFolding.ts:projectAcpProviderModelOptionsForUi -->
<!-- node: function:src/modules/acp/chat/acpModelOptionFolding.ts:resolveAcpDisplayModelIdForProviderSelection -->
<!-- node: function:src/modules/acp/chat/acpModelOptionFolding.ts:resolveAcpRawModelIdForSelection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [buildAcpFoldedModelGroups](../../../../../symbols/src/modules/acp/chat/acpModelOptionFolding.ts/buildAcpFoldedModelGroups.md) | 函数 | 364–396 | 中等 | acp、model-selection、grouping | 2 | 按 provider 与 effort 层级构造折叠分组，剔除重复项并保持后端返回顺序。 |
| foldAcpModelOptions | 函数 | 408–467 | 中等 | acp、model-selection、ui-projection、core | 0 | 折叠模型选项列表，产出分组视图模型并保留每个选项到 raw model id 的反查关系。 |
| listAcpModelOptionsForProvider | 函数 | 135–162 | 简单 | acp、model-selection、query | 0 | 列出指定 provider 的模型选项，未指定 provider 时回退到全部 unscoped 选项。 |
| parseAcpEffortFromModelText | 函数 | 299–331 | 中等 | acp、parsing、reasoning-effort、model-selection | 1 | 从模型展示文本尾部解析 reasoning effort 变体，识别已知档位并保留未知后缀。 |
| parseAcpModelEffortVariant | 函数 | 333–351 | 简单 | acp、parsing、model-selection | 0 | 把模型 id 拆成基础 id 与 effort 变体两部分，供折叠分组使用。 |
| projectAcpProviderModelOptionsForUi | 函数 | 219–251 | 中等 | acp、ui-projection、model-selection | 0 | 把运行时归一化后的模型选项投影成 UI 所需的 provider 分组结构。 |
| resolveAcpDisplayModelIdForProviderSelection | 函数 | 164–217 | 中等 | acp、model-selection、normalization | 0 | 在切换 provider 时把已选模型映射到该 provider 下等价或最接近的展示 id。 |
| resolveAcpRawModelIdForSelection | 函数 | 469–500 | 中等 | acp、model-selection、protocol、core | 0 | 把 UI 选中的折叠项还原为协议需要的原始 model id，是展示层与协议层之间的唯一还原点。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionConfigOptions.ts](acpSessionConfigOptions.ts.md) | src/modules/acp/chat/acpSessionConfigOptions.ts | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunActions.ts](../skillRun/acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunPersistence.ts](../skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunStore.ts](../skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [profile.ts](../../../providers/profile.ts.md) | src/providers/profile.ts | Provider Profile 层：把后端实例投影为可校验、可指纹化的 provider profile，并按 provider 运行时选项 schema 校验取值。 |
| [provider.ts](../../../providers/acp/provider.ts.md) | src/providers/acp/provider.ts | ACP Provider：把工作流请求转交 ACP 后端执行，负责模型选项折叠、SkillRun 编排调用与运行时选项归一。 |
| [workflowSettings.ts](../../workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialog.ts](../../workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |
| [workflowSettingsDialogModel.ts](../../workflow/settings/workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [buildAcpFoldedModelGroups](../../../../../symbols/src/modules/acp/chat/acpModelOptionFolding.ts/buildAcpFoldedModelGroups.md) | 函数 | 364–396 | 按 provider 与 effort 层级构造折叠分组，剔除重复项并保持后端返回顺序。 |
| foldAcpModelOptions | 函数 | 408–467 | 折叠模型选项列表，产出分组视图模型并保留每个选项到 raw model id 的反查关系。 |
| listAcpModelOptionsForProvider | 函数 | 135–162 | 列出指定 provider 的模型选项，未指定 provider 时回退到全部 unscoped 选项。 |
| parseAcpEffortFromModelText | 函数 | 299–331 | 从模型展示文本尾部解析 reasoning effort 变体，识别已知档位并保留未知后缀。 |
| resolveAcpRawModelIdForSelection | 函数 | 469–500 | 把 UI 选中的折叠项还原为协议需要的原始 model id，是展示层与协议层之间的唯一还原点。 |
