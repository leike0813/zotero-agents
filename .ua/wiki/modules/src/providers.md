
# src/providers
> 目录聚合页：5 个文件、31 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/providers/contracts.ts](../../files/src/providers/contracts.ts.md) | 文件 | 0 | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [src/providers/profile.ts](../../files/src/providers/profile.ts.md) | 文件 | 10 | Provider Profile 层：把后端实例投影为可校验、可指纹化的 provider profile，并按 provider 运行时选项 schema 校验取值。 |
| [src/providers/registry.ts](../../files/src/providers/registry.ts.md) | 文件 | 7 | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |
| [src/providers/requestContracts.ts](../../files/src/providers/requestContracts.ts.md) | 文件 | 14 | Provider 请求契约校验层：为每种 request kind 定义 provider/backend 兼容矩阵与负载校验规则，并在调度前断言契约成立。 |
| [src/providers/types.ts](../../files/src/providers/types.ts.md) | 文件 | 0 | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |

## 子目录
- [acp](providers/acp.md)、[generic-http](providers/generic-http.md)、[pass-through](providers/pass-through.md)、[skillrunner/models/codex](providers/skillrunner/models/codex.md)、[skillrunner/models/gemini](providers/skillrunner/models/gemini.md)、[skillrunner/models/iflow](providers/skillrunner/models/iflow.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/backends](backends.md) | 4 |
| [src/config](config.md) | 2 |
| [src/modules](modules.md) | 1 |
| [src/modules/acp/chat](modules/acp/chat.md) | 1 |
| [src/modules/acp/diagnostics](modules/acp/diagnostics.md) | 1 |
| [src/modules/skillRunner/run](modules/skillRunner/run.md) | 1 |
| [src/providers/acp](providers/acp.md) | 1 |
| [src/providers/generic-http](providers/generic-http.md) | 1 |
| [src/providers/pass-through](providers/pass-through.md) | 1 |
| [src/providers/skillrunner](providers/skillrunner.md) | 1 |
