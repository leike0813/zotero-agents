
# src/workflows/declarativeRequestCompiler.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/declarativeRequestCompiler.ts -->

声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。

规模：704 行
源码：[src/workflows/declarativeRequestCompiler.ts](../../../../../src/workflows/declarativeRequestCompiler.ts)

## 符号（10）
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:buildGenericHttpRequest -->
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:buildGenericHttpStepsRequest -->
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:buildPassThroughRequest -->
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:buildSkillRunnerJobRequest -->
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:buildSkillRunnerSequenceRequest -->
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:compileDeclarativeRequest -->
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:renderTaskNameTemplate -->
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:resolveAttachmentBySelector -->
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:resolveTaskName -->
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:resolveWorkflowParams -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [buildGenericHttpRequest](../../../symbols/src/workflows/declarativeRequestCompiler.ts/buildGenericHttpRequest.md) | 函数 | 453–540 | 复杂 | workflow、compiler、request-building | 2 | 构建通用 HTTP 单请求负载，注入已编译的模板变量与声明式请求体。 |
| buildGenericHttpStepsRequest | 函数 | 577–649 | 复杂 | workflow、compiler、sequence | 0 | 构建通用 HTTP 多步骤序列负载，编译各步骤的请求体、提取路径与轮询参数。 |
| buildPassThroughRequest | 函数 | 542–575 | 中等 | workflow、compiler、request-building | 0 | 构建透传请求负载，携带任务名与目标父项引用用于链路验证。 |
| [buildSkillRunnerJobRequest](../../../symbols/src/workflows/declarativeRequestCompiler.ts/buildSkillRunnerJobRequest.md) | 函数 | 248–372 | 复杂 | workflow、compiler、request-building、skillrunner | 2 | 构建 skillrunner.job.v1 请求负载：注入 skill、上传映射、运行时选项与来源附件引用。 |
| buildSkillRunnerSequenceRequest | 函数 | 380–451 | 复杂 | workflow、compiler、sequence | 0 | 构建多步骤序列请求：按 manifest 步骤逐个编译子请求并保持步骤顺序稳定。 |
| [compileDeclarativeRequest](../../../symbols/src/workflows/declarativeRequestCompiler.ts/compileDeclarativeRequest.md) | 函数 | 651–704 | 复杂 | workflow、compiler、entry-point、dispatch | 1 | 声明式请求编译入口：按 request.kind 分派到对应构建器，并在返回前断言请求负载符合 provider 契约。 |
| [renderTaskNameTemplate](../../../symbols/src/workflows/declarativeRequestCompiler.ts/renderTaskNameTemplate.md) | 函数 | 167–216 | 复杂 | template-engine、workflow、formatting | 1 | 渲染任务名模板：替换 ${key} 占位符、裁剪冗余空白并保证结果非空。 |
| resolveAttachmentBySelector | 函数 | 89–108 | 中等 | workflow、selection、attachment | 0 | 按 manifest 的附件选择器从当前选择集中定位目标附件，支持按类型、mime 与数量约束筛选。 |
| resolveTaskName | 函数 | 222–246 | 中等 | workflow、formatting、resolution | 1 | 解析最终任务名：优先使用模板渲染结果，否则回退到工作流标签或附件文件名。 |
| resolveWorkflowParams | 函数 | 52–65 | 中等 | workflow、normalization、resolution | 1 | 解析工作流参数：合并 manifest 默认值与运行期覆盖，保证参数为 JSON 安全值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [requestContracts.ts](../providers/requestContracts.ts.md) | src/providers/requestContracts.ts | Provider 请求契约校验层：为每种 request kind 定义 provider/backend 兼容矩阵与负载校验规则，并在调度前断言契约成立。 |
| [selectionContext.ts](../modules/selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [triggerPolicy.ts](triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [uploadMapping.ts](../providers/skillrunner/uploadMapping.ts.md) | src/providers/skillrunner/uploadMapping.ts | SkillRunner 上传路径映射：把工作流声明的输入物化为受控的上传相对路径，并生成 Host Bridge 选择包路径。 |
| [workflowInputPlanning.ts](workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.ts](runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [compileDeclarativeRequest](../../../symbols/src/workflows/declarativeRequestCompiler.ts/compileDeclarativeRequest.md) | 函数 | 651–704 | 声明式请求编译入口：按 request.kind 分派到对应构建器，并在返回前断言请求负载符合 provider 契约。 |
