
# scripts/host-bridge/render-host-mutation-contract.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/render-host-mutation-contract.ts -->

构建期脚本，把 canonical mutation 的 JSON Schema 渲染成 Host Bridge agent-facing 契约文本，保证代理侧看到的 mutation 语义与插件侧 schema 同源。
源码：[scripts/host-bridge/render-host-mutation-contract.ts](../../../../../scripts/host-bridge/render-host-mutation-contract.ts)

## 符号（2）
<!-- node: function:scripts/host-bridge/render-host-mutation-contract.ts:bridgeMutationInput -->
<!-- node: function:scripts/host-bridge/render-host-mutation-contract.ts:renderedContract -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bridgeMutationInput | 函数 | 26–57 | 简单 | schema、mutation、合约 | 0 | 由 mutation schema 构造 Host Bridge 侧 mutation 输入样例，界定允许的字段与取值范围。 |
| renderedContract | 函数 | 59–100 | 中等 | 渲染、契约、mutation | 0 | 把 mutation 输入输出 schema 渲染为人类可读契约文本，作为 agent-facing surface 的语义来源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityContract.ts](../../src/modules/hostBridge/server/hostBridgeCapabilityContract.ts.md) | src/modules/hostBridge/server/hostBridgeCapabilityContract.ts | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
| [zoteroHostMutationSchemas.ts](../../src/schemas/zoteroHostMutationSchemas.ts.md) | src/schemas/zoteroHostMutationSchemas.ts | Zotero 宿主变更的 JSON Schema 契约：定义 note detail、managed note 写入、文献产物 upsert 与各 mutation 操作的输入/预览/执行结果 schema 及其按操作索引的映射表。 |
