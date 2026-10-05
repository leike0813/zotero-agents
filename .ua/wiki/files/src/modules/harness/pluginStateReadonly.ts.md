
# src/modules/harness/pluginStateReadonly.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/pluginStateReadonly.ts -->

插件状态只读存储：以只读方式打开插件 SQLite 库，把 run、任务、请求与上下文表归一化为 Harness 可查询的行集合。
源码：[src/modules/harness/pluginStateReadonly.ts](../../../../../../src/modules/harness/pluginStateReadonly.ts)

## 符号（4）
<!-- node: function:src/modules/harness/pluginStateReadonly.ts:createPluginStateReadonlyStore -->
<!-- node: function:src/modules/harness/pluginStateReadonly.ts:normalizeRequestRow -->
<!-- node: function:src/modules/harness/pluginStateReadonly.ts:normalizeTaskRow -->
<!-- node: function:src/modules/harness/pluginStateReadonly.ts:safeRows -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [createPluginStateReadonlyStore](../../../../symbols/src/modules/harness/pluginStateReadonly.ts/createPluginStateReadonlyStore.md) | 函数 | 303–435 | 中等 | harness、readonly、sqlite、data-access、core | 2 | 打开只读数据库连接并组装各表查询方法，返回 Harness 使用的只读存储句柄。 |
| normalizeRequestRow | 函数 | 179–206 | 简单 | harness、readonly、normalization、data-access | 0 | 归一化请求表行，还原请求 payload 中的关键标识与状态。 |
| normalizeTaskRow | 函数 | 137–177 | 中等 | harness、readonly、normalization、data-access | 0 | 归一化任务表行，抽取任务 id、工作流 id、状态与时间字段。 |
| safeRows | 函数 | 71–81 | 简单 | harness、readonly、error-handling、data-access | 0 | 执行只读查询并把异常收敛为空结果，保证 Harness 页面不会因表缺失而崩溃。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sqliteReadonly.ts](sqliteReadonly.ts.md) | src/modules/harness/sqliteReadonly.ts | Harness 侧只读 SQLite 访问层：以 readOnly 模式打开 zoteroDB/plugin 数据文件，必要时先拷贝到临时目录，并提供符合 synthesis-repository `SqlAdapter` 契约的适配器。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantReadonlyPublication.ts](assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [dashboardReadonlyModel.ts](dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |
| [skillRunnerReadonlyProjection.ts](skillRunnerReadonlyProjection.ts.md) | src/modules/harness/skillRunnerReadonlyProjection.ts | SkillRunner 只读投影：把插件状态中的 run 记录与 sequence 状态投影成 Harness 可见的运行列表，附带状态语义与技能显示名。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createPluginStateReadonlyStore](../../../../symbols/src/modules/harness/pluginStateReadonly.ts/createPluginStateReadonlyStore.md) | 函数 | 303–435 | 打开只读数据库连接并组装各表查询方法，返回 Harness 使用的只读存储句柄。 |
