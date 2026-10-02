
# rescanWorkflowRegistry
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:rescanWorkflowRegistry -->

重扫工作流目录并刷新注册表状态，把注册结果与错误摘要持久化供 UI 展示。
类型：函数  
复杂度：中等  
入边数：3  
标签：workflow、catalog、registry、core  
所属文件：[src/modules/workflow/catalog/workflowRuntime.ts](../../../../../../files/src/modules/workflow/catalog/workflowRuntime.ts.md)
源码：[src/modules/workflow/catalog/workflowRuntime.ts:551](../../../../../../../../src/modules/workflow/catalog/workflowRuntime.ts#L551)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ensureWorkflowRegistryAndMenu](../../../../../../files/src/hooks.ts.md) | src/hooks.ts:780–812 | 确保工作流注册表已加载，并向 Zotero 菜单注入工作流入口菜单项。 |
| [installOfficialWorkflowPackageWithProgress](../../../../../../files/src/hooks.ts.md) | src/hooks.ts:437–465 | 在进度 toast 反馈下安装官方内置工作流包，失败时保留错误码与阶段信息。 |
| [onPrefsEvent](../../../../../../files/src/hooks.ts.md) | src/hooks.ts:1335–1942 | 首选项变更总入口：按 pref key 分发到样式、通知、jobQueue、工作流、backend 等子系统的热更新处理。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [filterLoadedWorkflowsBySkillDependencies](../../../../../../files/src/modules/workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts:502–549 | 按已注册的 Skill 依赖过滤工作流，剔除依赖缺失而无法运行的工作流。 |
| [loadMergedWorkflowManifests](loadMergedWorkflowManifests.md) | src/modules/workflow/catalog/workflowRuntime.ts:341–435 | 加载并合并多个来源的工作流 manifest，处理同名覆盖、来源标记与失败隔离。 |
| [summarizeLoadedWorkflows](../../../../../../files/src/modules/workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts:295–306 | 汇总已加载工作流数量、来源分布与错误项，作为注册表状态的摘要内容。 |
