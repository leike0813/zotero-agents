
# src/utils/timingSafeEqual.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/timingSafeEqual.ts -->

字符串定长时间安全比较：长度不等直接返回 false，等长时以累积异或差值避免逐字符短路。

规模：10 行
源码：[src/utils/timingSafeEqual.ts](../../../../../src/utils/timingSafeEqual.ts)

## 符号（1）
<!-- node: function:src/utils/timingSafeEqual.ts:timingSafeEqualString -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| timingSafeEqualString | 函数 | 1–10 | 简单 | security、comparison、timing-safe、exported | 1 | 对等长字符串做累积异或比较，避免逐字符早退造成的时间侧信道。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeAuth.ts](../modules/hostBridge/server/hostBridgeAuth.ts.md) | src/modules/hostBridge/server/hostBridgeAuth.ts | Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。 |
| [synthesisReverseHostBroker.ts](../modules/synthesis/reverseHost/synthesisReverseHostBroker.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts | 反向宿主 Broker：校验 sidecar 携带的 authorization token 与 service instance 绑定后，把 host-call 分派到对应 capability handler，并强制有界 deadline 与观测事件记录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| timingSafeEqualString | 函数 | 1–10 | 对等长字符串做累积异或比较，避免逐字符早退造成的时间侧信道。 |
