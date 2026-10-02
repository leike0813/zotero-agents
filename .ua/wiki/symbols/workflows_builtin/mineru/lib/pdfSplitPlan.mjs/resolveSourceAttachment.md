
# resolveSourceAttachment
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:resolveSourceAttachment -->

从 selectionContext 中筛出首个 attachment 条目，归一为 {ref, parentRef, fileName} 的源附件描述；没有可用附件时返回 null。
类型：函数  
复杂度：简单  
入边数：2  
标签：selection、attachment、normalization  
所属文件：[workflows_builtin/mineru/lib/pdfSplitPlan.mjs](../../../../../files/workflows_builtin/mineru/lib/pdfSplitPlan.mjs.md)
源码：[workflows_builtin/mineru/lib/pdfSplitPlan.mjs:63](../../../../../../../workflows_builtin/mineru/lib/pdfSplitPlan.mjs#L63)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildRequest](../../../../../files/workflows_builtin/mineru/hooks/buildRequest.mjs.md) | workflows_builtin/mineru/hooks/buildRequest.mjs:73–117 | request hook 入口：解析源附件路径与文件名，剔除 preflight 遗留的内部上下文字段，组装 generic-http.steps.v1 请求、context 与轮询参数。 |
| [preflight](../../../../../files/workflows_builtin/mineru/hooks/preflight.mjs.md) | workflows_builtin/mineru/hooks/preflight.mjs:9–102 | preflight hook 入口：读取 PDF 元数据，未超页数上限时继续单请求执行，超限时返回 replace-units 把工作流展开为多个页码分片并配置聚合策略。 |

## 调用

该符号没有记录对外调用。
