
# scripts/internal/cleanup-runtime-category-cli.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/internal](../../../modules/scripts/internal.md)
<!-- node: file:scripts/internal/cleanup-runtime-category-cli.ts -->

运行时持久化目录分类清理 CLI：扫描 runtime 数据树并按类别删除/保留条目，供 clear-* 脚本与运维流程调用。
源码：[scripts/internal/cleanup-runtime-category-cli.ts](../../../../../scripts/internal/cleanup-runtime-category-cli.ts)

## 符号（6）
<!-- node: function:scripts/internal/cleanup-runtime-category-cli.ts:applyRuntimeRootFromZoteroDataDir -->
<!-- node: function:scripts/internal/cleanup-runtime-category-cli.ts:installStandaloneZoteroRuntimeShim -->
<!-- node: function:scripts/internal/cleanup-runtime-category-cli.ts:loadDotenvFile -->
<!-- node: function:scripts/internal/cleanup-runtime-category-cli.ts:parseArgs -->
<!-- node: function:scripts/internal/cleanup-runtime-category-cli.ts:runRuntimePersistenceCleanupCli -->
<!-- node: function:scripts/internal/cleanup-runtime-category-cli.ts:stripEnvValue -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyRuntimeRootFromZoteroDataDir | 函数 | 87–99 | 简单 | cli、runtime-persistence、config | 0 | 依据 ZOTERO_DATA_DIR 等环境变量推导 runtime 根目录，配置 Node 侧与插件内一致的持久化根。 |
| installStandaloneZoteroRuntimeShim | 函数 | 129–250 | 中等 | cli、shim、runtime-persistence | 0 | 为 Node 环境安装 Zotero 宿主 API 垫片，使插件源码中的 IOUtils/PathUtils 等调用在独立脚本中可执行。 |
| loadDotenvFile | 函数 | 53–75 | 简单 | cli、env、config | 0 | 读取 .env 文件并合并进 process.env，供独立运行 CLI 时取得本地配置。 |
| parseArgs | 函数 | 11–27 | 简单 | cli、argument-parsing、utility | 0 | 解析命令行位置参数与 --key=value 形式的 flag，输出参数表供清理 CLI 分派使用。 |
| runRuntimePersistenceCleanupCli | 函数 | 252–279 | 中等 | cli、entry-point、maintenance | 0 | 运行时持久化分类清理的 CLI 入口：解析参数、执行 scan/cleanup/retention 各模式并输出结构化结果。 |
| stripEnvValue | 函数 | 42–51 | 简单 | cli、env、utility | 0 | 从环境变量字符串中移除指定键的赋值，输出清理后的环境串。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimePersistenceGovernance.ts](../../src/modules/runtimePersistenceGovernance.ts.md) | src/modules/runtimePersistenceGovernance.ts | 运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [clear-acp-chat-records.ts](../clear-acp-chat-records.ts.md) | scripts/clear-acp-chat-records.ts | 一键清理 ACP Chat 会话记录的命令行薄封装，复用 runtime 持久化治理 CLI 的分类清理能力。 |
| [clear-acp-skills-records.ts](../clear-acp-skills-records.ts.md) | scripts/clear-acp-skills-records.ts | 一键清理 ACP Skills 运行记录的命令行薄封装，与 Chat 清理入口共享同一治理 CLI。 |
| [clear-skillrunner-records.ts](../clear-skillrunner-records.ts.md) | scripts/clear-skillrunner-records.ts | 一键清理旧版 SkillRunner 运行记录的命令行入口，便于本地开发时重置后端状态。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| runRuntimePersistenceCleanupCli | 函数 | 252–279 | 运行时持久化分类清理的 CLI 入口：解析参数、执行 scan/cleanup/retention 各模式并输出结构化结果。 |
