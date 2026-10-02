
# src/modules/synthesis/digestRepresentativeImage.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/digestRepresentativeImage.ts -->

从 digest managed note 的 HTML 中解析代表图描述符，并投影成 UI 所需的精简字段。
源码：[src/modules/synthesis/digestRepresentativeImage.ts](../../../../../../src/modules/synthesis/digestRepresentativeImage.ts)

## 符号（2）
<!-- node: function:src/modules/synthesis/digestRepresentativeImage.ts:extractDigestRepresentativeImageDescriptor -->
<!-- node: function:src/modules/synthesis/digestRepresentativeImage.ts:projectDigestRepresentativeImageForUi -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [extractDigestRepresentativeImageDescriptor](../../../../symbols/src/modules/synthesis/digestRepresentativeImage.ts/extractDigestRepresentativeImageDescriptor.md) | 函数 | 71–129 | 中等 | digest、解析、html、描述符 | 2 | 从 digest note HTML 中定位代表图标签，解析尺寸、来源与路径属性并产出描述符。 |
| projectDigestRepresentativeImageForUi | 函数 | 131–162 | 简单 | 投影、ui、digest | 0 | 把代表图描述符投影为 UI 消费的精简结构，剔除仅内部使用的字段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [representativeImageReadAdapter.ts](representativeImageReadAdapter.ts.md) | src/modules/synthesis/representativeImageReadAdapter.ts | Synthesis 代表图读取 port 实现：按 digest 描述符定位附件文件、读取字节并以 base64 形式回传，同时对不可用情形返回结构化诊断。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [extractDigestRepresentativeImageDescriptor](../../../../symbols/src/modules/synthesis/digestRepresentativeImage.ts/extractDigestRepresentativeImageDescriptor.md) | 函数 | 71–129 | 从 digest note HTML 中定位代表图标签，解析尺寸、来源与路径属性并产出描述符。 |
| projectDigestRepresentativeImageForUi | 函数 | 131–162 | 把代表图描述符投影为 UI 消费的精简结构，剔除仅内部使用的字段。 |
