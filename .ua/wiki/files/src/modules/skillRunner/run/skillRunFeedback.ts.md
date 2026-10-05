
# src/modules/skillRunner/run/skillRunFeedback.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunFeedback.ts -->

Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。
源码：[src/modules/skillRunner/run/skillRunFeedback.ts](../../../../../../../src/modules/skillRunner/run/skillRunFeedback.ts)

## 符号（6）
<!-- node: function:src/modules/skillRunner/run/skillRunFeedback.ts:buildFeedbackCandidates -->
<!-- node: function:src/modules/skillRunner/run/skillRunFeedback.ts:collectSkillRunFeedbackSidecar -->
<!-- node: function:src/modules/skillRunner/run/skillRunFeedback.ts:entryPathFromResultMarker -->
<!-- node: function:src/modules/skillRunner/run/skillRunFeedback.ts:parseSequenceFinalStep -->
<!-- node: function:src/modules/skillRunner/run/skillRunFeedback.ts:resolveFeedbackArtifact -->
<!-- node: function:src/modules/skillRunner/run/skillRunFeedback.ts:resolveRunResultString -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildFeedbackCandidates | 函数 | 213–273 | 中等 | skillrunner、feedback、resolution | 1 | 按优先级构造反馈文件候选集合，覆盖结果标记路径与工作流产物的常见命名。 |
| collectSkillRunFeedbackSidecar | 函数 | 298–459 | 复杂 | skillrunner、feedback、artifacts、core | 0 | 收集 run 的反馈 sidecar：解析结果标记、sequence 终态与产物目录，选定唯一反馈文件并落盘。 |
| entryPathFromResultMarker | 函数 | 74–84 | 简单 | skillrunner、parsing、path | 0 | 从结果标记中解析反馈文件的相对路径，非法路径直接拒绝。 |
| parseSequenceFinalStep | 函数 | 105–128 | 简单 | skillrunner、parsing、workflow-execution | 0 | 从 sequence 状态中解析终态步骤，提取其结果引用供反馈定位使用。 |
| resolveFeedbackArtifact | 函数 | 275–296 | 简单 | skillrunner、feedback、resolution | 1 | 在候选中解析出唯一存在的反馈产物，歧义时返回未找到而非猜测。 |
| resolveRunResultString | 函数 | 150–161 | 简单 | skillrunner、normalization、compatibility | 0 | 从 run 记录中取出结果文本，兼容字符串与对象两种历史格式。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bundleIO.ts](../../workflowExecution/bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [resultContext.ts](../../workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [workflowProductStore.ts](../../workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRecovery.ts](../../acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [applySeam.ts](../../workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [runtime.ts](../../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [sequenceStepApply.ts](../../workflowExecution/sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [skillRunnerForegroundContinuation.ts](skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectSkillRunFeedbackSidecar | 函数 | 298–459 | 收集 run 的反馈 sidecar：解析结果标记、sequence 终态与产物目录，选定唯一反馈文件并落盘。 |
