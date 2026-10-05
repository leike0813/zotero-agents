
# loadHostBridgeCommandContracts
<!-- node: function:scripts/host-bridge/host-bridge-command-contracts.ts:loadHostBridgeCommandContracts -->

加载并交叉校验全部命令契约，是契约层唯一对外入口，向渲染与治理脚本提供一致事实源。
类型：函数  
复杂度：复杂  
入边数：2  
标签：loading、contract、single-source-of-truth  
所属文件：[scripts/host-bridge/host-bridge-command-contracts.ts](../../../../files/scripts/host-bridge/host-bridge-command-contracts.ts.md)
源码：[scripts/host-bridge/host-bridge-command-contracts.ts:307](../../../../../../scripts/host-bridge/host-bridge-command-contracts.ts#L307)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [findHostBridgeConsumerGuidanceViolations](../../../../files/scripts/host-bridge/check-host-bridge-consumer-guidance.ts.md) | scripts/host-bridge/check-host-bridge-consumer-guidance.ts:107–245 | 逐条命令比对契约定义与渲染文档中的消费者指引，报告缺失、漂移与深度越界。 |
| [buildHostBridgeSurfaceCatalog](../host-bridge-surface-catalog.ts/buildHostBridgeSurfaceCatalog.md) | scripts/host-bridge/host-bridge-surface-catalog.ts:152–231 | 构建 surface 目录：按命令与 CLI 能力归组出 SKILL.md 与 reference 的分层结构。 |

## 调用

该符号没有记录对外调用。
