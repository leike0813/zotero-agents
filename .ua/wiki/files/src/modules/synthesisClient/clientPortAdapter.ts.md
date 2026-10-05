
# src/modules/synthesisClient/clientPortAdapter.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesisClient](../../../../modules/src/modules/synthesisClient.md)
<!-- node: file:src/modules/synthesisClient/clientPortAdapter.ts -->

Synthesis 客户端 Port 适配器：把抽象的 `SynthesisClientPort` 调用翻译为契约重建 + 受控执行，是 UI 与原生实现之间的统一入参校验与错误归一化边界。
源码：[src/modules/synthesisClient/clientPortAdapter.ts](../../../../../../src/modules/synthesisClient/clientPortAdapter.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [guardedSqlite.ts](../guardedSqlite.ts.md) | src/modules/guardedSqlite.ts | 受保护的 SQLite 连接封装：设置 busy timeout、对 SQLITE_BUSY 做有界重试，并暴露统一的连接获取入口供 pluginStateStore 使用。 |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [nativeComposition.ts](nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |
| [synthesisReadonlyClient.ts](../harness/synthesisReadonlyClient.ts.md) | src/modules/harness/synthesisReadonlyClient.ts | 组装 Harness 只读 Synthesis 客户端：安装只读 Zotero 宿主 mock，打开 zoteroDB/pluginDB，并把只读 Port 接到统一的 clientPortAdapter 上。 |
| [synthesisReadonlyPort.ts](../harness/synthesisReadonlyPort.ts.md) | src/modules/harness/synthesisReadonlyPort.ts | Harness 只读 Synthesis Port 的核心实现：直接查询只读 SQLite，把 topic、concept、tag、review、citation graph 等工作台 Surface 投影为固定上限的内存结果，使 UI 能在无 sidecar 时渲染。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisClientFromPort](../../../../symbols/globals.md) | 函数 | 1429–2684 | 从 Port 构造完整 Synthesis 客户端：逐个实现 topic、artifact、concept、tag、reference、graph、sync 与 capability 方法，每个方法都做入参重建与结果归一化。 |
