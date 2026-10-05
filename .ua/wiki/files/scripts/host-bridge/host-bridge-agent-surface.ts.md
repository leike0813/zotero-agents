
# scripts/host-bridge/host-bridge-agent-surface.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-agent-surface.ts -->

定义 Host Bridge agent-facing surface 的组装模型：把命令契约与共享契约投影为 skill/reference 文档的 agent 视角结构。
源码：[scripts/host-bridge/host-bridge-agent-surface.ts](../../../../../scripts/host-bridge/host-bridge-agent-surface.ts)

## 符号（6）
<!-- node: function:scripts/host-bridge/host-bridge-agent-surface.ts:assertDescriptor -->
<!-- node: function:scripts/host-bridge/host-bridge-agent-surface.ts:buildHostBridgeAgentSurfaceDescriptor -->
<!-- node: function:scripts/host-bridge/host-bridge-agent-surface.ts:createHostBridgeSurfaceIdentity -->
<!-- node: function:scripts/host-bridge/host-bridge-agent-surface.ts:hostBridgeAgentSurfaceChecksum -->
<!-- node: function:scripts/host-bridge/host-bridge-agent-surface.ts:searchHostBridgeAgentSurface -->
<!-- node: function:scripts/host-bridge/host-bridge-agent-surface.ts:serializeStable -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertDescriptor | 函数 | 121–136 | 简单 | validation、invariant、type-guard | 0 | 校验 surface descriptor 的结构不变量：身份、条目集合与层级必须齐备。 |
| buildHostBridgeAgentSurfaceDescriptor | 函数 | 143–167 | 简单 | projection、agent-surface、factory | 1 | 从命令契约构建 agent surface 描述符，是渲染层与校验层共用的结构化输入。 |
| createHostBridgeSurfaceIdentity | 函数 | 199–212 | 简单 | identity、factory、agent-surface | 0 | 构造 surface 身份三元组（名称、版本、schema），供 release set 与渲染层比对。 |
| hostBridgeAgentSurfaceChecksum | 函数 | 186–197 | 简单 | checksum、utility、reproducibility | 0 | 计算 agent surface 稳定序列化后的内容摘要，用于判断物化产物是否需要重建。 |
| searchHostBridgeAgentSurface | 函数 | 218–259 | 中等 | search、query、agent-surface | 0 | 在 surface 描述符中检索匹配的命令或能力条目，定位需要渲染与校验的段落。 |
| serializeStable | 函数 | 175–184 | 简单 | serialization、utility、determinism | 0 | 稳定序列化描述符，固定键序使内容摘要在不同运行间可复现。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-command-contracts.ts](host-bridge-command-contracts.ts.md) | scripts/host-bridge/host-bridge-command-contracts.ts | Host Bridge 命令契约的单一事实源：以数据形式声明全部 MCP/CLI 命令的参数、审批范围、证据与终态语义，供渲染、校验与消费方指引共用。 |
| [hostBridgeAgentContract.ts](../../src/shared/hostBridgeAgentContract.ts.md) | src/shared/hostBridgeAgentContract.ts | 跨边界共享的 Host Bridge agent 契约常量：agent surface 版本与宿主协议标识的最小投影，插件运行时与发布脚本共用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [render-host-bridge-release-set.ts](render-host-bridge-release-set.ts.md) | scripts/host-bridge/render-host-bridge-release-set.ts | 渲染 Host Bridge release set 文档：把发布身份、surface 目录与 CLI 发布信息写成受治理的发布清单工件。 |
| [render-host-bridge-surfaces.ts](render-host-bridge-surfaces.ts.md) | scripts/host-bridge/render-host-bridge-surfaces.ts | Host Bridge agent-facing surface 的渲染器：把命令契约、surface 目录、内置工作流与插件 skill bundle 组合成多层 SKILL.md 与 reference 文档，本批最核心的生成脚本。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildHostBridgeAgentSurfaceDescriptor | 函数 | 143–167 | 从命令契约构建 agent surface 描述符，是渲染层与校验层共用的结构化输入。 |
| createHostBridgeSurfaceIdentity | 函数 | 199–212 | 构造 surface 身份三元组（名称、版本、schema），供 release set 与渲染层比对。 |
| hostBridgeAgentSurfaceChecksum | 函数 | 186–197 | 计算 agent surface 稳定序列化后的内容摘要，用于判断物化产物是否需要重建。 |
| searchHostBridgeAgentSurface | 函数 | 218–259 | 在 surface 描述符中检索匹配的命令或能力条目，定位需要渲染与校验的段落。 |
