
# contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-release-set.v1.schema.json
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[contracts/synthesis-sidecar/schemas](../../../../modules/contracts/synthesis-sidecar/schemas.md)
<!-- node: config:contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-release-set.v1.schema.json -->

运行时发布集合契约的最简形态，只要求 releaseSetId、sourceCommit 以及 prebuild / materialized 两个不透明对象，由各自的 v2 契约进一步细化。
源码：[contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-release-set.v1.schema.json](../../../../../../contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-release-set.v1.schema.json)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesis-sidecar-runtime-release-receipt.v1.schema.json](synthesis-sidecar-runtime-release-receipt.v1.schema.json.md) | contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-release-receipt.v1.schema.json | 运行时发布回执契约，以 status 枚举（in_progress / failed / complete）表达发布进度，并携带 releaseSetId、sourceCommit、aggregate 与自由形式的 steps 对象。 |
