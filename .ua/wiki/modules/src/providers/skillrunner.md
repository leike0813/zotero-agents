
# src/providers/skillrunner
> 目录聚合页：9 个文件、55 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/providers/skillrunner/client.ts](../../../files/src/providers/skillrunner/client.ts.md) | 文件 | 9 | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [src/providers/skillrunner/errors.ts](../../../files/src/providers/skillrunner/errors.ts.md) | 文件 | 5 | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [src/providers/skillrunner/managementClient.ts](../../../files/src/providers/skillrunner/managementClient.ts.md) | 文件 | 8 | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [src/providers/skillrunner/modelCache.ts](../../../files/src/providers/skillrunner/modelCache.ts.md) | 文件 | 9 | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [src/providers/skillrunner/modelCatalog.ts](../../../files/src/providers/skillrunner/modelCatalog.ts.md) | 文件 | 13 | SkillRunner 模型目录：解析静态 manifest 与远端快照，展开 engine/provider/model 层级并把模型规格归一为 UI 与运行时可用形态。 |
| [src/providers/skillrunner/provider.ts](../../../files/src/providers/skillrunner/provider.ts.md) | 文件 | 3 | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [src/providers/skillrunner/skillPackageBundler.ts](../../../files/src/providers/skillrunner/skillPackageBundler.ts.md) | 文件 | 1 | SkillRunner 侧 skill 包打包：把插件 Skill 注册表中的条目组装成 zip 包，经 zipTransport 发送给旧版 SkillRunner 后端。 |
| [src/providers/skillrunner/uploadMapping.ts](../../../files/src/providers/skillrunner/uploadMapping.ts.md) | 文件 | 3 | SkillRunner 上传路径映射：把工作流声明的输入物化为受控的上传相对路径，并生成 Host Bridge 选择包路径。 |
| [src/providers/skillrunner/zipTransport.ts](../../../files/src/providers/skillrunner/zipTransport.ts.md) | 文件 | 4 | SkillRunner provider 的 zip 上传传输层：在 Zotero 沙箱内用纯 JS 构造 zip 与 multipart 负载，把 skill 包发送给旧版后端。 |

## 子目录
- [models/codex](skillrunner/models/codex.md)、[models/gemini](skillrunner/models/gemini.md)、[models/iflow](skillrunner/models/iflow.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/skillRunner/connection](../modules/skillRunner/connection.md) | 7 |
| [src/backends](../backends.md) | 6 |
| [src/utils](../utils.md) | 6 |
| [src/modules](../modules.md) | 5 |
| [src/providers](../providers.md) | 4 |
| [src/modules/skillRunner/run](../modules/skillRunner/run.md) | 3 |
| [src/modules/workflowExecution](../modules/workflowExecution.md) | 2 |
| [src/shared](../shared.md) | 2 |
| [src/config](../config.md) | 1 |
| [src/modules/skillRunner/runtime](../modules/skillRunner/runtime.md) | 1 |
| [src/modules/workflow/catalog](../modules/workflow/catalog.md) | 1 |
| [src/workflows](../workflows.md) | 1 |
