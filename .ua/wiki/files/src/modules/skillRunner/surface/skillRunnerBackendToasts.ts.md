
# src/modules/skillRunner/surface/skillRunnerBackendToasts.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/surface](../../../../../modules/src/modules/skillRunner/surface.md)
<!-- node: file:src/modules/skillRunner/surface/skillRunnerBackendToasts.ts -->

后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。
源码：[src/modules/skillRunner/surface/skillRunnerBackendToasts.ts](../../../../../../../src/modules/skillRunner/surface/skillRunnerBackendToasts.ts)

## 符号（3）
<!-- node: function:src/modules/skillRunner/surface/skillRunnerBackendToasts.ts:createSkillRunnerBackendToastPayload -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerBackendToasts.ts:resolveSkillRunnerBackendToastText -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerBackendToasts.ts:showSkillRunnerBackendToast -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSkillRunnerBackendToastPayload | 函数 | 59–82 | 中等 | ui、serialization、notification | 1 | 从提示类型与后端信息组装 toast payload，包含级别、标题、正文与可点击动作。 |
| resolveSkillRunnerBackendToastText | 函数 | 44–57 | 简单 | localization、ui、notification | 1 | 按 toast 场景选择本地化文案 key 并填入后端显示名等参数。 |
| showSkillRunnerBackendToast | 函数 | 95–124 | 中等 | ui、notification、skillrunner | 0 | 构造并展示一条后端状态 toast，按严重级别选择样式与本地化文案。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [displayName.ts](../../../backends/displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [feedbackSeam.ts](../../workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [identity.ts](../../../backends/identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [localizationGovernance.ts](../../../utils/localizationGovernance.ts.md) | src/utils/localizationGovernance.ts | 本地化治理层：canonicalize locale、按语言回退链取值、识别未解析的原始文案，并集中产出托管本地运行时与 SkillRunner 后端相关的 toast 文案。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerBackendReachabilityCoordinator.ts](../connection/skillRunnerBackendReachabilityCoordinator.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [skillRunnerRunDialog.ts](skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerTaskReconciler.ts](../run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSkillRunnerBackendToastPayload | 函数 | 59–82 | 从提示类型与后端信息组装 toast payload，包含级别、标题、正文与可点击动作。 |
| resolveSkillRunnerBackendToastText | 函数 | 44–57 | 按 toast 场景选择本地化文案 key 并填入后端显示名等参数。 |
| showSkillRunnerBackendToast | 函数 | 95–124 | 构造并展示一条后端状态 toast，按严重级别选择样式与本地化文案。 |
