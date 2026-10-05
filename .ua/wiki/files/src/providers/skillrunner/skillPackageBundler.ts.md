
# src/providers/skillrunner/skillPackageBundler.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner](../../../../modules/src/providers/skillrunner.md)
<!-- node: file:src/providers/skillrunner/skillPackageBundler.ts -->

SkillRunner 侧 skill 包打包：把插件 Skill 注册表中的条目组装成 zip 包，经 zipTransport 发送给旧版 SkillRunner 后端。
源码：[src/providers/skillrunner/skillPackageBundler.ts](../../../../../../src/providers/skillrunner/skillPackageBundler.ts)

## 符号（1）
<!-- node: function:src/providers/skillrunner/skillPackageBundler.ts:buildSkillRunnerSkillPackageBundle -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSkillRunnerSkillPackageBundle | 函数 | 82–120 | 中等 | skillrunner、打包、zip、provider | 1 | 把插件 Skill 注册表条目打包为 SkillRunner 可消费的 zip 包，并排除不应下发的路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [pluginSkillRegistry.ts](../../modules/workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [runtimePersistence.ts](../../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [zipTransport.ts](zipTransport.ts.md) | src/providers/skillrunner/zipTransport.ts | SkillRunner provider 的 zip 上传传输层：在 Zotero 沙箱内用纯 JS 构造 zip 与 multipart 负载，把 skill 包发送给旧版后端。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSkillRunnerSkillPackageBundle | 函数 | 82–120 | 把插件 Skill 注册表条目打包为 SkillRunner 可消费的 zip 包，并排除不应下发的路径。 |
