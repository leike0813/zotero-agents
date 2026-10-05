
# detectHostBridgeAdvertisedHostForBackend
<!-- node: function:src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts:detectHostBridgeAdvertisedHostForBackend -->

为指定后端探测可达的广告主机：解析后端 URL、汇总候选地址并做可用性筛选，探测失败时给出明确失败而非猜测地址。
类型：函数  
复杂度：复杂  
入边数：1  
标签：网络探测、入口点、远程连接  
所属文件：[src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts](../../../../../../files/src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts.md)
源码：[src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts:102](../../../../../../../../src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts#L102)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildRemoteSkillRunnerHostBridgeRuntimeEnv](../../../../../../files/src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts.md) | src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts:137–264 | 为远程 SkillRunner 后端构造运行环境，注入可达广告主机、token 与受限作用域，广告主机不可用时给出明确失败。 |

## 调用

该符号没有记录对外调用。
