
# packages/synthesis-contracts/src/exportDelivery.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/exportDelivery.ts -->

宿主导出交付合约：校验导出条目集合（数量、单条与总体字节上限、控制字符、路径形状），并定义导出请求、传输请求与运行工作区物化请求/结果。
源码：[packages/synthesis-contracts/src/exportDelivery.ts](../../../../../../packages/synthesis-contracts/src/exportDelivery.ts)

## 符号（7）
<!-- node: function:packages/synthesis-contracts/src/exportDelivery.ts:rebuildDescriptor -->
<!-- node: function:packages/synthesis-contracts/src/exportDelivery.ts:rebuildEntries -->
<!-- node: function:packages/synthesis-contracts/src/exportDelivery.ts:rebuildSynthesisHostExportDeliveryResult -->
<!-- node: function:packages/synthesis-contracts/src/exportDelivery.ts:rebuildSynthesisHostRunWorkspaceMaterializationRequest -->
<!-- node: function:packages/synthesis-contracts/src/exportDelivery.ts:rebuildSynthesisHostRunWorkspaceMaterializationResult -->
<!-- node: function:packages/synthesis-contracts/src/exportDelivery.ts:requiredTrimmedString -->
<!-- node: function:packages/synthesis-contracts/src/exportDelivery.ts:utf8ByteLength -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [rebuildDescriptor](../../../../symbols/packages/synthesis-contracts/src/exportDelivery.ts/rebuildDescriptor.md) | 函数 | 279–345 | 复杂 | 合约、校验、导出交付、核心 | 1 | 重建导出条目描述符：校验 displayName、相对路径、字节长度与 MIME 形状，拒绝控制字符与超长字段。 |
| rebuildEntries | 函数 | 186–225 | 复杂 | 合约、有界、导出交付、预算校验 | 0 | 重建导出条目集合：校验条目数量上限、逐条描述符合法性与总体字节预算，输出带诊断的聚合结果。 |
| [rebuildSynthesisHostExportDeliveryResult](../../../../symbols/packages/synthesis-contracts/src/exportDelivery.ts/rebuildSynthesisHostExportDeliveryResult.md) | 函数 | 486–537 | 复杂 | 合约、交付结果、校验 | 1 | 重建导出交付结果：统一 status、已写入条目与诊断列表，确保 wire 层可直接编码而不二次校验。 |
| rebuildSynthesisHostRunWorkspaceMaterializationRequest | 函数 | 392–428 | 中等 | 合约、物化、工作区、请求校验 | 0 | 重建运行工作区物化请求：绑定 runId、工作区路径与目标条目集合，校验路径形状与条目数量上限。 |
| rebuildSynthesisHostRunWorkspaceMaterializationResult | 函数 | 457–484 | 中等 | 合约、物化、结果、诊断 | 1 | 重建工作区物化结果：回传已物化路径、跳过项与失败诊断，保持与请求侧同构。 |
| requiredTrimmedString | 函数 | 128–146 | 简单 | 校验、字符串、合约 | 1 | 校验并裁剪必填字符串字段：拒绝空串、控制字符与超长输入，命中即返回 invalid_request。 |
| utf8ByteLength | 函数 | 227–249 | 中等 | utf8、字节计算、预算 | 1 | 计算字符串的 UTF-8 字节长度，正确处理代理对，避免用 length 近似导致预算判定失真。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [sidecarTransfer.ts](sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts | sidecar 传输层契约：分页描述符与 manifest、库节点/参考文献/图节点/边/归属/指标各类页、会话动作与 transfer 状态快照重建。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [rebuildDescriptor](../../../../symbols/packages/synthesis-contracts/src/exportDelivery.ts/rebuildDescriptor.md) | 函数 | 279–345 | 重建导出条目描述符：校验 displayName、相对路径、字节长度与 MIME 形状，拒绝控制字符与超长字段。 |
| rebuildEntries | 函数 | 186–225 | 重建导出条目集合：校验条目数量上限、逐条描述符合法性与总体字节预算，输出带诊断的聚合结果。 |
| [rebuildSynthesisHostExportDeliveryResult](../../../../symbols/packages/synthesis-contracts/src/exportDelivery.ts/rebuildSynthesisHostExportDeliveryResult.md) | 函数 | 486–537 | 重建导出交付结果：统一 status、已写入条目与诊断列表，确保 wire 层可直接编码而不二次校验。 |
| rebuildSynthesisHostRunWorkspaceMaterializationRequest | 函数 | 392–428 | 重建运行工作区物化请求：绑定 runId、工作区路径与目标条目集合，校验路径形状与条目数量上限。 |
| rebuildSynthesisHostRunWorkspaceMaterializationResult | 函数 | 457–484 | 重建工作区物化结果：回传已物化路径、跳过项与失败诊断，保持与请求侧同构。 |
