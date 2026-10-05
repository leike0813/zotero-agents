
# src/workflows/zoteroHostAccessOptions.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/zoteroHostAccessOptions.ts -->

Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。

规模：171 行
源码：[src/workflows/zoteroHostAccessOptions.ts](../../../../../src/workflows/zoteroHostAccessOptions.ts)

## 符号（9）
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:buildWorkflowRunOptionsForUi -->
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:buildZoteroHostAccessRuntimeOptions -->
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:extractAutoApproveZoteroWrites -->
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:normalizeAutoApproveZoteroWrites -->
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:normalizeWorkflowRunOptions -->
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:resolveWorkflowZoteroHostAccessRequired -->
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:stripZoteroHostAccessRuntimeOptionFromRequest -->
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:stripZoteroHostAccessRuntimeParams -->
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:workflowAllowsWriteApprovalBypass -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildWorkflowRunOptionsForUi | 函数 | 100–114 | 简单 | ui-contract、projection、workflow | 0 | 把工作流运行选项投影为 UI 可直接消费的扁平结构。 |
| buildZoteroHostAccessRuntimeOptions | 函数 | 135–148 | 中等 | runtime-options、zotero-host、security | 0 | 构造注入 provider 的 zotero_host_access 运行时选项，审批开关默认不外发。 |
| extractAutoApproveZoteroWrites | 函数 | 49–60 | 简单 | normalization、workflow、options | 0 | 从工作流运行参数中提取并归一自动审批写入开关。 |
| [normalizeAutoApproveZoteroWrites](../../../symbols/src/workflows/zoteroHostAccessOptions.ts/normalizeAutoApproveZoteroWrites.md) | 函数 | 33–47 | 简单 | normalization、security、options | 2 | 归一 autoApproveZoteroWrites 参数：仅接受布尔值，其它输入回退为 false。 |
| normalizeWorkflowRunOptions | 函数 | 79–98 | 中等 | normalization、workflow、options | 0 | 归一整份工作流运行选项，剥离未知字段并保证 zoteroHostAccess 子结构形状合法。 |
| resolveWorkflowZoteroHostAccessRequired | 函数 | 69–77 | 简单 | workflow、resolution、zotero-host | 0 | 解析工作流是否需要 Zotero 宿主访问能力，综合 hostAccess 声明与 writeApprovalBypass 开关。 |
| stripZoteroHostAccessRuntimeOptionFromRequest | 函数 | 150–171 | 中等 | runtime-options、compatibility、error-handling | 0 | 在旧后端不支持该选项时，从已构建请求中移除 zotero_host_access 并附带告警码。 |
| stripZoteroHostAccessRuntimeParams | 函数 | 116–133 | 中等 | runtime-options、zotero-host、compatibility | 0 | 从工作流参数中剥离 ZoteroHostAccess 相关字段，保留原始参数供降级路径使用。 |
| workflowAllowsWriteApprovalBypass | 函数 | 24–31 | 简单 | security、policy、workflow | 1 | 判断工作流是否显式声明可绕过写入审批，默认不允许。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRequestAdapter.ts](../modules/acp/skillRun/acpSkillRunRequestAdapter.ts.md) | src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts | 请求适配器：把 SkillRunner 风格的 job 记录转换为统一的 ACP skill run 请求对象，屏蔽两种后端形态的差异。 |
| [preparationSeam.ts](../modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [runtime.ts](runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [workflowInputPlanning.ts](workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowSettings.ts](../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDomain.ts](../modules/workflow/settings/workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [workflowSettingsOptionLocalization.ts](../modules/workflow/settings/workflowSettingsOptionLocalization.ts.md) | src/modules/workflow/settings/workflowSettingsOptionLocalization.ts | Provider 运行时选项与工作流运行选项的文案本地化，优先按 locale key 查表，缺失时回落到 schema 自带文本。 |
| [workflowSettingsWebDialog.ts](../modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildWorkflowRunOptionsForUi | 函数 | 100–114 | 把工作流运行选项投影为 UI 可直接消费的扁平结构。 |
| buildZoteroHostAccessRuntimeOptions | 函数 | 135–148 | 构造注入 provider 的 zotero_host_access 运行时选项，审批开关默认不外发。 |
| extractAutoApproveZoteroWrites | 函数 | 49–60 | 从工作流运行参数中提取并归一自动审批写入开关。 |
| [normalizeAutoApproveZoteroWrites](../../../symbols/src/workflows/zoteroHostAccessOptions.ts/normalizeAutoApproveZoteroWrites.md) | 函数 | 33–47 | 归一 autoApproveZoteroWrites 参数：仅接受布尔值，其它输入回退为 false。 |
| normalizeWorkflowRunOptions | 函数 | 79–98 | 归一整份工作流运行选项，剥离未知字段并保证 zoteroHostAccess 子结构形状合法。 |
| resolveWorkflowZoteroHostAccessRequired | 函数 | 69–77 | 解析工作流是否需要 Zotero 宿主访问能力，综合 hostAccess 声明与 writeApprovalBypass 开关。 |
| stripZoteroHostAccessRuntimeOptionFromRequest | 函数 | 150–171 | 在旧后端不支持该选项时，从已构建请求中移除 zotero_host_access 并附带告警码。 |
| stripZoteroHostAccessRuntimeParams | 函数 | 116–133 | 从工作流参数中剥离 ZoteroHostAccess 相关字段，保留原始参数供降级路径使用。 |
| workflowAllowsWriteApprovalBypass | 函数 | 24–31 | 判断工作流是否显式声明可绕过写入审批，默认不允许。 |
