
# src/workflows/workflowInputPlanning.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/workflowInputPlanning.ts -->

工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。

规模：1251 行
源码：[src/workflows/workflowInputPlanning.ts](../../../../../src/workflows/workflowInputPlanning.ts)

## 符号（18）
<!-- node: function:src/workflows/workflowInputPlanning.ts:applyAttachmentMimeFilter -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:applyCandidateFilters -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:chooseLiteratureSourceByPolicy -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:collectSelectedLiteratureSources -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:createSelectionRuntime -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:evaluateWorkflowSelection -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:filterArtifactConflicts -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:freezeCandidate -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:freezePlan -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:groupCandidates -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:mergeScopedContexts -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:planWorkflowInput -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:readGeneratedNoteFacts -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:relatedEntries -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:resolveArtifactTargetPath -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:selectCandidates -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:selectGeneratedNoteCandidates -->
<!-- node: function:src/workflows/workflowInputPlanning.ts:validateRequiredCounts -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyAttachmentMimeFilter | 函数 | 222–237 | 中等 | selection、attachment、filtering | 0 | 按 mime 白名单过滤附件，区分 markdown 与 PDF 用途。 |
| [applyCandidateFilters](../../../symbols/src/workflows/workflowInputPlanning.ts/applyCandidateFilters.md) | 函数 | 827–924 | 复杂 | planning、filtering、selection | 1 | 应用 manifest 声明的候选过滤规则（kind、mime、计数、生成笔记就绪度）并累积跳过原因统计。 |
| chooseLiteratureSourceByPolicy | 函数 | 283–297 | 中等 | selection、policy、workflow | 0 | 按工作流声明的来源策略在多个候选条目中选出文献主源。 |
| collectSelectedLiteratureSources | 函数 | 298–326 | 中等 | selection、planning、workflow | 0 | 收集选择集中的全部文献候选源并附带附件与日期信息，供分组规划使用。 |
| createSelectionRuntime | 函数 | 75–126 | 复杂 | factory、runtime-context、workflow | 0 | 构造输入规划所需的 Zotero 读取运行时：条目、附件、笔记与文件查询能力按需绑定。 |
| evaluateWorkflowSelection | 函数 | 1237–1251 | 中等 | selection、validation、entry-point | 0 | 快速评估当前选择集是否满足工作流的触发与计数要求，用于菜单启用态判断。 |
| [filterArtifactConflicts](../../../symbols/src/workflows/workflowInputPlanning.ts/filterArtifactConflicts.md) | 函数 | 503–539 | 复杂 | conflict-resolution、artifacts、planning | 1 | 剔除与已存在产物冲突的候选路径，并记录冲突原因供 UI 展示。 |
| freezeCandidate | 函数 | 672–699 | 中等 | immutability、planning、selection | 0 | 冻结单个候选条目：固定身份、标签与来源引用，防止规划中途被宿主变更影响。 |
| [freezePlan](../../../symbols/src/workflows/workflowInputPlanning.ts/freezePlan.md) | 函数 | 1084–1118 | 复杂 | immutability、planning、entry-point | 1 | 把规划结果冻结为不可变输入计划，并附上计数与跳过原因统计。 |
| [groupCandidates](../../../symbols/src/workflows/workflowInputPlanning.ts/groupCandidates.md) | 函数 | 987–1074 | 复杂 | planning、grouping、workflow | 1 | 按工作流声明的分组策略把候选聚为执行单元，并为每组派生任务名与选择上下文。 |
| mergeScopedContexts | 函数 | 926–955 | 中等 | selection、merge、planning | 0 | 合并多个作用域的选择上下文，保持条目顺序稳定且不重复。 |
| [planWorkflowInput](../../../symbols/src/workflows/workflowInputPlanning.ts/planWorkflowInput.md) | 函数 | 1120–1235 | 复杂 | planning、workflow、entry-point、selection | 1 | 工作流输入规划入口：读取选择集、应用计数与就绪度规则、分组并冻结为可执行计划。 |
| readGeneratedNoteFacts | 函数 | 350–394 | 复杂 | zotero-host、selection、readiness | 0 | 读取条目上已生成笔记的事实信息，判断产物是否已经就绪。 |
| relatedEntries | 函数 | 712–741 | 复杂 | selection、graph-traversal、planning | 0 | 按父子引用关系把条目与附件、笔记聚合为同一执行分组。 |
| resolveArtifactTargetPath | 函数 | 464–493 | 中等 | path-handling、artifacts、workflow | 1 | 解析产物在 Zotero 存储中的目标路径，规范化分隔符并限制在受管目录内。 |
| [selectCandidates](../../../symbols/src/workflows/workflowInputPlanning.ts/selectCandidates.md) | 函数 | 742–811 | 复杂 | planning、selection、filtering | 1 | 按选择计数规则在分组内挑选实际参与执行的候选，跳过项记录原因。 |
| selectGeneratedNoteCandidates | 函数 | 541–565 | 中等 | selection、notes、planning | 0 | 筛选可作为生成笔记宿主的父项候选。 |
| validateRequiredCounts | 函数 | 176–199 | 中等 | validation、selection、workflow | 0 | 校验选择集是否满足 manifest 声明的各类条目计数要求。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [helpers.ts](helpers.ts.md) | src/workflows/helpers.ts | 工作流 hook 辅助层：为用户编写的 hook 提供条目解析、路径处理与产物就绪判定等安全封装。 |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [libraryArtifactReadiness.ts](../modules/zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [localization.ts](localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [selectionContext.ts](../modules/selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [triggerPolicy.ts](triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostContract.ts](workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
| [zoteroHostAccessOptions.ts](zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../modules/workflowExecution/contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [declarativeRequestCompiler.ts](declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts | 声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。 |
| [hostBridgeWorkflowControl.ts](../modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [preparationSeam.ts](../modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [runtime.ts](runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [workflowDebugProbe.ts](../modules/workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowMenu.ts](../modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| evaluateWorkflowSelection | 函数 | 1237–1251 | 快速评估当前选择集是否满足工作流的触发与计数要求，用于菜单启用态判断。 |
| [planWorkflowInput](../../../symbols/src/workflows/workflowInputPlanning.ts/planWorkflowInput.md) | 函数 | 1120–1235 | 工作流输入规划入口：读取选择集、应用计数与就绪度规则、分组并冻结为可执行计划。 |
