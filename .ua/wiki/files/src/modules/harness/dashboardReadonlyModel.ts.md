
# src/modules/harness/dashboardReadonlyModel.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/dashboardReadonlyModel.ts -->

Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。
源码：[src/modules/harness/dashboardReadonlyModel.ts](../../../../../../src/modules/harness/dashboardReadonlyModel.ts)

## 符号（9）
<!-- node: function:src/modules/harness/dashboardReadonlyModel.ts:createDashboardReadonlyModel -->
<!-- node: function:src/modules/harness/dashboardReadonlyModel.ts:dashboardSurfaceSignatures -->
<!-- node: function:src/modules/harness/dashboardReadonlyModel.ts:loadHarnessWorkflows -->
<!-- node: function:src/modules/harness/dashboardReadonlyModel.ts:mergeWorkflows -->
<!-- node: function:src/modules/harness/dashboardReadonlyModel.ts:minimalMarkdownHtml -->
<!-- node: function:src/modules/harness/dashboardReadonlyModel.ts:normalizeDashboardRow -->
<!-- node: function:src/modules/harness/dashboardReadonlyModel.ts:normalizeProduct -->
<!-- node: function:src/modules/harness/dashboardReadonlyModel.ts:previewForProductAsset -->
<!-- node: function:src/modules/harness/dashboardReadonlyModel.ts:readWorkflowDoc -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createDashboardReadonlyModel | 函数 | 587–1071 | 复杂 | harness、readonly、dashboard、orchestration、core | 0 | 构建 Dashboard 只读模型：打开只读存储、拉取后端与任务、合并工作流与产品资产，返回按 surface 分组的行数据与签名。 |
| dashboardSurfaceSignatures | 函数 | 103–135 | 中等 | harness、readonly、dashboard、memoization、core | 0 | 为每个 Dashboard surface 计算稳定签名，签名只含该 surface 自身可见内容。 |
| loadHarnessWorkflows | 函数 | 454–476 | 简单 | harness、readonly、workflow、loader | 1 | 按传入目录加载工作流 manifest，供 Dashboard 只读模型构建工作流视图。 |
| mergeWorkflows | 函数 | 428–446 | 简单 | harness、readonly、workflow、catalog | 0 | 合并内置与用户安装的工作流条目，并按 Harness 可见性过滤。 |
| minimalMarkdownHtml | 函数 | 485–496 | 简单 | harness、readonly、rendering、utility | 1 | 把 Markdown 转为最小可用的 HTML 片段，避免在 Harness 中引入完整渲染器依赖。 |
| normalizeDashboardRow | 函数 | 228–296 | 中等 | harness、readonly、normalization、dashboard | 0 | 把任务历史原始行归一化为 Dashboard 表格行，抽取状态语义、时间与可展示字段。 |
| normalizeProduct | 函数 | 520–555 | 中等 | harness、readonly、normalization、dashboard | 0 | 归一化工作流产品资产记录，提取标题、类型、标签与预览引用。 |
| previewForProductAsset | 函数 | 557–576 | 简单 | harness、readonly、dashboard、rendering | 0 | 为产品资产生成只读预览内容，Markdown 以最小 HTML 形式内联。 |
| readWorkflowDoc | 函数 | 505–518 | 简单 | harness、readonly、documentation、io | 0 | 读取工作流附带的说明文档，返回原始文本与 baseFileUri 供文档阅读区使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendsReadonly.ts](backendsReadonly.ts.md) | src/modules/harness/backendsReadonly.ts | 后端只读快照：从 prefs 读取 backends 配置并归一化为 Harness 专用形状，不做任何 id 重映射或引用同步。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [loader.ts](../../workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [localization.ts](../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [pluginStateReadonly.ts](pluginStateReadonly.ts.md) | src/modules/harness/pluginStateReadonly.ts | 插件状态只读存储：以只读方式打开插件 SQLite 库，把 run、任务、请求与上下文表归一化为 Harness 可查询的行集合。 |
| [skillRunnerReadonlyProjection.ts](skillRunnerReadonlyProjection.ts.md) | src/modules/harness/skillRunnerReadonlyProjection.ts | SkillRunner 只读投影：把插件状态中的 run 记录与 sequence 状态投影成 Harness 可见的运行列表，附带状态语义与技能显示名。 |
| [triggerPolicy.ts](../../workflows/triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowSettings.ts](../workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowVisibility.ts](../workflow/catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createDashboardReadonlyModel | 函数 | 587–1071 | 构建 Dashboard 只读模型：打开只读存储、拉取后端与任务、合并工作流与产品资产，返回按 surface 分组的行数据与签名。 |
