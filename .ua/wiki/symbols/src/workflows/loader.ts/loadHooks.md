
# loadHooks
<!-- node: function:src/workflows/loader.ts:loadHooks -->

加载单个工作流的 hook 集合：定位 hook 模块、校验各 hook 导出是否存在，并汇总 warning 与 error 级诊断。
类型：函数  
复杂度：复杂  
入边数：1  
标签：loader、hook、validation、entry-point  
所属文件：[src/workflows/loader.ts](../../../../files/src/workflows/loader.ts.md)
源码：[src/workflows/loader.ts:738](../../../../../../src/workflows/loader.ts#L738)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [loadWorkflowManifests](loadWorkflowManifests.md) | src/workflows/loader.ts:973–1149 | 加载入口：扫描工作流与工作流包来源，加载 hook 与本地化资源，返回已加载工作流集合与全部诊断。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [loadHooksModule](loadHooksModule.md) | src/workflows/loader.ts:350–407 | hook 模块加载总入口，按运行环境与来源选择合适的导入路径并归一诊断。 |
