
# src/modules/workflowExecution/sequenceRuntime.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/sequenceRuntime.ts -->

SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。
源码：[src/modules/workflowExecution/sequenceRuntime.ts](../../../../../../src/modules/workflowExecution/sequenceRuntime.ts)

## 符号（24）
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:acceptCompletedSequenceStep -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:acceptCompletedSequenceStepNow -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:advanceSuccessfulSequenceStep -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:applyAndSettleSuccessfulSequenceStep -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:applyHandoffBindings -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:applySequenceStepIfNeeded -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:buildSequenceDeferredResult -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:buildSequenceResult -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:buildSequenceStepProgressContext -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:buildStepRequest -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:buildTerminalSequenceResultFromState -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:continueSequenceFromIndex -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:executeSequenceFromState -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:executeSkillRunnerSequence -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:mapSequenceInputValue -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:mapSequenceRequestInputs -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:normalizeSkillRunnerWorkspaceSourcePath -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:outputsByStepFromState -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:projectSequenceRequestForDurability -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:resolveSequenceAttachmentBindings -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:resolveSequenceRequestForDispatch -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:sequenceTerminalStepOwnsApply -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:settleSequenceStepLifecycle -->
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:syncSkillRunnerSequenceStepApplyState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acceptCompletedSequenceStep | 函数 | 1561–1580 | 简单 | sequence、entry-point、state-machine | 1 | 接收完成步骤结果并推进状态机的对外入口。 |
| acceptCompletedSequenceStepNow | 函数 | 1425–1559 | 中等 | sequence、step、state、result | 1 | 接收指定步骤的完成结果，解析 Provider 输出并更新序列状态。 |
| advanceSuccessfulSequenceStep | 函数 | 1249–1312 | 中等 | sequence、state-machine、advance、step | 1 | 推进到下一个成功步骤，必要时返回延迟结果或终态结果。 |
| applyAndSettleSuccessfulSequenceStep | 函数 | 1203–1247 | 简单 | sequence、apply、lifecycle、composition | 1 | 对成功步骤执行 apply 并立即完成生命周期收敛，失败时短路。 |
| applyHandoffBindings | 函数 | 452–555 | 中等 | sequence、handoff、dataflow、binding | 1 | 把前序步骤输出按 handoff 声明绑定到当前步骤输入，支持嵌套取值与类型转换。 |
| [applySequenceStepIfNeeded](../../../../symbols/src/modules/workflowExecution/sequenceRuntime.ts/applySequenceStepIfNeeded.md) | 函数 | 953–1167 | 复杂 | sequence、apply、step、error-handling | 1 | 在步骤成功且需要 apply 时执行 apply，处理结果解析、失败模式判定与状态写回。 |
| buildSequenceDeferredResult | 函数 | 817–843 | 简单 | sequence、result、deferred、state | 1 | 构造序列的延迟结果对象，标记后续步骤仍需推进。 |
| [buildSequenceResult](../../../../symbols/src/modules/workflowExecution/sequenceRuntime.ts/buildSequenceResult.md) | 函数 | 1314–1350 | 简单 | sequence、result、composition、projection | 2 | 由序列状态组装最终运行结果，含各步骤输出与失败信息。 |
| buildSequenceStepProgressContext | 函数 | 330–350 | 简单 | sequence、progress、context | 0 | 构建步骤进度上报上下文，携带步骤索引、工作流与任务标识。 |
| [buildStepRequest](../../../../symbols/src/modules/workflowExecution/sequenceRuntime.ts/buildStepRequest.md) | 函数 | 557–653 | 中等 | sequence、request、composition、step | 2 | 为单个序列步骤构建完整 Provider 请求：输入映射、附件绑定、运行选项与任务命名。 |
| buildTerminalSequenceResultFromState | 函数 | 1380–1401 | 简单 | sequence、terminal、result、state | 1 | 直接从序列状态构造终态结果，用于跳过剩余步骤的场景。 |
| continueSequenceFromIndex | 函数 | 2022–2082 | 中等 | sequence、resume、step、runtime | 1 | 从指定步骤索引继续执行序列，用于断点续跑。 |
| [executeSequenceFromState](../../../../symbols/src/modules/workflowExecution/sequenceRuntime.ts/executeSequenceFromState.md) | 函数 | 1582–1953 | 复杂 | sequence、runtime、state-machine、orchestration、error-handling | 2 | 序列执行主循环：逐步构建请求、投递、等待完成并推进，涵盖错误、可恢复态与取消处理。 |
| executeSkillRunnerSequence | 函数 | 1955–2020 | 中等 | sequence、entry-point、skillrunner、runtime | 1 | SkillRunner 序列执行入口：初始化或恢复序列运行状态后进入执行循环。 |
| [mapSequenceInputValue](../../../../symbols/src/modules/workflowExecution/sequenceRuntime.ts/mapSequenceInputValue.md) | 函数 | 212–234 | 简单 | sequence、input-mapping、coercion | 2 | 按声明类型把步骤输入值映射为 Provider 请求可接受的形态。 |
| mapSequenceRequestInputs | 函数 | 236–259 | 简单 | sequence、input-mapping、composition | 1 | 遍历步骤输入声明并生成完整的请求输入映射。 |
| normalizeSkillRunnerWorkspaceSourcePath | 函数 | 699–733 | 简单 | sequence、path、skillrunner、normalization | 1 | 把工作区相对路径规范化为 SkillRunner 可接受的工作区源路径。 |
| outputsByStepFromState | 函数 | 735–762 | 简单 | sequence、state、outputs、projection | 1 | 从序列状态中汇总各步骤输出，供 handoff 绑定与结果组装使用。 |
| projectSequenceRequestForDurability | 函数 | 261–285 | 简单 | sequence、durability、projection、serialization | 1 | 将步骤请求投影为可持久化形态，剔除临时字段与非便携引用。 |
| resolveSequenceAttachmentBindings | 函数 | 154–197 | 简单 | sequence、attachment、binding、upload-mapping | 1 | 解析序列步骤的附件绑定，将前序产物路径映射为当前步骤的上传输入。 |
| resolveSequenceRequestForDispatch | 函数 | 287–323 | 简单 | sequence、dispatch、resolution、request | 1 | 在派发前按当前状态与上传映射解析出最终步骤请求。 |
| [sequenceTerminalStepOwnsApply](../../../../symbols/src/modules/workflowExecution/sequenceRuntime.ts/sequenceTerminalStepOwnsApply.md) | 函数 | 1352–1378 | 简单 | sequence、predicate、apply、terminal | 2 | 判定终态步骤是否自行负责 apply，避免与终态结果组装重复执行。 |
| settleSequenceStepLifecycle | 函数 | 1169–1201 | 简单 | sequence、lifecycle、adapter、settle | 1 | 收敛序列步骤生命周期：通过适配器把成功/失败状态写回后端运行存储。 |
| [syncSkillRunnerSequenceStepApplyState](../../../../symbols/src/modules/workflowExecution/sequenceRuntime.ts/syncSkillRunnerSequenceStepApplyState.md) | 函数 | 907–951 | 简单 | sequence、sync、apply、skillrunner、state | 2 | 将 SkillRunner 步骤的 apply 状态与序列状态对齐，识别可恢复非终态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [contracts.ts](../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [debugMode.ts](../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [hostApi.ts](../../workflows/hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [path.ts](../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [selectionContext.ts](../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [sequenceStateStore.ts](sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [skillRunnerRecoverableState.ts](../skillRunner/run/skillRunnerRecoverableState.ts.md) | src/modules/skillRunner/run/skillRunnerRecoverableState.ts | 可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。 |
| [skillRunnerRunStore.ts](../skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerSubmissionContext.ts](../skillRunner/run/skillRunnerSubmissionContext.ts.md) | src/modules/skillRunner/run/skillRunnerSubmissionContext.ts | 提交上下文小模块：归一化用户提交文本并解析对应的 Skill 展示名，供 run 记录与 UI 共用。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../providers/types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [uploadMapping.ts](../../providers/skillrunner/uploadMapping.ts.md) | src/providers/skillrunner/uploadMapping.ts | SkillRunner 上传路径映射：把工作流声明的输入物化为受控的上传相对路径，并生成 Host Bridge 选择包路径。 |
| [valuePath.ts](valuePath.ts.md) | src/modules/workflowExecution/valuePath.ts | 工作流执行期的通用取值工具：比较原始值相等性并按点分路径安全读取对象属性。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSequenceStepLifecycle.ts](acpSequenceStepLifecycle.ts.md) | src/modules/workflowExecution/acpSequenceStepLifecycle.ts | ACP 序列步骤的生命周期适配器实现，在步骤应用结果确定后把 apply 状态写回 ACP Skill Run 并在结束时卸载控制器。 |
| [acpSkillRunRecovery.ts](../acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [applySeam.ts](applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [runSeam.ts](runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [skillRunnerForegroundContinuation.ts](../skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| acceptCompletedSequenceStep | 函数 | 1561–1580 | 接收完成步骤结果并推进状态机的对外入口。 |
| executeSkillRunnerSequence | 函数 | 1955–2020 | SkillRunner 序列执行入口：初始化或恢复序列运行状态后进入执行循环。 |
| [sequenceTerminalStepOwnsApply](../../../../symbols/src/modules/workflowExecution/sequenceRuntime.ts/sequenceTerminalStepOwnsApply.md) | 函数 | 1352–1378 | 判定终态步骤是否自行负责 apply，避免与终态结果组装重复执行。 |
