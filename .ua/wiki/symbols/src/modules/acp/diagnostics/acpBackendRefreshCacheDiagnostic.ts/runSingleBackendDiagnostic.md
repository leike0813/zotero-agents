
# runSingleBackendDiagnostic
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runSingleBackendDiagnostic -->

对单个后端执行完整诊断链：命令解析、连接探测、各 spike 与传输探针，产出压缩后的诊断结果。
类型：函数  
复杂度：复杂  
入边数：1  
标签：diagnostics、acp、backend、entry-point  
所属文件：[src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts](../../../../../../files/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md)
源码：[src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:3696](../../../../../../../../src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts#L3696)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runAcpBackendRefreshCacheDiagnostic](../../../../../../files/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:4041–4109 | ACP 后端刷新与缓存诊断入口：遍历后端、逐个诊断并汇总为可复制的报告。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runNodeBridgeSpikeProbe](runNodeBridgeSpikeProbe.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:2086–2284 | 运行 Node bridge spike 探针，验证经由 Node 侧桥接启动 Agent 的可行性。 |
| [runRawAcpTransportProbe](runRawAcpTransportProbe.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:3514–3694 | 对原始 ACP 传输层发起直连探针，定位握手与帧处理失败点。 |
| [runResolvedExeSpikeProbe](runResolvedExeSpikeProbe.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:1787–1989 | 针对解析出的可执行文件运行 spike 探针，验证直接启动路径是否可行。 |
| [runStdinCapabilityMatrixProbe](runStdinCapabilityMatrixProbe.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:2948–3188 | 运行 stdin 能力矩阵探针，逐项确认子进程 stdin 在 Zotero 沙箱中的读写与关闭语义。 |
| [runWebSocketBridgeSpikeProbe](runWebSocketBridgeSpikeProbe.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:2525–2709 | 运行 WebSocket bridge spike 探针，验证桥接通道上的 ACP 会话建立。 |
| [summarizeBackendCommandResolution](../../../../../../files/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:819–861 | 汇总后端命令解析链的候选与命中结果，说明为何选中当前可执行文件。 |
