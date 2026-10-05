
# src/modules/zipStore.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/zipStore.ts -->

纯前端 ZIP 写入器：用 TextEncoder、CRC32 表与 PNG 风格的分块编码把一组文本/字节条目打包成 ZIP 字节流，供工作流归档在无 Node 环境下使用。

规模：159 行
源码：[src/modules/zipStore.ts](../../../../../src/modules/zipStore.ts)

## 符号（3）
<!-- node: function:src/modules/zipStore.ts:asUint8Array -->
<!-- node: function:src/modules/zipStore.ts:createStoreZipBytes -->
<!-- node: function:src/modules/zipStore.ts:normalizeEntryName -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| asUint8Array | 函数 | 11–25 | 简单 | utility、bytes、normalization | 0 | 把字符串、ArrayBuffer、ArrayBufferView 或 Uint8Array 统一规整为 Uint8Array，供 ZIP 写入使用。 |
| createStoreZipBytes | 函数 | 84–159 | 中等 | zip、encoder、serialization、exported | 1 | 把一组文本或字节条目打包为完整的 ZIP 字节流，含本地文件头、中央目录与 EOCD。 |
| normalizeEntryName | 函数 | 66–82 | 简单 | utility、path-safety、validation | 0 | 规范化 ZIP 条目名：统一分隔符、拒绝绝对路径与 .. 越界片段。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [archive.ts](../workflows/archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [exportDeliveryAdapter.ts](synthesis/exportDeliveryAdapter.ts.md) | src/modules/synthesis/exportDeliveryAdapter.ts | Synthesis 宿主导出与运行工作区物化 port 的实现：把 sidecar 侧请求落到运行时目录、注册 Host Bridge 文件句柄并返回可下载交付结果。 |
| [hostBridgeCapabilityRegistry.ts](hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeWorkflowAgentRun.ts](hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createStoreZipBytes | 函数 | 84–159 | 把一组文本或字节条目打包为完整的 ZIP 字节流，含本地文件头、中央目录与 EOCD。 |
