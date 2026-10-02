
# digestRuntimeFileSource
<!-- node: function:src/modules/runtimeFileTransfer.ts:digestRuntimeFileSource -->

流式计算文件源的字节数与 SHA-256 摘要，用于传输一致性验证。
类型：函数  
复杂度：中等  
入边数：2  
标签：sha256、文件传输、流式  
所属文件：[src/modules/runtimeFileTransfer.ts](../../../../files/src/modules/runtimeFileTransfer.ts.md)
源码：[src/modules/runtimeFileTransfer.ts:340](../../../../../../src/modules/runtimeFileTransfer.ts#L340)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [registerHostBridgeFileHandle](../../../../files/src/modules/hostBridge/server/hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts:205–256 | 登记宿主文件句柄为可下载的 file handle，绑定校验摘要与生命周期。 |
| [verifyRuntimeFileSource](../../../../files/src/modules/runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts:363–394 | 把实测摘要与预期摘要比对，不一致时以 runtime_file_changed 失败以中止传输。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createSha256Accumulator](../../../../files/src/utils/sha256.ts.md) | src/utils/sha256.ts:33–87 | 创建可增量 update 的 SHA-256 累加器，封装 Mozilla crypto hash 契约的初始化与收尾。 |
