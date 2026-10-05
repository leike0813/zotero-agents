
# loadWorkflowManifests
<!-- node: function:src/workflows/loader.ts:loadWorkflowManifests -->

加载入口：扫描工作流与工作流包来源，加载 hook 与本地化资源，返回已加载工作流集合与全部诊断。
类型：函数  
复杂度：复杂  
入边数：2  
标签：loader、entry-point、workflow、diagnostics  
所属文件：[src/workflows/loader.ts](../../../../files/src/workflows/loader.ts.md)
源码：[src/workflows/loader.ts:973](../../../../../../src/workflows/loader.ts#L973)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [main](../../../../files/scripts/inspect-literature-analysis.ts.md) | scripts/inspect-literature-analysis.ts:225–282 | 脚本主流程：加载工作流与 Host API，跑一遍输入过滤后打印候选与产物摘要。 |
| [loadHarnessWorkflows](../../../../files/src/modules/harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts:145–171 | 按传入目录加载工作流 manifest，供 Harness 页面复刻工作流选择项。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [collectPackageWorkflowCandidates](collectPackageWorkflowCandidates.md) | src/workflows/loader.ts:575–628 | 扫描工作流包内的单个工作流目录，产出候选工作流及其诊断。 |
| [filterDirectoryEntriesByOfficialManifest](filterDirectoryEntriesByOfficialManifest.md) | src/workflows/loader.ts:692–736 | 按官方工作流包 manifest 过滤目录项，避免加载非声明内容。 |
| [loadHooks](loadHooks.md) | src/workflows/loader.ts:738–971 | 加载单个工作流的 hook 集合：定位 hook 模块、校验各 hook 导出是否存在，并汇总 warning 与 error 级诊断。 |
| [loadPackageLocalizationResources](loadPackageLocalizationResources.md) | src/workflows/loader.ts:518–573 | 加载工作流包的多语言资源，按 locale 归一消息表并对缺失语言给出诊断。 |
