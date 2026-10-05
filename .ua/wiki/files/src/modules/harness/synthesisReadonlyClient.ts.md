
# src/modules/harness/synthesisReadonlyClient.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/synthesisReadonlyClient.ts -->

组装 Harness 只读 Synthesis 客户端：安装只读 Zotero 宿主 mock，打开 zoteroDB/pluginDB，并把只读 Port 接到统一的 clientPortAdapter 上。
源码：[src/modules/harness/synthesisReadonlyClient.ts](../../../../../../src/modules/harness/synthesisReadonlyClient.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [clientPortAdapter.ts](../synthesisClient/clientPortAdapter.ts.md) | src/modules/synthesisClient/clientPortAdapter.ts | Synthesis 客户端 Port 适配器：把抽象的 `SynthesisClientPort` 调用翻译为契约重建 + 受控执行，是 UI 与原生实现之间的统一入参校验与错误归一化边界。 |
| [sqliteReadonly.ts](sqliteReadonly.ts.md) | src/modules/harness/sqliteReadonly.ts | Harness 侧只读 SQLite 访问层：以 readOnly 模式打开 zoteroDB/plugin 数据文件，必要时先拷贝到临时目录，并提供符合 synthesis-repository `SqlAdapter` 契约的适配器。 |
| [synthesisReadonlyPort.ts](synthesisReadonlyPort.ts.md) | src/modules/harness/synthesisReadonlyPort.ts | Harness 只读 Synthesis Port 的核心实现：直接查询只读 SQLite，把 topic、concept、tag、review、citation graph 等工作台 Surface 投影为固定上限的内存结果，使 UI 能在无 sidecar 时渲染。 |
| [zoteroReadonlyLibraryAdapter.ts](zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ui-harness-serve.ts](../../../scripts/ui-harness-serve.ts.md) | scripts/ui-harness-serve.ts | UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisReadonlyClient](../../../../symbols/globals.md) | 函数 | 30–65 | 创建只读合成客户端实例：先安装禁止写入的 Zotero.Prefs 替身，再打开只读数据库并构造只读 Surface Port。 |
