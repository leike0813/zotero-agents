
# src/modules/harness/synthesisReadonlyPort.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/synthesisReadonlyPort.ts -->

Harness 只读 Synthesis Port 的核心实现：直接查询只读 SQLite，把 topic、concept、tag、review、citation graph 等工作台 Surface 投影为固定上限的内存结果，使 UI 能在无 sidecar 时渲染。
源码：[src/modules/harness/synthesisReadonlyPort.ts](../../../../../../src/modules/harness/synthesisReadonlyPort.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [clientPortAdapter.ts](../synthesisClient/clientPortAdapter.ts.md) | src/modules/synthesisClient/clientPortAdapter.ts | Synthesis 客户端 Port 适配器：把抽象的 `SynthesisClientPort` 调用翻译为契约重建 + 受控执行，是 UI 与原生实现之间的统一入参校验与错误归一化边界。 |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [sqliteReadonly.ts](sqliteReadonly.ts.md) | src/modules/harness/sqliteReadonly.ts | Harness 侧只读 SQLite 访问层：以 readOnly 模式打开 zoteroDB/plugin 数据文件，必要时先拷贝到临时目录，并提供符合 synthesis-repository `SqlAdapter` 契约的适配器。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisReadonlyClient.ts](synthesisReadonlyClient.ts.md) | src/modules/harness/synthesisReadonlyClient.ts | 组装 Harness 只读 Synthesis 客户端：安装只读 Zotero 宿主 mock，打开 zoteroDB/pluginDB，并把只读 Port 接到统一的 clientPortAdapter 上。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisReadonlyPort](../../../../symbols/globals.md) | 函数 | 802–847 | 创建只读 Port 工厂，返回覆盖 workbench Surface、topic detail 与概念能力的最小实现。 |
