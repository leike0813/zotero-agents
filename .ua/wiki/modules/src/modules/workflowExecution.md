
# src/modules/workflowExecution
> 目录聚合页：23 个文件、109 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/workflowExecution/acpSequenceStepLifecycle.ts](../../../files/src/modules/workflowExecution/acpSequenceStepLifecycle.ts.md) | 文件 | 0 | ACP 序列步骤的生命周期适配器实现，在步骤应用结果确定后把 apply 状态写回 ACP Skill Run 并在结束时卸载控制器。 |
| [src/modules/workflowExecution/applyDiagnostics.ts](../../../files/src/modules/workflowExecution/applyDiagnostics.ts.md) | 文件 | 1 | 工作流 apply 阶段诊断信息的归一化，限制 warning 数量与 code 长度上限，输出结构化且有界的诊断记录。 |
| [src/modules/workflowExecution/applySeam.ts](../../../files/src/modules/workflowExecution/applySeam.ts.md) | 文件 | 3 | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [src/modules/workflowExecution/artifactManifest.ts](../../../files/src/modules/workflowExecution/artifactManifest.ts.md) | 文件 | 3 | 工作流执行产物清单：归一化执行产生的文件/笔记产物条目，形成可校验的 artifact manifest，供结果上下文与 Attachment 导入消费。 |
| [src/modules/workflowExecution/bundleIO.ts](../../../files/src/modules/workflowExecution/bundleIO.ts.md) | 文件 | 6 | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [src/modules/workflowExecution/contracts.ts](../../../files/src/modules/workflowExecution/contracts.ts.md) | 文件 | 0 | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [src/modules/workflowExecution/duplicateGuardSeam.ts](../../../files/src/modules/workflowExecution/duplicateGuardSeam.ts.md) | 文件 | 3 | 工作流重复执行守卫：比对进行中的任务摘要与待执行单元的身份（任务名、目标父条目、输入单元），识别重复后阻止提交并给出可读原因。 |
| [src/modules/workflowExecution/feedbackPolicy.ts](../../../files/src/modules/workflowExecution/feedbackPolicy.ts.md) | 文件 | 1 | 工作流通知策略的单一判定点，按 manifest 的 execution.feedback.showNotifications 决定是否展示完成通知。 |
| [src/modules/workflowExecution/feedbackSeam.ts](../../../files/src/modules/workflowExecution/feedbackSeam.ts.md) | 文件 | 13 | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [src/modules/workflowExecution/messageFormatter.ts](../../../files/src/modules/workflowExecution/messageFormatter.ts.md) | 文件 | 2 | 工作流消息本地化格式化器：先查 addon locale 资源，缺失时回落到调用方提供的 fallback 文案，并组装出符合 WorkflowMessageFormatter 契约的格式化函数。 |
| [src/modules/workflowExecution/preparationSeam.ts](../../../files/src/modules/workflowExecution/preparationSeam.ts.md) | 文件 | 9 | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [src/modules/workflowExecution/requestMeta.ts](../../../files/src/modules/workflowExecution/requestMeta.ts.md) | 文件 | 3 | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [src/modules/workflowExecution/resultContext.ts](../../../files/src/modules/workflowExecution/resultContext.ts.md) | 文件 | 6 | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [src/modules/workflowExecution/resultEnvelope.ts](../../../files/src/modules/workflowExecution/resultEnvelope.ts.md) | 文件 | 1 | 解包 SkillRunner 返回结果的外层信封，识别带有 success_source / repair_level / artifacts 等特征字段时取出内部 data，否则按 result 嵌套逐层下探。 |
| [src/modules/workflowExecution/runConcurrency.ts](../../../files/src/modules/workflowExecution/runConcurrency.ts.md) | 文件 | 1 | 工作流派发并发度解析：仅 SkillRunner 与通用 HTTP 这类全并行 Provider 允许按请求数并发，其余 Provider 强制串行。 |
| [src/modules/workflowExecution/runSeam.ts](../../../files/src/modules/workflowExecution/runSeam.ts.md) | 文件 | 5 | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [src/modules/workflowExecution/sequenceRuntime.ts](../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | 文件 | 24 | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [src/modules/workflowExecution/sequenceStateStore.ts](../../../files/src/modules/workflowExecution/sequenceStateStore.ts.md) | 文件 | 12 | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [src/modules/workflowExecution/sequenceStepApply.ts](../../../files/src/modules/workflowExecution/sequenceStepApply.ts.md) | 文件 | 1 | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [src/modules/workflowExecution/submissionSeam.ts](../../../files/src/modules/workflowExecution/submissionSeam.ts.md) | 文件 | 3 | 工作流提交接缝：把已准备好的工作流执行单元提交到宿主任务队列或直接执行路径，并汇总每个单元的执行与回填结果。 |
| [src/modules/workflowExecution/terminalResolution.ts](../../../files/src/modules/workflowExecution/terminalResolution.ts.md) | 文件 | 4 | 工作流作业终态解析：把 ACP SkillRun、SkillRunner run store 与序列状态三个来源的观测归一到统一的作业槽位状态和终态结论。 |
| [src/modules/workflowExecution/valuePath.ts](../../../files/src/modules/workflowExecution/valuePath.ts.md) | 文件 | 2 | 工作流执行期的通用取值工具：比较原始值相等性并按点分路径安全读取对象属性。 |
| [src/modules/workflowExecution/workflowExecuteMessage.ts](../../../files/src/modules/workflowExecution/workflowExecuteMessage.ts.md) | 文件 | 6 | 工作流执行消息与 toast 文案的构建层：把执行结果、错误与队列进度组装成可本地化的展示文案。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/workflows](../workflows.md) | 23 |
| [src/modules](../modules.md) | 21 |
| [src/modules/skillRunner/run](skillRunner/run.md) | 16 |
| [src/modules/acp/skillRun](acp/skillRun.md) | 8 |
| [src/providers](../providers.md) | 8 |
| [src/utils](../utils.md) | 6 |
| [src/jobQueue](../jobQueue.md) | 5 |
| [src/modules/workflow/settings](workflow/settings.md) | 4 |
| [src/config](../config.md) | 3 |
| [src/backends](../backends.md) | 2 |
| [src/modules/workflow/catalog](workflow/catalog.md) | 2 |
| [.](../../index.md) | 1 |
| [src/modules/acp/diagnostics](acp/diagnostics.md) | 1 |
| [src/providers/skillrunner](../providers/skillrunner.md) | 1 |
