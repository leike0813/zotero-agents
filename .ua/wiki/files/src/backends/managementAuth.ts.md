
# src/backends/managementAuth.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/backends](../../../modules/src/backends.md)
<!-- node: file:src/backends/managementAuth.ts -->

后端管理认证模块：读写 backends 配置中的管理凭据，生成 Basic Auth 头，保证管理面请求不被明文散落。
源码：[src/backends/managementAuth.ts](../../../../../src/backends/managementAuth.ts)

## 符号（5）
<!-- node: function:src/backends/managementAuth.ts:encodeBasicAuthHeader -->
<!-- node: function:src/backends/managementAuth.ts:normalizeManagementAuth -->
<!-- node: function:src/backends/managementAuth.ts:parseBackendsDocument -->
<!-- node: function:src/backends/managementAuth.ts:readBackendsConfigWithManagementAuth -->
<!-- node: function:src/backends/managementAuth.ts:updateBackendManagementAuth -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| encodeBasicAuthHeader | 函数 | 68–93 | 简单 | authentication、encoding、security、utility | 0 | 用插件可用的 UTF-8 编码构造 Basic Auth 头值，不依赖 Node 的 Buffer。 |
| normalizeManagementAuth | 函数 | 35–60 | 简单 | normalization、authentication、validation | 0 | 把管理认证配置归一化为统一形状，裁剪空用户名密码并区分关闭态。 |
| parseBackendsDocument | 函数 | 15–33 | 简单 | parsing、configuration、validation | 0 | 解析 prefs 中的 backends 文档，容错处理空值与非法 JSON。 |
| readBackendsConfigWithManagementAuth | 函数 | 95–106 | 简单 | configuration、authentication、backends | 0 | 读取 backends 配置并附带归一化后的管理认证信息，供连接层构造请求头。 |
| updateBackendManagementAuth | 函数 | 108–161 | 中等 | configuration、authentication、persistence、backends | 0 | 更新指定后端的管理认证配置并落盘 prefs，是管理面修改凭据的唯一入口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prefs.ts](../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [registry.ts](registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [types.ts](types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [managementClient.ts](../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [provider.ts](../providers/skillrunner/provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [skillRunnerManagementClientFactory.ts](../modules/skillRunner/connection/skillRunnerManagementClientFactory.ts.md) | src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts | SkillRunner 管理客户端的构造工厂，把后端实例的 baseUrl 与管理鉴权的读取/持久化回调注入客户端，并统一本地化错误提示。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| encodeBasicAuthHeader | 函数 | 68–93 | 用插件可用的 UTF-8 编码构造 Basic Auth 头值，不依赖 Node 的 Buffer。 |
| readBackendsConfigWithManagementAuth | 函数 | 95–106 | 读取 backends 配置并附带归一化后的管理认证信息，供连接层构造请求头。 |
| updateBackendManagementAuth | 函数 | 108–161 | 更新指定后端的管理认证配置并落盘 prefs，是管理面修改凭据的唯一入口。 |
