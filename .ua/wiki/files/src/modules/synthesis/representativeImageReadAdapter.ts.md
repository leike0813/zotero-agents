
# src/modules/synthesis/representativeImageReadAdapter.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/representativeImageReadAdapter.ts -->

Synthesis 代表图读取 port 实现：按 digest 描述符定位附件文件、读取字节并以 base64 形式回传，同时对不可用情形返回结构化诊断。
源码：[src/modules/synthesis/representativeImageReadAdapter.ts](../../../../../../src/modules/synthesis/representativeImageReadAdapter.ts)

## 符号（1）
<!-- node: function:src/modules/synthesis/representativeImageReadAdapter.ts:createZoteroSynthesisRepresentativeImageReadPort -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [createZoteroSynthesisRepresentativeImageReadPort](../../../../symbols/src/modules/synthesis/representativeImageReadAdapter.ts/createZoteroSynthesisRepresentativeImageReadPort.md) | 函数 | 128–249 | 复杂 | port-实现、代表图、base64、诊断 | 1 | 构造代表图读取 port：定位 digest 条目、读取附件字节并以 base64 返回，失败时给出结构化诊断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [digestRepresentativeImage.ts](digestRepresentativeImage.ts.md) | src/modules/synthesis/digestRepresentativeImage.ts | 从 digest managed note 的 HTML 中解析代表图描述符，并投影成 UI 所需的精简字段。 |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisReverseHostHandlers.ts](reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createZoteroSynthesisRepresentativeImageReadPort](../../../../symbols/src/modules/synthesis/representativeImageReadAdapter.ts/createZoteroSynthesisRepresentativeImageReadPort.md) | 函数 | 128–249 | 构造代表图读取 port：定位 digest 条目、读取附件字节并以 base64 返回，失败时给出结构化诊断。 |
