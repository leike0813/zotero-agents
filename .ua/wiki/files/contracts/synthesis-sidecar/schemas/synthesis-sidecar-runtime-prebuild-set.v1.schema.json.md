
# contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-set.v1.schema.json
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[contracts/synthesis-sidecar/schemas](../../../../modules/contracts/synthesis-sidecar/schemas.md)
<!-- node: config:contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-set.v1.schema.json -->

预构建集合契约，要求 archives 数组恰好包含 7 条（win32-x64、darwin-x64/arm64 与四个 linux 变体），每条记录 target、归档文件名、sha256 与字节数。
源码：[contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-set.v1.schema.json](../../../../../../contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-set.v1.schema.json)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesis-sidecar-runtime-prebuild-result.v2.schema.json](synthesis-sidecar-runtime-prebuild-result.v2.schema.json.md) | contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-result.v2.schema.json | 预构建结果契约的 v2 版本，在 v1 字段之上追加必填的 cache 对象，记录七个受支持目标平台的缓存命中/未命中情况及其来源 runId。 |
