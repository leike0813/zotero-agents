
# src/modules/workflow/ui/workflowEditorHost.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/ui](../../../../../modules/src/modules/workflow/ui.md)
<!-- node: file:src/modules/workflow/ui/workflowEditorHost.ts -->

工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。

规模：840 行
源码：[src/modules/workflow/ui/workflowEditorHost.ts](../../../../../../../src/modules/workflow/ui/workflowEditorHost.ts)

## 符号（21）
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:applyFooterVisibility -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:applyWindowSizing -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:assertBoundedEditorValue -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:clearWorkflowEditorRendererRegistry -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:createHtmlElement -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:createWorkflowEditorOwner -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:createWorkflowEditorPanelContainer -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:enqueueCallerSession -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:hasUnsavedChanges -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:installWorkflowEditorHostBridge -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:installWorkflowEditorSessionOverrideForTests -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:normalizeLayout -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:openBoundedWorkflowEditorSession -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:openDialogSession -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:openWorkflowEditorSession -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:registerWorkflowEditorRenderer -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:resolveDirtyCloseDecision -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:resolveRenderer -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:serializeEditorResult -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:toComparableSnapshot -->
<!-- node: function:src/modules/workflow/ui/workflowEditorHost.ts:unregisterWorkflowEditorRenderer -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyFooterVisibility | 函数 | 310–379 | 中等 | ui、layout、visibility | 0 | 按是否有内容切换编辑器页脚区域的可见性。 |
| applyWindowSizing | 函数 | 296–308 | 简单 | ui、window、layout | 0 | 把布局参数应用到宿主窗口上，必要时设置最小/最大尺寸。 |
| assertBoundedEditorValue | 函数 | 697–711 | 简单 | ui、validation、bounds | 0 | 校验编辑器返回值的大小与 JSON 形状上限。 |
| clearWorkflowEditorRendererRegistry | 函数 | 816–818 | 简单 | editor-host、registry、test | 0 | 清空渲染器注册表，供测试隔离使用。 |
| createHtmlElement | 函数 | 123–134 | 简单 | ui、dom、xhtml | 0 | 在工作流编辑器命名空间下创建 XHTML 元素并设置类名与属性。 |
| createWorkflowEditorOwner | 函数 | 735–754 | 简单 | factory、owner、editor-host、exported | 1 | 创建编辑器 owner，投影打开会话与渲染器注册能力。 |
| createWorkflowEditorPanelContainer | 函数 | 831–840 | 简单 | ui、dom、container | 0 | 在宿主窗口中创建编辑器面板容器并挂载受管子树。 |
| enqueueCallerSession | 函数 | 684–695 | 简单 | ui、queue、session | 0 | 把调用方会话排入串行队列，避免并发打开多个编辑器。 |
| hasUnsavedChanges | 函数 | 178–202 | 简单 | ui、dirty-check、state | 0 | 比较初始与当前快照，判断会话是否存在未保存修改。 |
| installWorkflowEditorHostBridge | 函数 | 785–814 | 简单 | editor-host、bridge、runtime | 0 | 把编辑器宿主桥接到 Zotero 窗口与测试宿主。 |
| installWorkflowEditorSessionOverrideForTests | 函数 | 820–829 | 简单 | editor-host、test、seam | 0 | 用桩实现替换编辑器会话实现，供测试断言调用路径。 |
| normalizeLayout | 函数 | 277–294 | 简单 | ui、layout、normalization | 0 | 规范化编辑器面板的尺寸与内边距布局参数。 |
| openBoundedWorkflowEditorSession | 函数 | 713–733 | 简单 | ui、session、validation、bounds | 0 | 打开带限额与脏状态策略的编辑器会话，值超限时直接失败。 |
| openDialogSession | 函数 | 396–673 | 复杂 | ui、session、dialog | 0 | 打开一个编辑器对话框会话并返回其句柄。 |
| openWorkflowEditorSession | 函数 | 756–764 | 简单 | editor-host、session、exported | 0 | 打开工作流编辑器会话，入口契约。 |
| registerWorkflowEditorRenderer | 函数 | 766–775 | 简单 | editor-host、registry、exported | 0 | 注册某编辑器类型的渲染器实现。 |
| resolveDirtyCloseDecision | 函数 | 204–267 | 中等 | ui、lifecycle、policy | 0 | 在会话关闭时按脏状态决定直接关闭、请求确认或阻止关闭。 |
| resolveRenderer | 函数 | 381–394 | 简单 | ui、registry、resolution | 0 | 从渲染器注册表解析出目标编辑器类型的渲染实现。 |
| serializeEditorResult | 函数 | 153–164 | 简单 | ui、serialization、json | 0 | 把编辑器内 DOM 状态序列化为严格 JSON 值，剔除函数与循环引用。 |
| toComparableSnapshot | 函数 | 166–176 | 简单 | ui、snapshot、comparison | 0 | 把会话结果规整为可比较的快照，用于判定脏状态与重放。 |
| unregisterWorkflowEditorRenderer | 函数 | 777–783 | 简单 | editor-host、registry、exported | 0 | 注销编辑器渲染器实现。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [converter.ts](../../literatureArtifactMigration/converter.ts.md) | src/modules/literatureArtifactMigration/converter.ts | legacy 文献产物到 canonical 产物的纯转换器：解析旧 payload 标签、匹配 source reference、归一 citation 结构并输出转换分类与诊断。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](../../../workflows/workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [addon.ts](../../../addon.ts.md) | src/addon.ts | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostApi.ts](../../../workflows/hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [workflowDebugProbe.ts](workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowHostOwners.ts](../../../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| clearWorkflowEditorRendererRegistry | 函数 | 816–818 | 清空渲染器注册表，供测试隔离使用。 |
| createWorkflowEditorOwner | 函数 | 735–754 | 创建编辑器 owner，投影打开会话与渲染器注册能力。 |
| createWorkflowEditorPanelContainer | 函数 | 831–840 | 在宿主窗口中创建编辑器面板容器并挂载受管子树。 |
| installWorkflowEditorHostBridge | 函数 | 785–814 | 把编辑器宿主桥接到 Zotero 窗口与测试宿主。 |
| installWorkflowEditorSessionOverrideForTests | 函数 | 820–829 | 用桩实现替换编辑器会话实现，供测试断言调用路径。 |
| openWorkflowEditorSession | 函数 | 756–764 | 打开工作流编辑器会话，入口契约。 |
| registerWorkflowEditorRenderer | 函数 | 766–775 | 注册某编辑器类型的渲染器实现。 |
| unregisterWorkflowEditorRenderer | 函数 | 777–783 | 注销编辑器渲染器实现。 |
