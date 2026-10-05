
# src/modules/harness/skillRunnerReadonlyProjection.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/skillRunnerReadonlyProjection.ts -->

SkillRunner 只读投影：把插件状态中的 run 记录与 sequence 状态投影成 Harness 可见的运行列表，附带状态语义与技能显示名。
源码：[src/modules/harness/skillRunnerReadonlyProjection.ts](../../../../../../src/modules/harness/skillRunnerReadonlyProjection.ts)

## 符号（5）
<!-- node: function:src/modules/harness/skillRunnerReadonlyProjection.ts:normalizeStatus -->
<!-- node: function:src/modules/harness/skillRunnerReadonlyProjection.ts:parseRunRecord -->
<!-- node: function:src/modules/harness/skillRunnerReadonlyProjection.ts:parseSequenceState -->
<!-- node: function:src/modules/harness/skillRunnerReadonlyProjection.ts:projectSkillRunnerReadonlyRuns -->
<!-- node: function:src/modules/harness/skillRunnerReadonlyProjection.ts:stateSemantics -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeStatus | 函数 | 146–159 | 简单 | harness、readonly、normalization、validation | 0 | 归一化 run 状态字符串，未知值统一降级为未知状态。 |
| parseRunRecord | 函数 | 174–249 | 中等 | harness、readonly、parsing、skillrunner | 1 | 解析 run 记录的 JSON 字段，容错缺失字段并输出统一形状的 run 视图。 |
| parseSequenceState | 函数 | 251–277 | 简单 | harness、readonly、parsing、workflow-execution | 1 | 解析 sequence 状态记录，抽取根状态与已完成的 step 摘要。 |
| [projectSkillRunnerReadonlyRuns](../../../../symbols/src/modules/harness/skillRunnerReadonlyProjection.ts/projectSkillRunnerReadonlyRuns.md) | 函数 | 347–455 | 中等 | harness、readonly、skillrunner、projection、core | 2 | 批量投影 SkillRunner run 列表，合并 sequence 状态、技能显示名与工作流信息，输出 Harness 行数据。 |
| stateSemantics | 函数 | 304–314 | 简单 | harness、readonly、normalization、ui-projection | 0 | 把内部状态码映射为面向用户的语义标签（运行中、等待、失败等）。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [localization.ts](../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [pluginStateReadonly.ts](pluginStateReadonly.ts.md) | src/modules/harness/pluginStateReadonly.ts | 插件状态只读存储：以只读方式打开插件 SQLite 库，把 run、任务、请求与上下文表归一化为 Harness 可查询的行集合。 |
| [prefs.ts](../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantReadonlyPublication.ts](assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [dashboardReadonlyModel.ts](dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [projectSkillRunnerReadonlyRuns](../../../../symbols/src/modules/harness/skillRunnerReadonlyProjection.ts/projectSkillRunnerReadonlyRuns.md) | 函数 | 347–455 | 批量投影 SkillRunner run 列表，合并 sequence 状态、技能显示名与工作流信息，输出 Harness 行数据。 |
