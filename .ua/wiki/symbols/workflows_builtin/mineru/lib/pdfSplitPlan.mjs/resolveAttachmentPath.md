
# resolveAttachmentPath
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:resolveAttachmentPath -->

通过 Workflow Host 的 library.getItemDetail 解析附件 ref 为本地文件路径，附件缺失或文件不可用时抛出可读错误。
类型：函数  
复杂度：简单  
入边数：3  
标签：attachment、host-api、path-resolution  
所属文件：[workflows_builtin/mineru/lib/pdfSplitPlan.mjs](../../../../../files/workflows_builtin/mineru/lib/pdfSplitPlan.mjs.md)
源码：[workflows_builtin/mineru/lib/pdfSplitPlan.mjs:24](../../../../../../../workflows_builtin/mineru/lib/pdfSplitPlan.mjs#L24)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveSourceAttachmentMetadata](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md) | workflows_builtin/mineru/hooks/applyResult.mjs:277–300 | 从请求上下文解析源附件 ref，取得其父条目 ref 与本地路径，缺少附件或父条目时直接失败。 |
| [buildRequest](../../../../../files/workflows_builtin/mineru/hooks/buildRequest.mjs.md) | workflows_builtin/mineru/hooks/buildRequest.mjs:73–117 | request hook 入口：解析源附件路径与文件名，剔除 preflight 遗留的内部上下文字段，组装 generic-http.steps.v1 请求、context 与轮询参数。 |
| [preflight](../../../../../files/workflows_builtin/mineru/hooks/preflight.mjs.md) | workflows_builtin/mineru/hooks/preflight.mjs:9–102 | preflight hook 入口：读取 PDF 元数据，未超页数上限时继续单请求执行，超限时返回 replace-units 把工作流展开为多个页码分片并配置聚合策略。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [portableItemRef](../../../../../files/workflows_builtin/mineru/lib/pdfSplitPlan.mjs.md) | workflows_builtin/mineru/lib/pdfSplitPlan.mjs:7–22 | 校验并归一化 Zotero item ref，只接受恰好含 libraryId 与 key 的 portable 引用，多余字段或非法 libraryId 直接抛错。 |
