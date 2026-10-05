
# packages/synthesis-contracts/src/representativeImageRead.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/representativeImageRead.ts -->

宿主代表图读取契约：限制内容字节与诊断条数，重建读取请求以及 available / unavailable 两态结果。
源码：[packages/synthesis-contracts/src/representativeImageRead.ts](../../../../../../packages/synthesis-contracts/src/representativeImageRead.ts)

## 符号（9）
<!-- node: function:packages/synthesis-contracts/src/representativeImageRead.ts:decodedBase64Bytes -->
<!-- node: function:packages/synthesis-contracts/src/representativeImageRead.ts:optionalPositiveInteger -->
<!-- node: function:packages/synthesis-contracts/src/representativeImageRead.ts:optionalString -->
<!-- node: function:packages/synthesis-contracts/src/representativeImageRead.ts:rebuildAvailable -->
<!-- node: function:packages/synthesis-contracts/src/representativeImageRead.ts:rebuildDiagnostics -->
<!-- node: function:packages/synthesis-contracts/src/representativeImageRead.ts:rebuildSynthesisHostRepresentativeImageReadRequest -->
<!-- node: function:packages/synthesis-contracts/src/representativeImageRead.ts:rebuildSynthesisHostRepresentativeImageReadResult -->
<!-- node: function:packages/synthesis-contracts/src/representativeImageRead.ts:rebuildUnavailable -->
<!-- node: function:packages/synthesis-contracts/src/representativeImageRead.ts:requiredString -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| decodedBase64Bytes | 函数 | 127–139 | 简单 | utility、encoding、validation | 0 | 解码 base64 内容并计算字节数，超出上限时截断或失败。 |
| optionalPositiveInteger | 函数 | 103–112 | 简单 | validation、contract、parsing | 0 | 读取可选的正整数字段，缺省时返回 undefined。 |
| optionalString | 函数 | 78–87 | 简单 | validation、contract、parsing | 0 | 读取可选字符串字段。 |
| rebuildAvailable | 函数 | 166–221 | 中等 | contract、rebuild、image | 0 | 重建代表图可用结果，携带 MIME、大小、尺寸与 base64 内容。 |
| rebuildDiagnostics | 函数 | 114–125 | 简单 | contract、rebuild、diagnostics | 0 | 重建读取诊断列表并截断到上限。 |
| rebuildSynthesisHostRepresentativeImageReadRequest | 函数 | 223–240 | 简单 | contract、rebuild、image | 0 | 重建代表图读取请求，校验条目键、候选与字节上限。 |
| rebuildSynthesisHostRepresentativeImageReadResult | 函数 | 242–270 | 简单 | contract、rebuild、image | 0 | 重建代表图读取顶层结果，收敛 available / unavailable 两态。 |
| rebuildUnavailable | 函数 | 141–164 | 简单 | contract、rebuild、image | 0 | 重建代表图不可用结果，携带稳定原因码与诊断。 |
| requiredString | 函数 | 67–76 | 简单 | validation、contract、parsing | 0 | 读取必填字符串字段，缺失、超长或含非法字符时抛出契约错误。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisHostRepresentativeImageReadRequest | 函数 | 223–240 | 重建代表图读取请求，校验条目键、候选与字节上限。 |
| rebuildSynthesisHostRepresentativeImageReadResult | 函数 | 242–270 | 重建代表图读取顶层结果，收敛 available / unavailable 两态。 |
