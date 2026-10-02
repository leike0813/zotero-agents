
# beginXpcFileCopy
<!-- node: function:src/modules/runtimeFileTransfer.ts:beginXpcFileCopy -->

在 XPC 运行时下启动异步文件拷贝：占用传输槽、分块读取并在写入失败时释放资源。
类型：函数  
复杂度：复杂  
入边数：1  
标签：文件传输、xpc、并发控制  
所属文件：[src/modules/runtimeFileTransfer.ts](../../../../files/src/modules/runtimeFileTransfer.ts.md)
源码：[src/modules/runtimeFileTransfer.ts:420](../../../../../../src/modules/runtimeFileTransfer.ts#L420)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [beginRuntimeFileResponseTransfer](../../../../files/src/modules/runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts:549–577 | 文件响应传输的公共入口：按运行时选择拷贝实现并返回完成 Promise 与中止句柄。 |

## 调用

该符号没有记录对外调用。
