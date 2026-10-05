
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-artifact-library-debug.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-artifact-library-debug.json -->

Synthesis Sidecar 协议契约语料，锁定 artifact 库调试相关的 artifact-row 与 debug-operation 线缆形状：嵌套正例（nested positive）与开放字段负例（open negative）各成对出现，用于约束客户端解析时的封闭字段集合。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-artifact-library-debug.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-artifact-library-debug.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-artifact-library-debug.schema.json](../schemas/client-artifact-library-debug.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-artifact-library-debug.schema.json | 定义 Artifact Library 客户端读取与调试快照的 JSON Schema，约束产物筛选、分页调试视图、导出状态以及文献质量与作者等字段。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
| [reverse-host.json](reverse-host.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json | 反向宿主（reverse-host）调用语料集，是本批唯一使用独立 schema 标识的语料文件，收录 10 个用例覆盖 related-items、tag effect、representative image、WebDAV description、artifact scan 与 delivery 等反向宿主结果形状。 |
