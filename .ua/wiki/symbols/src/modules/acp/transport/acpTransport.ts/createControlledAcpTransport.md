
# createControlledAcpTransport
<!-- node: function:src/modules/acp/transport/acpTransport.ts:createControlledAcpTransport -->

把底层 stdio/WebSocket 传输包装成受控 transport：统一注册取消信号、进程组清理与超时收敛。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、transport、lifecycle、cancellation  
所属文件：[src/modules/acp/transport/acpTransport.ts](../../../../../../files/src/modules/acp/transport/acpTransport.ts.md)
源码：[src/modules/acp/transport/acpTransport.ts:2438](../../../../../../../../src/modules/acp/transport/acpTransport.ts#L2438)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [launchAcpTransport](../../../../../../files/src/modules/acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts:2599–2620 | ACP transport 的统一启动入口：按运行时能力选择 Node 管道、浏览器子进程或 WebSocket bridge 三种传输路径。 |

## 调用

该符号没有记录对外调用。
