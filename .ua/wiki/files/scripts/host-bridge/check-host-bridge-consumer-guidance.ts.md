
# scripts/host-bridge/check-host-bridge-consumer-guidance.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/check-host-bridge-consumer-guidance.ts -->

治理校验脚本：对照 Host Bridge 命令契约检查各 surface 文档中的消费者指引是否齐备且与命令定义一致，防止文案与契约漂移。
源码：[scripts/host-bridge/check-host-bridge-consumer-guidance.ts](../../../../../scripts/host-bridge/check-host-bridge-consumer-guidance.ts)

## 符号（2）
<!-- node: function:scripts/host-bridge/check-host-bridge-consumer-guidance.ts:findHostBridgeConsumerGuidanceViolations -->
<!-- node: function:scripts/host-bridge/check-host-bridge-consumer-guidance.ts:requireMarkers -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| findHostBridgeConsumerGuidanceViolations | 函数 | 107–245 | 复杂 | validation、governance、contract | 0 | 逐条命令比对契约定义与渲染文档中的消费者指引，报告缺失、漂移与深度越界。 |
| requireMarkers | 函数 | 88–98 | 简单 | validation、utility、consistency | 0 | 断言消费者指引文本包含必需的标记片段，缺失即记为违规。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-command-contracts.ts](host-bridge-command-contracts.ts.md) | scripts/host-bridge/host-bridge-command-contracts.ts | Host Bridge 命令契约的单一事实源：以数据形式声明全部 MCP/CLI 命令的参数、审批范围、证据与终态语义，供渲染、校验与消费方指引共用。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| findHostBridgeConsumerGuidanceViolations | 函数 | 107–245 | 逐条命令比对契约定义与渲染文档中的消费者指引，报告缺失、漂移与深度越界。 |
