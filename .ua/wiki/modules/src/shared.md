
# src/shared
> 目录聚合页：21 个文件、62 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/shared/acpToolCallDisplay.ts](../../files/src/shared/acpToolCallDisplay.ts.md) | 文件 | 8 | ACP 工具调用的展示投影：把各后端异构的 tool call 载荷规整为统一的标题、状态、摘要与兼容性展示信息。 |
| [src/shared/assistantActionContract.ts](../../files/src/shared/assistantActionContract.ts.md) | 文件 | 0 | Assistant Workspace 动作负载的编译期类型镜像：描述 shell/子页面与宿主之间每个 action 各自携带的 payload 字段，由 publication 侧的 drift guard 保证与运行时注册表同步。 |
| [src/shared/assistantInteractionContract.ts](../../files/src/shared/assistantInteractionContract.ts.md) | 文件 | 11 | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [src/shared/assistantWireContract.ts](../../files/src/shared/assistantWireContract.ts.md) | 文件 | 0 | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |
| [src/shared/citationGraphStandalone.css](../../files/src/shared/citationGraphStandalone.css.md) | 文件 | 0 | 独立 Citation Graph 入口页的样式表，定义图谱容器、工具栏、图例与响应式布局。 |
| [src/shared/citationGraphStandalone.ts](../../files/src/shared/citationGraphStandalone.ts.md) | 文件 | 5 | 独立 Citation Graph 视图：不依赖 Sigma，直接用 SVG 渲染引用图谱，含外壳、空态、分位式布局投影、节点/边配色与重要性光晕，并提供悬停高亮与缩放。 |
| [src/shared/citationGraphVisualRules.ts](../../files/src/shared/citationGraphVisualRules.ts.md) | 文件 | 7 | Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。 |
| [src/shared/customSelect.tsx](../../files/src/shared/customSelect.tsx.md) | 文件 | 4 | 插件各 HTML 页面共用的纯 DOM 下拉控件：Zotero 对话框窗口无法弹出原生 select 弹层，因此提供完全受控的单选与多选实现，保留被淘汰 vendor 组件的 .custom-select* class 契约。 |
| [src/shared/dashboardWireContract.ts](../../files/src/shared/dashboardWireContract.ts.md) | 文件 | 0 | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [src/shared/hostBridgeAgentContract.ts](../../files/src/shared/hostBridgeAgentContract.ts.md) | 文件 | 0 | 跨边界共享的 Host Bridge agent 契约常量：agent surface 版本与宿主协议标识的最小投影，插件运行时与发布脚本共用。 |
| [src/shared/hostBridgePluginSkillBundleContract.ts](../../files/src/shared/hostBridgePluginSkillBundleContract.ts.md) | 文件 | 2 | Host Bridge 与插件之间 Skill bundle 的共享契约类型定义，约束 bundle 条目结构与校验函数在两侧保持一致。 |
| [src/shared/literatureScore.ts](../../files/src/shared/literatureScore.ts.md) | 文件 | 5 | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [src/shared/preactRegionMount.ts](../../files/src/shared/preactRegionMount.ts.md) | 文件 | 3 | 与页面无关的 managed-region 挂载辅助：为按区域独立渲染的 Preact 页面创建并定位 managed mount 子节点，并给区域容器打上通用 data 属性。 |
| [src/shared/regionEquality.ts](../../files/src/shared/regionEquality.ts.md) | 文件 | 3 | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [src/shared/synthesisCitationGraphWindow.ts](../../files/src/shared/synthesisCitationGraphWindow.ts.md) | 文件 | 0 | Citation Graph 窗口模型：定义有界窗口状态（generation、cursor、hover-only 集合与总量计数）与严格的 patch 合并规则，是宿主与页面共享的图谱分页数据契约。 |
| [src/shared/synthesisGraphVendors.ts](../../files/src/shared/synthesisGraphVendors.ts.md) | 文件 | 0 | 在页面入口处一次性组装 citation graph 所需的 graphology / Sigma 浏览器 vendor。 |
| [src/shared/synthesisWorkbenchI18nContract.ts](../../files/src/shared/synthesisWorkbenchI18nContract.ts.md) | 文件 | 0 | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [src/shared/synthesisWorkbenchWireContract.ts](../../files/src/shared/synthesisWorkbenchWireContract.ts.md) | 文件 | 0 | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [src/shared/topicTimelineRenderer.ts](../../files/src/shared/topicTimelineRenderer.ts.md) | 文件 | 14 | 命令式的主题时间线渲染器：把论文与里程碑事件排布到年份轴上并产出可直接挂载的 DOM。 |
| [src/shared/topicTimelineStandalone.ts](../../files/src/shared/topicTimelineStandalone.ts.md) | 文件 | 0 | 把主题时间线渲染器挂到 window 全局，供独立导出页在无宿主桥的情况下直接调用。 |
| [src/shared/zoteroRuntimeVersion.ts](../../files/src/shared/zoteroRuntimeVersion.ts.md) | 文件 | 0 | 把 Zotero 版本号解析为受支持的主版本（7 / 9 / 10），用于兼容性分支与诊断输出。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../packages/synthesis-contracts/src.md) | 3 |
| [src/sidebar](sidebar.md) | 2 |
| [src](../src.md) | 1 |
