
# src/shared/regionEquality.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/regionEquality.ts -->

为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。
源码：[src/shared/regionEquality.ts](../../../../../src/shared/regionEquality.ts)

## 符号（3）
<!-- node: function:src/shared/regionEquality.ts:equalBySignature -->
<!-- node: function:src/shared/regionEquality.ts:safeText -->
<!-- node: function:src/shared/regionEquality.ts:stableRegionSignature -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [equalBySignature](../../../symbols/src/shared/regionEquality.ts/equalBySignature.md) | 函数 | 24–42 | 中等 | equality、memoization、signature、fast-path | 25 | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |
| safeText | 函数 | 12–14 | 简单 | utility、normalization、equality | 0 | 把任意值规范化为去除首尾空白的字符串，供签名比较安全使用。 |
| [stableRegionSignature](../../../symbols/src/shared/regionEquality.ts/stableRegionSignature.md) | 函数 | 16–22 | 简单 | signature、serialization、memoization | 5 | 为区域 selection 生成稳定字符串签名，序列化失败时降级为安全文本。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [AcpTraceReplayRegion.tsx](../dashboard/components/AcpTraceReplayRegion.tsx.md) | src/dashboard/components/AcpTraceReplayRegion.tsx | Dashboard 的 ACP Trace & Replay 面板（Preact 区域）：上半部是语义 trace 录制器的源/限额配置与 arm-finish-cancel-save 生命周期，下半部是 replay profiler 的 trace 路径预检、阶段与节奏草稿、3×3 实测矩阵槽位及证据详情。 |
| [ArtifactReader.tsx](../synthesis/components/reader/ArtifactReader.tsx.md) | src/synthesis/components/reader/ArtifactReader.tsx | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [BackendManagerRegion.tsx](../dashboard/components/BackendManagerRegion.tsx.md) | src/dashboard/components/BackendManagerRegion.tsx | 后端管理对话框的全部 Preact 区域组件：header/body/footer 主体区域加上 ACP 与通用 HTTP 两个预设对话框，负责后端行的命令、token、参数与环境变量编辑，以及 provider 预设的生成与落盘。 |
| [BackendRegion.tsx](../dashboard/components/BackendRegion.tsx.md) | src/dashboard/components/BackendRegion.tsx | Dashboard 的 Backend 面板：把旧实现中三套按后端类型分支的渲染器（generic / SkillRunner / ACP）合并为一个参数化区域，共享同一套任务表外壳，并附通用后端的绑定日志区与 SkillRunner 管理子视图。 |
| [ChromeRegion.tsx](../synthesis/components/ChromeRegion.tsx.md) | src/synthesis/components/ChromeRegion.tsx | Synthesis Workbench 页面的 chrome 区域：底部动作状态栏、后台任务弹层与 sidecar 运行指示。 |
| [ConceptsRegion.tsx](../synthesis/components/ConceptsRegion.tsx.md) | src/synthesis/components/ConceptsRegion.tsx | Synthesis Workbench 的 concepts 表面：概念筛选工具栏、缓存状态行、批量选择条、概念表与内联评审面板。 |
| [DigestModal.tsx](../synthesis/components/reader/DigestModal.tsx.md) | src/synthesis/components/reader/DigestModal.tsx | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [GraphRegion.tsx](../synthesis/components/graph/GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [HomeRegion.tsx](../dashboard/components/HomeRegion.tsx.md) | src/dashboard/components/HomeRegion.tsx | Dashboard 的 Home 面板：工作流气泡卡片、汇总统计、运行中任务表，以及点开某个工作流后的文档阅读视图，全部文案由 panel model 预先解析。 |
| [HomeRegion.tsx](../synthesis/components/HomeRegion.tsx.md) | src/synthesis/components/HomeRegion.tsx | Synthesis Workbench 的 home / overview 表面：库洞察卡片、WebDAV 同步面板与热门主题网格。 |
| [MigrationsRegion.tsx](../dashboard/components/MigrationsRegion.tsx.md) | src/dashboard/components/MigrationsRegion.tsx | Dashboard 的文献资产迁移面板：只读呈现 Dashboard-local 迁移 service 持有的扫描/应用/停止/继续生命周期，展示候选文献事实、决策、诊断与恢复提示，并提供复制诊断包。 |
| [ProductsRegion.tsx](../dashboard/components/ProductsRegion.tsx.md) | src/dashboard/components/ProductsRegion.tsx | Dashboard 的产物（Products）面板：产物与 Skill 反馈分栏切换、可展开的产物文件树、代码/Markdown 预览（highlight.js 高亮 + 共享 Markdown renderer）以及反馈选择工具栏。 |
| [ReaderRegion.tsx](../synthesis/components/reader/ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [regionEquality.ts](../sidebar/components/regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |
| [RegistryRegion.tsx](../synthesis/components/registry/RegistryRegion.tsx.md) | src/synthesis/components/registry/RegistryRegion.tsx | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |
| [ReviewCenterRegion.tsx](../synthesis/components/reviewCenter/ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [RuntimeLogsRegion.tsx](../dashboard/components/RuntimeLogsRegion.tsx.md) | src/dashboard/components/RuntimeLogsRegion.tsx | Dashboard 的 Runtime Logs 面板：日志级别复选、后端/工作流多选下拉、诊断模式开关、上下文范围 chips、预算行、复制与清空操作，以及带详情面板的日志表。 |
| [sections.tsx](../synthesis/components/reader/sections.tsx.md) | src/synthesis/components/reader/sections.tsx | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |
| [ShellRegion.tsx](../synthesis/components/ShellRegion.tsx.md) | src/synthesis/components/ShellRegion.tsx | Synthesis Workbench 页面的侧栏与顶栏外壳：导航标签、库标识与折叠开关。 |
| [SkillrunnerAuditRegion.tsx](../dashboard/components/SkillrunnerAuditRegion.tsx.md) | src/dashboard/components/SkillrunnerAuditRegion.tsx | Dashboard 的 SkillRunner 连接审计面板（只读）：呈现 governor 指标卡、各维度计数条与近期事件表；唯一的交互是复制 JSON，由集成层通过 onCopyJson 回调完成，不产生任何 wire 动作。 |
| [SynthesisSidecarRegion.tsx](../dashboard/components/SynthesisSidecarRegion.tsx.md) | src/dashboard/components/SynthesisSidecarRegion.tsx | Dashboard 的 Synthesis Sidecar trace 面板：汇总卡、trace 搜索过滤、命令式 trace 表 island，以及因果 trace 详情面板（span 树 + 复制）。所有筛选与选中状态都是页面本地 UI state，不产生宿主往返。 |
| [synthesisWorkbenchApp.ts](../synthesis/synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
| [synthesisWorkbenchChromeRenderer.ts](../synthesis/synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |
| [TabBarRegion.tsx](../dashboard/components/TabBarRegion.tsx.md) | src/dashboard/components/TabBarRegion.tsx | Dashboard 侧边栏标签条：按 system 与 backend 两个分组渲染标签项，展示不可用原因与不可用标签，并把点击回传为 onSelectTab。 |
| [TagsRegion.tsx](../synthesis/components/TagsRegion.tsx.md) | src/synthesis/components/TagsRegion.tsx | Synthesis Workbench 的 tags 表面：词汇表、待定收件箱、导入面板与全部标签批量编辑操作。 |
| [TimelineIsland.tsx](../synthesis/components/reader/TimelineIsland.tsx.md) | src/synthesis/components/reader/TimelineIsland.tsx | 主题时间线 island：仅在时间线数据签名或选中证据变化时重建共享命令式渲染器的产出 DOM。 |
| [TopicsRegion.tsx](../synthesis/components/TopicsRegion.tsx.md) | src/synthesis/components/TopicsRegion.tsx | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |
| [topicsRegionData.ts](../synthesis/components/topicsRegionData.ts.md) | src/synthesis/components/topicsRegionData.ts | 话题区域数据层：收窄话题产物与图节点/边 DTO、构建关系审阅队列、计算话题图布局坐标，并派生本地化枚举文本与状态色调。 |
| [WorkflowOptionsRegion.tsx](../dashboard/components/WorkflowOptionsRegion.tsx.md) | src/dashboard/components/WorkflowOptionsRegion.tsx | Dashboard 的工作流选项面板：内联工作流设置表单引擎，按 schema 渲染分区与字段，支持自定义 select、布尔开关、数值校验与 provider 条件字段的可见性判定。 |
| [WorkflowSettingsDialogRegion.tsx](../dashboard/components/WorkflowSettingsDialogRegion.tsx.md) | src/dashboard/components/WorkflowSettingsDialogRegion.tsx | 独立的工作流设置对话框区域：复用 WorkflowOptionsRegion 的共享表单引擎渲染 schema 字段，并额外提供执行单元预览与宿主队列选项两张卡片。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [equalBySignature](../../../symbols/src/shared/regionEquality.ts/equalBySignature.md) | 函数 | 24–42 | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |
| safeText | 函数 | 12–14 | 把任意值规范化为去除首尾空白的字符串，供签名比较安全使用。 |
| [stableRegionSignature](../../../symbols/src/shared/regionEquality.ts/stableRegionSignature.md) | 函数 | 16–22 | 为区域 selection 生成稳定字符串签名，序列化失败时降级为安全文本。 |
