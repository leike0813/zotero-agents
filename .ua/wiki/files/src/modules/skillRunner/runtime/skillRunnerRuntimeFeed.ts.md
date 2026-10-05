
# src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/runtime](../../../../../modules/src/modules/skillRunner/runtime.md)
<!-- node: file:src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts -->

本地 SkillRunner 运行时版本源的读取模块：拉取远端 feed 文档、规范化并按平台与架构挑选可用版本，在网络失败时回退到缓存与内置版本常量。
源码：[src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts](../../../../../../../src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts)

## 符号（4）
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts:normalizeSkillRunnerRuntimeFeedDocument -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts:readCachedRuntimeFeed -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts:resolveSkillRunnerRuntimeVersion -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts:selectSkillRunnerRuntimeVersionFromFeed -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeSkillRunnerRuntimeFeedDocument | 函数 | 101–133 | 中等 | parsing、validation、versioning | 0 | 校验并规范化远端 feed 文档结构，丢弃格式非法的版本条目。 |
| readCachedRuntimeFeed | 函数 | 156–175 | 简单 | cache、versioning、fallback | 1 | 读取上次成功拉取的 feed 缓存，作为离线时的版本依据。 |
| resolveSkillRunnerRuntimeVersion | 函数 | 200–304 | 复杂 | versioning、fallback、remote-config、resilience | 0 | 解析当前应使用的运行时版本：依次尝试远端 feed、本地缓存与内置常量，并对网络与解析异常做降级。 |
| selectSkillRunnerRuntimeVersionFromFeed | 函数 | 135–154 | 简单 | versioning、platform、selection | 1 | 从规范化 feed 中挑选匹配当前平台与架构的版本，兼容预发布通道。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerLocalRuntimeManager.ts](skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| normalizeSkillRunnerRuntimeFeedDocument | 函数 | 101–133 | 校验并规范化远端 feed 文档结构，丢弃格式非法的版本条目。 |
| resolveSkillRunnerRuntimeVersion | 函数 | 200–304 | 解析当前应使用的运行时版本：依次尝试远端 feed、本地缓存与内置常量，并对网络与解析异常做降级。 |
| selectSkillRunnerRuntimeVersionFromFeed | 函数 | 135–154 | 从规范化 feed 中挑选匹配当前平台与架构的版本，兼容预发布通道。 |
