
# src/backends
> 目录聚合页：5 个文件、20 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/backends/displayName.ts](../../files/src/backends/displayName.ts.md) | 文件 | 1 | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [src/backends/identity.ts](../../files/src/backends/identity.ts.md) | 文件 | 4 | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [src/backends/managementAuth.ts](../../files/src/backends/managementAuth.ts.md) | 文件 | 5 | 后端管理认证模块：读写 backends 配置中的管理凭据，生成 Basic Auth 头，保证管理面请求不被明文散落。 |
| [src/backends/registry.ts](../../files/src/backends/registry.ts.md) | 文件 | 10 | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [src/backends/types.ts](../../files/src/backends/types.ts.md) | 文件 | 0 | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/utils](utils.md) | 3 |
| [src/config](config.md) | 2 |
| [src/workflows](workflows.md) | 2 |
| [src/modules/workflow/settings](modules/workflow/settings.md) | 1 |
