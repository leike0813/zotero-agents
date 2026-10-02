
# src/workflows/runtime.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/runtime.ts -->

工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。

规模：1294 行
源码：[src/workflows/runtime.ts](../../../../../src/workflows/runtime.ts)

## 符号（11）
<!-- node: function:src/workflows/runtime.ts:assertPreflightOutcome -->
<!-- node: function:src/workflows/runtime.ts:createHookRuntimeContext -->
<!-- node: function:src/workflows/runtime.ts:createNoValidInputUnitsError -->
<!-- node: function:src/workflows/runtime.ts:createRuntimeContext -->
<!-- node: function:src/workflows/runtime.ts:enrichRequestWithSelectionMeta -->
<!-- node: function:src/workflows/runtime.ts:executeApplyResult -->
<!-- node: function:src/workflows/runtime.ts:executeBuildRequests -->
<!-- node: function:src/workflows/runtime.ts:planWorkflowExecutionUnits -->
<!-- node: function:src/workflows/runtime.ts:runWorkflowHookWithDiagnostics -->
<!-- node: function:src/workflows/runtime.ts:withNormalizedSkillRunnerRuntimeOptions -->
<!-- node: function:src/workflows/runtime.ts:withWorkflowExecutionRuntimeScope -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [assertPreflightOutcome](../../../symbols/src/workflows/runtime.ts/assertPreflightOutcome.md) | 函数 | 330–376 | 复杂 | validation、preflight、workflow | 1 | 校验 preflight hook 结论的合法性：状态取值、阻断原因与请求元信息必须自洽。 |
| createHookRuntimeContext | 函数 | 565–592 | 中等 | factory、runtime-context、hook | 1 | 构造 hook 专用的运行时上下文视图：绑定已选能力源与执行期诊断句柄，隐藏内部执行状态。 |
| createNoValidInputUnitsError | 函数 | 151–174 | 中等 | error-handling、diagnostics、workflow | 0 | 构造"无有效执行单元"错误：附带筛选与跳过原因统计，帮助用户判断是选择问题还是规划规则问题。 |
| createRuntimeContext | 函数 | 412–518 | 复杂 | factory、runtime-context、workflow、host-bridge | 0 | 构造注入 hook 的运行时上下文：宿主能力投影、文件系统 adapter、选择集、参数与 locale。 |
| enrichRequestWithSelectionMeta | 函数 | 280–310 | 中等 | metadata、selection、workflow | 0 | 把选择集元信息（条目类型分布、计数、来源）附加到请求上，供后端与诊断使用。 |
| executeApplyResult | 函数 | 1212–1294 | 复杂 | workflow、orchestration、execution、entry-point | 0 | 执行 applyResult 阶段：把后端结果交给 hook 决定产物写入、笔记生成与回填开关，并归一执行结果。 |
| executeBuildRequests | 函数 | 891–1210 | 复杂 | workflow、orchestration、execution | 0 | 执行单元的 build 阶段主循环：逐单元编译声明式请求、调用 hook 构建请求并汇总 build 结果与失败原因。 |
| planWorkflowExecutionUnits | 函数 | 850–889 | 复杂 | workflow、planning、entry-point | 0 | 按输入规划与选择集生成工作流执行单元列表，决定任务数、顺序与各自的选择子集。 |
| [runWorkflowHookWithDiagnostics](../../../symbols/src/workflows/runtime.ts/runWorkflowHookWithDiagnostics.md) | 函数 | 604–823 | 复杂 | hook、diagnostics、error-handling | 2 | 带诊断地执行单个 hook：注入上下文、捕获异常、附加 hook 失败元数据并按来源记录运行时日志。 |
| withNormalizedSkillRunnerRuntimeOptions | 函数 | 218–278 | 复杂 | runtime-options、normalization、workflow | 0 | 在请求上应用归一后的 SkillRunner 运行时选项，并对不支持的选项走剥离告警路径。 |
| [withWorkflowExecutionRuntimeScope](../../../symbols/src/workflows/runtime.ts/withWorkflowExecutionRuntimeScope.md) | 函数 | 520–563 | 复杂 | security、scoping、host-bridge | 1 | 以受控 leaf scope 包裹工作流执行期调用，确保 hook 只能访问本次执行声明的能力面。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../modules/workflowExecution/contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [debugMode.ts](../modules/debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [declarativeRequestCompiler.ts](declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts | 声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。 |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [errorMeta.ts](errorMeta.ts.md) | src/workflows/errorMeta.ts | 工作流 hook 失败元数据：把 hook 名、工作流标识与能力来源挂到异常对象上，供诊断层读取并生成可读的失败摘要。 |
| [helpers.ts](helpers.ts.md) | src/workflows/helpers.ts | 工作流 hook 辅助层：为用户编写的 hook 提供条目解析、路径处理与产物就绪判定等安全封装。 |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [hostBridgeWorkflowResources.ts](../modules/hostBridge/workflow/hostBridgeWorkflowResources.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts | Host Bridge 工作流资源层：管理一次运行期间的输入输出槽位绑定、文件登记与物化，为工作流提供受约束的读写资源 API。 |
| [localization.ts](localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [requestContracts.ts](../providers/requestContracts.ts.md) | src/providers/requestContracts.ts | Provider 请求契约校验层：为每种 request kind 定义 provider/backend 兼容矩阵与负载校验规则，并在调度前断言契约成立。 |
| [requestMeta.ts](../modules/workflowExecution/requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [selectionContext.ts](../modules/selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [skillRunFeedback.ts](../modules/skillRunner/run/skillRunFeedback.ts.md) | src/modules/skillRunner/run/skillRunFeedback.ts | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [testPerformanceProbeBridge.ts](../modules/testPerformanceProbeBridge.ts.md) | src/modules/testPerformanceProbeBridge.ts | 测试性能探针桥：把性能 span 记录钩子挂到 globalThis 上，供工作流运行时与 Host API 在测试环境中零成本埋点，不启用时所有调用直接短路返回。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [wait.ts](../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [workflowHostClient.ts](../modules/synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |
| [workflowHostContract.ts](workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
| [workflowInputPlanning.ts](workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowPackageDiagnostics.ts](../modules/workflow/catalog/workflowPackageDiagnostics.ts.md) | src/modules/workflow/catalog/workflowPackageDiagnostics.ts | 工作流包诊断通道：在 debug 模式或诊断详细级别下，把工作流运行时可用能力摘要与 hook 诊断信息写入 runtimeLog，并按诊断级别选择 console 通道输出。 |
| [workflowProductStore.ts](../modules/workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [zoteroHostAccessOptions.ts](zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRecovery.ts](../modules/acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [applySeam.ts](../modules/workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [e2e-single-markdown-live.ts](../../scripts/e2e-single-markdown-live.ts.md) | scripts/e2e-single-markdown-live.ts | 端到端演练脚本：加载 single-markdown 工作流包，用 SkillRunner provider 真实提交一次请求并落盘产物，用于验证工作流运行时到后端的完整链路。 |
| [hostBridgeWorkflowControl.ts](../modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [inspect-literature-analysis.ts](../../scripts/inspect-literature-analysis.ts.md) | scripts/inspect-literature-analysis.ts | 调研脚本：针对 literature-analysis 工作流，检查 manifest 输入过滤、附件候选与选区解析结果，用于调试工作流输入物化。 |
| [inspect-single-markdown-request.ts](../../scripts/inspect-single-markdown-request.ts.md) | scripts/inspect-single-markdown-request.ts | 调研脚本：重建 single-markdown 工作流请求的完整报文，包括 job queue 记录与 SkillRunner provider 的上传字段。 |
| [preparationSeam.ts](../modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [sequenceStepApply.ts](../modules/workflowExecution/sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [skillRunnerForegroundContinuation.ts](../modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| executeApplyResult | 函数 | 1212–1294 | 执行 applyResult 阶段：把后端结果交给 hook 决定产物写入、笔记生成与回填开关，并归一执行结果。 |
| executeBuildRequests | 函数 | 891–1210 | 执行单元的 build 阶段主循环：逐单元编译声明式请求、调用 hook 构建请求并汇总 build 结果与失败原因。 |
| planWorkflowExecutionUnits | 函数 | 850–889 | 按输入规划与选择集生成工作流执行单元列表，决定任务数、顺序与各自的选择子集。 |
