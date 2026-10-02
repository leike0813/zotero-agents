
# src/workflows/localization.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/localization.ts -->

工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。

规模：331 行
源码：[src/workflows/localization.ts](../../../../../src/workflows/localization.ts)

## 符号（7）
<!-- node: function:src/workflows/localization.ts:compareWorkflowDisplayOrder -->
<!-- node: function:src/workflows/localization.ts:localizeWorkflowLabel -->
<!-- node: function:src/workflows/localization.ts:localizeWorkflowParameterSchema -->
<!-- node: function:src/workflows/localization.ts:localizeWorkflowSkillName -->
<!-- node: function:src/workflows/localization.ts:localizeWorkflowTaskNameTemplate -->
<!-- node: function:src/workflows/localization.ts:resolveLocalizedValue -->
<!-- node: function:src/workflows/localization.ts:resolveWorkflowDisplayLocale -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compareWorkflowDisplayOrder | 函数 | 233–254 | 中等 | sorting、workflow、display | 0 | 工作流排序比较：先按显式 displayOrder，再按本地化标签与 id 稳定排序。 |
| localizeWorkflowLabel | 函数 | 210–231 | 中等 | i18n、display、workflow | 0 | 解析工作流显示标签：优先取本地化名称，其次取 emoji 与名称组合。 |
| localizeWorkflowParameterSchema | 函数 | 288–313 | 中等 | i18n、schema、workflow | 0 | 本地化参数 schema 的标题、描述与枚举标签，保持取值语义不变。 |
| localizeWorkflowSkillName | 函数 | 269–286 | 中等 | i18n、workflow、skill | 0 | 解析工作流对应的 skill 显示名，未声明时回退到 skill id。 |
| localizeWorkflowTaskNameTemplate | 函数 | 256–267 | 简单 | i18n、template-engine、workflow | 0 | 本地化工作流任务名模板，保持占位符原样不被翻译破坏。 |
| resolveLocalizedValue | 函数 | 124–166 | 复杂 | i18n、fallback、localization | 0 | 按 locale → 语言 → 源语言的回退顺序解析本地化值，支持单值与按语言分组两种消息形态。 |
| resolveWorkflowDisplayLocale | 函数 | 28–65 | 中等 | i18n、parsing、localization | 0 | 从 Accept-Language 风格字符串解析出实际使用的显示 locale。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRecovery.ts](../modules/acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [dashboardReadonlyModel.ts](../modules/harness/dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |
| [dashboardSnapshot.ts](../modules/dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hostBridgeWorkflowAgentRun.ts](../modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [hostBridgeWorkflowControl.ts](../modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [preparationSeam.ts](../modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [runSeam.ts](../modules/workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [runtime.ts](runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [skillRunnerReadonlyProjection.ts](../modules/harness/skillRunnerReadonlyProjection.ts.md) | src/modules/harness/skillRunnerReadonlyProjection.ts | SkillRunner 只读投影：把插件状态中的 run 记录与 sequence 状态投影成 Harness 可见的运行列表，附带状态语义与技能显示名。 |
| [skillRunnerRunStore.ts](../modules/skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [workflowExecute.ts](../modules/workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowInputPlanning.ts](workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowMenu.ts](../modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowSettings.ts](../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialog.ts](../modules/workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| localizeWorkflowLabel | 函数 | 210–231 | 解析工作流显示标签：优先取本地化名称，其次取 emoji 与名称组合。 |
| localizeWorkflowParameterSchema | 函数 | 288–313 | 本地化参数 schema 的标题、描述与枚举标签，保持取值语义不变。 |
| localizeWorkflowSkillName | 函数 | 269–286 | 解析工作流对应的 skill 显示名，未声明时回退到 skill id。 |
| localizeWorkflowTaskNameTemplate | 函数 | 256–267 | 本地化工作流任务名模板，保持占位符原样不被翻译破坏。 |
| resolveWorkflowDisplayLocale | 函数 | 28–65 | 从 Accept-Language 风格字符串解析出实际使用的显示 locale。 |
