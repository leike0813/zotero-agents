
# src/modules/harness/sqliteReadonly.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/sqliteReadonly.ts -->

Harness 侧只读 SQLite 访问层：以 readOnly 模式打开 zoteroDB/plugin 数据文件，必要时先拷贝到临时目录，并提供符合 synthesis-repository `SqlAdapter` 契约的适配器。
源码：[src/modules/harness/sqliteReadonly.ts](../../../../../../src/modules/harness/sqliteReadonly.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-repository/src/index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [pluginStateReadonly.ts](pluginStateReadonly.ts.md) | src/modules/harness/pluginStateReadonly.ts | 插件状态只读存储：以只读方式打开插件 SQLite 库，把 run、任务、请求与上下文表归一化为 Harness 可查询的行集合。 |
| [synthesisReadonlyClient.ts](synthesisReadonlyClient.ts.md) | src/modules/harness/synthesisReadonlyClient.ts | 组装 Harness 只读 Synthesis 客户端：安装只读 Zotero 宿主 mock，打开 zoteroDB/pluginDB，并把只读 Port 接到统一的 clientPortAdapter 上。 |
| [synthesisReadonlyPort.ts](synthesisReadonlyPort.ts.md) | src/modules/harness/synthesisReadonlyPort.ts | Harness 只读 Synthesis Port 的核心实现：直接查询只读 SQLite，把 topic、concept、tag、review、citation graph 等工作台 Surface 投影为固定上限的内存结果，使 UI 能在无 sidecar 时渲染。 |
| [zoteroReadonlyLibraryAdapter.ts](zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createReadonlySqliteAdapter](../../../../symbols/globals.md) | 函数 | 166–200 | 把只读数据库适配成 synthesis-repository 的 `SqlAdapter`，执行前规范化 SQL 与参数并拦截写操作。 |
| [createReadonlySqliteDatabase](../../../../symbols/globals.md) | 函数 | 142–164 | 构造只读数据库包装器，提供 all/get/run/exec 受限接口并在关闭时释放底层句柄。 |
