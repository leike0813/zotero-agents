
# src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts -->

广告主机检测：探测 Host Bridge 在网络上可被外部访问的地址，剔除不可用或明显不合法的 IPv4 候选，供远程后端生成可达连接配置。
源码：[src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts](../../../../../../../src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts)

## 符号（3）
<!-- node: function:src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts:detectHostBridgeAdvertisedHostForBackend -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts:isIPv4Literal -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts:isUsableAdvertisedIPv4 -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [detectHostBridgeAdvertisedHostForBackend](../../../../../symbols/src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts/detectHostBridgeAdvertisedHostForBackend.md) | 函数 | 102–231 | 复杂 | 网络探测、入口点、远程连接 | 1 | 为指定后端探测可达的广告主机：解析后端 URL、汇总候选地址并做可用性筛选，探测失败时给出明确失败而非猜测地址。 |
| isIPv4Literal | 函数 | 61–74 | 简单 | ipv4、校验、工具函数 | 0 | 判断字符串是否为合法 IPv4 字面量，格式不符时直接排除。 |
| isUsableAdvertisedIPv4 | 函数 | 76–87 | 简单 | ipv4、过滤、地址 | 0 | 过滤 loopback、组播与链路本地等不可作为广告地址的 IPv4。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeSkillRunnerEnv.ts](../cli/hostBridgeSkillRunnerEnv.ts.md) | src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts | 为 SkillRunner 后端推导 Host Bridge 运行环境：判定后端连接本地还是远程，据此拼装代理侧连接 Host Bridge 所需的环境变量。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [detectHostBridgeAdvertisedHostForBackend](../../../../../symbols/src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts/detectHostBridgeAdvertisedHostForBackend.md) | 函数 | 102–231 | 为指定后端探测可达的广告主机：解析后端 URL、汇总候选地址并做可用性筛选，探测失败时给出明确失败而非猜测地址。 |
| isIPv4Literal | 函数 | 61–74 | 判断字符串是否为合法 IPv4 字面量，格式不符时直接排除。 |
| isUsableAdvertisedIPv4 | 函数 | 76–87 | 过滤 loopback、组播与链路本地等不可作为广告地址的 IPv4。 |
