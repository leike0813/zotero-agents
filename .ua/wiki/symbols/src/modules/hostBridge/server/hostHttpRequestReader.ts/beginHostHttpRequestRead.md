
# beginHostHttpRequestRead
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:beginHostHttpRequestRead -->

开始有界读取一个 HTTP 请求：施加字节上限与超时、解析分帧、组装完整请求对象，是 Host Bridge 传输层的唯一读取入口。
类型：函数  
复杂度：复杂  
入边数：1  
标签：请求读取、有界读取、入口点、http  
所属文件：[src/modules/hostBridge/server/hostHttpRequestReader.ts](../../../../../../files/src/modules/hostBridge/server/hostHttpRequestReader.ts.md)
源码：[src/modules/hostBridge/server/hostHttpRequestReader.ts:352](../../../../../../../../src/modules/hostBridge/server/hostHttpRequestReader.ts#L352)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [beginProfiledHostBridgeRequestRead](../../../../../../files/src/modules/hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts:1234–1257 | 以性能剖析方式启动请求体读取，产出读取阶段耗时供诊断使用。 |

## 调用

该符号没有记录对外调用。
