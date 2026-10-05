
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1](../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json -->

sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json](../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](../../src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [corpus.json](../synthesis-native-runtime-v2/corpus.json.md) | packages/synthesis-contracts/contract-set/synthesis-native-runtime-v2/corpus.json | native runtime v2 契约的语料清单，定义 sidecar 运行期 capability dispatch、ready publication 与生命周期终止在跨语言边界的样本结构。 |
