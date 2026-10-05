
# src/dashboard/components
> 目录聚合页：12 个文件、77 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/dashboard/components/AcpTraceReplayRegion.tsx](../../../files/src/dashboard/components/AcpTraceReplayRegion.tsx.md) | 文件 | 4 | Dashboard 的 ACP Trace & Replay 面板（Preact 区域）：上半部是语义 trace 录制器的源/限额配置与 arm-finish-cancel-save 生命周期，下半部是 replay profiler 的 trace 路径预检、阶段与节奏草稿、3×3 实测矩阵槽位及证据详情。 |
| [src/dashboard/components/BackendManagerRegion.tsx](../../../files/src/dashboard/components/BackendManagerRegion.tsx.md) | 文件 | 11 | 后端管理对话框的全部 Preact 区域组件：header/body/footer 主体区域加上 ACP 与通用 HTTP 两个预设对话框，负责后端行的命令、token、参数与环境变量编辑，以及 provider 预设的生成与落盘。 |
| [src/dashboard/components/BackendRegion.tsx](../../../files/src/dashboard/components/BackendRegion.tsx.md) | 文件 | 7 | Dashboard 的 Backend 面板：把旧实现中三套按后端类型分支的渲染器（generic / SkillRunner / ACP）合并为一个参数化区域，共享同一套任务表外壳，并附通用后端的绑定日志区与 SkillRunner 管理子视图。 |
| [src/dashboard/components/HomeRegion.tsx](../../../files/src/dashboard/components/HomeRegion.tsx.md) | 文件 | 4 | Dashboard 的 Home 面板：工作流气泡卡片、汇总统计、运行中任务表，以及点开某个工作流后的文档阅读视图，全部文案由 panel model 预先解析。 |
| [src/dashboard/components/MigrationsRegion.tsx](../../../files/src/dashboard/components/MigrationsRegion.tsx.md) | 文件 | 2 | Dashboard 的文献资产迁移面板：只读呈现 Dashboard-local 迁移 service 持有的扫描/应用/停止/继续生命周期，展示候选文献事实、决策、诊断与恢复提示，并提供复制诊断包。 |
| [src/dashboard/components/ProductsRegion.tsx](../../../files/src/dashboard/components/ProductsRegion.tsx.md) | 文件 | 11 | Dashboard 的产物（Products）面板：产物与 Skill 反馈分栏切换、可展开的产物文件树、代码/Markdown 预览（highlight.js 高亮 + 共享 Markdown renderer）以及反馈选择工具栏。 |
| [src/dashboard/components/RuntimeLogsRegion.tsx](../../../files/src/dashboard/components/RuntimeLogsRegion.tsx.md) | 文件 | 5 | Dashboard 的 Runtime Logs 面板：日志级别复选、后端/工作流多选下拉、诊断模式开关、上下文范围 chips、预算行、复制与清空操作，以及带详情面板的日志表。 |
| [src/dashboard/components/SkillrunnerAuditRegion.tsx](../../../files/src/dashboard/components/SkillrunnerAuditRegion.tsx.md) | 文件 | 3 | Dashboard 的 SkillRunner 连接审计面板（只读）：呈现 governor 指标卡、各维度计数条与近期事件表；唯一的交互是复制 JSON，由集成层通过 onCopyJson 回调完成，不产生任何 wire 动作。 |
| [src/dashboard/components/SynthesisSidecarRegion.tsx](../../../files/src/dashboard/components/SynthesisSidecarRegion.tsx.md) | 文件 | 11 | Dashboard 的 Synthesis Sidecar trace 面板：汇总卡、trace 搜索过滤、命令式 trace 表 island，以及因果 trace 详情面板（span 树 + 复制）。所有筛选与选中状态都是页面本地 UI state，不产生宿主往返。 |
| [src/dashboard/components/TabBarRegion.tsx](../../../files/src/dashboard/components/TabBarRegion.tsx.md) | 文件 | 2 | Dashboard 侧边栏标签条：按 system 与 backend 两个分组渲染标签项，展示不可用原因与不可用标签，并把点击回传为 onSelectTab。 |
| [src/dashboard/components/WorkflowOptionsRegion.tsx](../../../files/src/dashboard/components/WorkflowOptionsRegion.tsx.md) | 文件 | 10 | Dashboard 的工作流选项面板：内联工作流设置表单引擎，按 schema 渲染分区与字段，支持自定义 select、布尔开关、数值校验与 provider 条件字段的可见性判定。 |
| [src/dashboard/components/WorkflowSettingsDialogRegion.tsx](../../../files/src/dashboard/components/WorkflowSettingsDialogRegion.tsx.md) | 文件 | 7 | 独立的工作流设置对话框区域：复用 WorkflowOptionsRegion 的共享表单引擎渲染 schema 字段，并额外提供执行单元预览与宿主队列选项两张卡片。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/shared](../shared.md) | 37 |
| [src/dashboard](../dashboard.md) | 1 |
