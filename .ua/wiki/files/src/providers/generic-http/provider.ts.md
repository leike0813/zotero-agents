
# src/providers/generic-http/provider.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/generic-http](../../../../modules/src/providers/generic-http.md)
<!-- node: file:src/providers/generic-http/provider.ts -->

通用 HTTP Provider：按声明式请求对任意 REST 后端发起调用，支持模板插值、JSON path 提取、多步骤编排、上传与轮询。

规模：837 行
源码：[src/providers/generic-http/provider.ts](../../../../../../src/providers/generic-http/provider.ts)

## 符号（12）
<!-- node: function:src/providers/generic-http/provider.ts:checkFailCondition -->
<!-- node: function:src/providers/generic-http/provider.ts:compactListPreview -->
<!-- node: class:src/providers/generic-http/provider.ts:GenericHttpProvider -->
<!-- node: function:src/providers/generic-http/provider.ts:readResponsePayload -->
<!-- node: function:src/providers/generic-http/provider.ts:resolveJsonPath -->
<!-- node: function:src/providers/generic-http/provider.ts:resolveJsonPathSegments -->
<!-- node: function:src/providers/generic-http/provider.ts:resolveJsonPathWithFallback -->
<!-- node: function:src/providers/generic-http/provider.ts:resolveRequestId -->
<!-- node: function:src/providers/generic-http/provider.ts:resolveTemplateValue -->
<!-- node: function:src/providers/generic-http/provider.ts:rethrowWithInterpolationContext -->
<!-- node: function:src/providers/generic-http/provider.ts:shouldRepeatStep -->
<!-- node: function:src/providers/generic-http/provider.ts:summarizeRequestForDebug -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| checkFailCondition | 函数 | 411–435 | 中等 | http-client、flow-control、utility | 0 | 按步骤声明的 fail 条件求值响应体，判断当前步骤是否应进入失败分支。 |
| compactListPreview | 函数 | 152–164 | 简单 | diagnostics、formatting、utility | 0 | 把数组值压缩为长度受限的预览串，超出部分以省略号收尾，用于诊断日志。 |
| GenericHttpProvider | 类 | 495–837 | 复杂 | provider、http-client、generic-rest、orchestration | 0 | Generic HTTP Provider 实现：声明运行时选项 schema，按单请求或多步骤两种模式执行声明式 REST 调用，支持 multipart 上传、轮询、步骤间取值传递与失败条件短路。 |
| readResponsePayload | 函数 | 345–390 | 中等 | http-client、parsing、utility | 0 | 读取 HTTP 响应体并按内容类型归一为 JSON 或文本，失败时给出状态码上下文。 |
| resolveJsonPath | 函数 | 69–89 | 中等 | json-path、value-access、utility | 0 | 按已解析的分段在响应体中逐层取值，缺失时返回 undefined。 |
| resolveJsonPathSegments | 函数 | 24–67 | 中等 | parsing、json-path、utility | 0 | 把 JSON path 表达式解析为分段数组，兼容点号路径与方括号下标两种写法。 |
| resolveJsonPathWithFallback | 函数 | 91–106 | 中等 | json-path、fallback、utility | 0 | 按给定 JSON path 序列依次尝试取值，返回首个成功结果，兼容后端多版本响应结构。 |
| resolveRequestId | 函数 | 464–493 | 中等 | http-client、contract、error-handling | 0 | 从响应中按 JSON path 提取后端作业 request id，缺失时抛出契约错误。 |
| resolveTemplateValue | 函数 | 132–150 | 中等 | template-engine、interpolation、utility | 0 | 解析 ${path} 形式的模板值，支持默认值回退与非字符串输入的原样透传。 |
| rethrowWithInterpolationContext | 函数 | 262–299 | 中等 | error-handling、template-engine、diagnostics | 0 | 模板插值失败时重新抛出异常，附上失败的模板键与原始值上下文，便于定位声明式配置错误。 |
| shouldRepeatStep | 函数 | 437–448 | 简单 | http-client、polling、flow-control | 0 | 按 repeat_until 条件与轮询参数判断是否需要重复执行当前步骤。 |
| summarizeRequestForDebug | 函数 | 189–241 | 复杂 | diagnostics、debug、observability | 0 | 为诊断日志生成请求摘要：脱敏请求头、压缩请求体并标注各字段值类型，避免把完整负载写入运行时日志。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [runtimeCompatibility.ts](../../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [runtimeLogManager.ts](../../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.ts](../registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| GenericHttpProvider | 类 | 495–837 | Generic HTTP Provider 实现：声明运行时选项 schema，按单请求或多步骤两种模式执行声明式 REST 调用，支持 multipart 上传、轮询、步骤间取值传递与失败条件短路。 |
