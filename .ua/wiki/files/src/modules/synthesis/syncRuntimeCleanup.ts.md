
# src/modules/synthesis/syncRuntimeCleanup.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/syncRuntimeCleanup.ts -->

Synthesis 同步运行期残留的清理入口：在 sidecar 生命周期结束或首选项关闭后清掉旧的同步临时目录，避免磁盘堆积。
源码：[src/modules/synthesis/syncRuntimeCleanup.ts](../../../../../../src/modules/synthesis/syncRuntimeCleanup.ts)

## 符号（2）
<!-- node: function:src/modules/synthesis/syncRuntimeCleanup.ts:cleanupRetiredSynthesisGitSyncRuntime -->
<!-- node: function:src/modules/synthesis/syncRuntimeCleanup.ts:retiredSynthesisGitSyncRuntimePaths -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| cleanupRetiredSynthesisGitSyncRuntime | 函数 | 24–40 | 简单 | cleanup、运行时残留、synthesis | 0 | 删除已退役 Git 同步的运行时残留目录，受首选项开关控制以避免误删用户数据。 |
| retiredSynthesisGitSyncRuntimePaths | 函数 | 17–22 | 简单 | 清理、遗留路径、synthesis | 0 | 列出已下线 Git 同步功能遗留的运行时目录路径，作为清理目标集合。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [prefs.ts](../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| cleanupRetiredSynthesisGitSyncRuntime | 函数 | 24–40 | 删除已退役 Git 同步的运行时残留目录，受首选项开关控制以避免误删用户数据。 |
| retiredSynthesisGitSyncRuntimePaths | 函数 | 17–22 | 列出已下线 Git 同步功能遗留的运行时目录路径，作为清理目标集合。 |
