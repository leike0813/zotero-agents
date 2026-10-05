
# emitVerboseConsole
<!-- node: function:src/modules/diagnosticVerbosity.ts:emitVerboseConsole -->

按指定日志级别输出诊断信息，未开启 verbose 时直接返回，避免污染正常控制台。
类型：函数  
复杂度：简单  
入边数：3  
标签：diagnostics、logging、utility  
所属文件：[src/modules/diagnosticVerbosity.ts](../../../../files/src/modules/diagnosticVerbosity.ts.md)
源码：[src/modules/diagnosticVerbosity.ts:21](../../../../../../src/modules/diagnosticVerbosity.ts#L21)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [registerLibraryArtifactsNotifierObserver](../../../../files/src/hooks.ts.md) | src/hooks.ts:1041–1074 | 注册 Zotero 文献库产物通知 observer，驱动后续的集成刷新。 |
| [runShutdownStepWithTimeout](../../../../files/src/hooks.ts.md) | src/hooks.ts:1111–1168 | 以超时上限执行单个关闭步骤，失败或超时都记录诊断而不阻塞其余清理。 |
| [unregisterLibraryArtifactsNotifierObserver](../../../../files/src/hooks.ts.md) | src/hooks.ts:1076–1096 | 卸载文献库产物通知 observer，避免关闭插件后回调残留。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [isDiagnosticVerboseEnabled](../../../../files/src/modules/diagnosticVerbosity.ts.md) | src/modules/diagnosticVerbosity.ts:3–11 | 综合测试 override 与多个 verbose 环境变量，判断当前是否输出冗长诊断信息。 |
