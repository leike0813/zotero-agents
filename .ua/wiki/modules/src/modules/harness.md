
# src/modules/harness
> 目录聚合页：12 个文件、34 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/harness/assistantReadonlyPublication.ts](../../../files/src/modules/harness/assistantReadonlyPublication.ts.md) | 文件 | 9 | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [src/modules/harness/backendsReadonly.ts](../../../files/src/modules/harness/backendsReadonly.ts.md) | 文件 | 2 | 后端只读快照：从 prefs 读取 backends 配置并归一化为 Harness 专用形状，不做任何 id 重映射或引用同步。 |
| [src/modules/harness/dashboardReadonlyModel.ts](../../../files/src/modules/harness/dashboardReadonlyModel.ts.md) | 文件 | 9 | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |
| [src/modules/harness/env.ts](../../../files/src/modules/harness/env.ts.md) | 文件 | 1 | Harness 环境变量解析器：只接受白名单内的三个路径变量，正确处理行内注释、引号与 export 前缀。 |
| [src/modules/harness/pluginStateReadonly.ts](../../../files/src/modules/harness/pluginStateReadonly.ts.md) | 文件 | 4 | 插件状态只读存储：以只读方式打开插件 SQLite 库，把 run、任务、请求与上下文表归一化为 Harness 可查询的行集合。 |
| [src/modules/harness/prefsReadonly.ts](../../../files/src/modules/harness/prefsReadonly.ts.md) | 文件 | 0 | 只读测试 Harness 中解析 Zotero prefs.js 的实现，按行解析 user prefs 与默认 prefs 并提供只读键值存储视图，供 UI Harness 在脱离 Zotero 宿主时读取插件首选项。 |
| [src/modules/harness/skillRunnerReadonlyProjection.ts](../../../files/src/modules/harness/skillRunnerReadonlyProjection.ts.md) | 文件 | 5 | SkillRunner 只读投影：把插件状态中的 run 记录与 sequence 状态投影成 Harness 可见的运行列表，附带状态语义与技能显示名。 |
| [src/modules/harness/sqliteReadonly.ts](../../../files/src/modules/harness/sqliteReadonly.ts.md) | 文件 | 0 | Harness 侧只读 SQLite 访问层：以 readOnly 模式打开 zoteroDB/plugin 数据文件，必要时先拷贝到临时目录，并提供符合 synthesis-repository `SqlAdapter` 契约的适配器。 |
| [src/modules/harness/synthesisReadonlyClient.ts](../../../files/src/modules/harness/synthesisReadonlyClient.ts.md) | 文件 | 0 | 组装 Harness 只读 Synthesis 客户端：安装只读 Zotero 宿主 mock，打开 zoteroDB/pluginDB，并把只读 Port 接到统一的 clientPortAdapter 上。 |
| [src/modules/harness/synthesisReadonlyPort.ts](../../../files/src/modules/harness/synthesisReadonlyPort.ts.md) | 文件 | 0 | Harness 只读 Synthesis Port 的核心实现：直接查询只读 SQLite，把 topic、concept、tag、review、citation graph 等工作台 Surface 投影为固定上限的内存结果，使 UI 能在无 sidecar 时渲染。 |
| [src/modules/harness/synthesisWorkbenchI18nEnvelope.ts](../../../files/src/modules/harness/synthesisWorkbenchI18nEnvelope.ts.md) | 文件 | 0 | 为只读 Harness 解析 locale 并读取 FTL 资源，构建与正式工作台一致的 i18n envelope，使 Harness 页面复用同一套文案键。 |
| [src/modules/harness/zoteroReadonlyLibraryAdapter.ts](../../../files/src/modules/harness/zoteroReadonlyLibraryAdapter.ts.md) | 文件 | 4 | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/workflows](../workflows.md) | 8 |
| [src/backends](../backends.md) | 5 |
| [src/modules/assistant/publication](assistant/publication.md) | 5 |
| [src/config](../config.md) | 4 |
| [src/modules/synthesis](synthesis.md) | 3 |
| [packages/synthesis-contracts/src](../../packages/synthesis-contracts/src.md) | 2 |
| [src/modules/synthesisClient](synthesisClient.md) | 2 |
| [src/modules/workflow/catalog](workflow/catalog.md) | 2 |
| [src/modules/zoteroHost](zoteroHost.md) | 2 |
| [src/shared](../shared.md) | 2 |
| [src/utils](../utils.md) | 2 |
| [packages/synthesis-repository/src](../../packages/synthesis-repository/src.md) | 1 |
| [src](../../src.md) | 1 |
| [src/modules/assistant/workspace](assistant/workspace.md) | 1 |
| [src/modules/workflow/settings](workflow/settings.md) | 1 |
