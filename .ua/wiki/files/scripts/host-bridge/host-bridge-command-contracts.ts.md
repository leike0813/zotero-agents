
# scripts/host-bridge/host-bridge-command-contracts.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-command-contracts.ts -->

Host Bridge 命令契约的单一事实源：以数据形式声明全部 MCP/CLI 命令的参数、审批范围、证据与终态语义，供渲染、校验与消费方指引共用。
源码：[scripts/host-bridge/host-bridge-command-contracts.ts](../../../../../scripts/host-bridge/host-bridge-command-contracts.ts)

## 符号（8）
<!-- node: function:scripts/host-bridge/host-bridge-command-contracts.ts:compositionInputSchema -->
<!-- node: function:scripts/host-bridge/host-bridge-command-contracts.ts:loadHostBridgeCapabilityContracts -->
<!-- node: function:scripts/host-bridge/host-bridge-command-contracts.ts:loadHostBridgeCommandContracts -->
<!-- node: function:scripts/host-bridge/host-bridge-command-contracts.ts:loadValidatedContract -->
<!-- node: function:scripts/host-bridge/host-bridge-command-contracts.ts:pruneSchemaDefinitions -->
<!-- node: function:scripts/host-bridge/host-bridge-command-contracts.ts:schemaAcceptsConstant -->
<!-- node: function:scripts/host-bridge/host-bridge-command-contracts.ts:specializePayloadSchema -->
<!-- node: function:scripts/host-bridge/host-bridge-command-contracts.ts:stripComposedFields -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compositionInputSchema | 函数 | 225–262 | 中等 | schema、contract、validation | 0 | 由组合定义推导输入 schema，描述命令可接受的 payload 形态与必填约束。 |
| loadHostBridgeCapabilityContracts | 函数 | 289–305 | 简单 | loading、contract、capability | 0 | 加载全部 Host Bridge 能力契约定义，作为命令契约与 surface 目录的输入。 |
| [loadHostBridgeCommandContracts](../../../symbols/scripts/host-bridge/host-bridge-command-contracts.ts/loadHostBridgeCommandContracts.md) | 函数 | 307–481 | 复杂 | loading、contract、single-source-of-truth | 2 | 加载并交叉校验全部命令契约，是契约层唯一对外入口，向渲染与治理脚本提供一致事实源。 |
| loadValidatedContract | 函数 | 264–287 | 简单 | loading、validation、contract | 0 | 读取并校验单个契约文件，失败时抛出带路径的错误。 |
| pruneSchemaDefinitions | 函数 | 133–171 | 中等 | schema、utility、optimization | 0 | 裁剪 JSON Schema 中未被引用的 $defs，压缩物化产物体积。 |
| schemaAcceptsConstant | 函数 | 173–182 | 简单 | schema、type-guard、rendering | 0 | 判断 schema 是否为常量枚举形态，供参数表渲染走简化分支。 |
| specializePayloadSchema | 函数 | 184–203 | 简单 | schema、projection、contract | 0 | 依据具体命令参数特化 payload schema，展开组合字段得到可渲染的输入形态。 |
| stripComposedFields | 函数 | 205–223 | 简单 | schema、utility、contract | 0 | 移除组合 schema 的派生字段，只保留可独立描述的部分。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-host-bridge-consumer-guidance.ts](check-host-bridge-consumer-guidance.ts.md) | scripts/host-bridge/check-host-bridge-consumer-guidance.ts | 治理校验脚本：对照 Host Bridge 命令契约检查各 surface 文档中的消费者指引是否齐备且与命令定义一致，防止文案与契约漂移。 |
| [host-bridge-agent-surface.ts](host-bridge-agent-surface.ts.md) | scripts/host-bridge/host-bridge-agent-surface.ts | 定义 Host Bridge agent-facing surface 的组装模型：把命令契约与共享契约投影为 skill/reference 文档的 agent 视角结构。 |
| [host-bridge-surface-catalog.ts](host-bridge-surface-catalog.ts.md) | scripts/host-bridge/host-bridge-surface-catalog.ts | 枚举 Host Bridge 的 agent-facing surface 目录：按命令契约决定哪些 skill 文档、reference 与 depth 层级需要物化。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| loadHostBridgeCapabilityContracts | 函数 | 289–305 | 加载全部 Host Bridge 能力契约定义，作为命令契约与 surface 目录的输入。 |
| [loadHostBridgeCommandContracts](../../../symbols/scripts/host-bridge/host-bridge-command-contracts.ts/loadHostBridgeCommandContracts.md) | 函数 | 307–481 | 加载并交叉校验全部命令契约，是契约层唯一对外入口，向渲染与治理脚本提供一致事实源。 |
