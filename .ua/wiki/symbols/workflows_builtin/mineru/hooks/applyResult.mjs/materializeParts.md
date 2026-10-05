
# materializeParts
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:materializeParts -->

物化核心：先把各分片 Markdown 合并、图片重写到暂存目录，再原子替换目标图片目录并写盘 Markdown，最后以 stored_file 方式创建或替换父条目下的附件，清理发生在 finally 中。
类型：函数  
复杂度：复杂  
入边数：1  
标签：materialization、attachment、core-logic、file-system、idempotency  
所属文件：[workflows_builtin/mineru/hooks/applyResult.mjs](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md)
源码：[workflows_builtin/mineru/hooks/applyResult.mjs:388](../../../../../../../workflows_builtin/mineru/hooks/applyResult.mjs#L388)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyResult](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md) | workflows_builtin/mineru/hooks/applyResult.mjs:520–601 | execute hook 入口：按 stage 推进地解析源附件、收集各分片 bundle、物化合并产物，并尝试清除父条目的 need-fulltext/need-markdown 状态标签；状态切换失败降级为 partial 警告而非中断。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [copyImagesIntoStage](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md) | workflows_builtin/mineru/hooks/applyResult.mjs:363–386 | 把分片图片目录合并进暂存目录，检测到同名文件冲突即报错，避免多分片图片互相覆盖。 |
| [copyPath](copyPath.md) | workflows_builtin/mineru/hooks/applyResult.mjs:193–221 | 基于宿主 file API 的递归复制实现，先确保父目录存在再逐项复制，支持目录与文件两种源。 |
| [findOutputAttachmentForPath](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md) | workflows_builtin/mineru/hooks/applyResult.mjs:89–112 | 在父条目下按归一化路径查找已有的 Markdown 输出附件，用于判定应替换文件还是新建附件。 |
| [joinPath](joinPath.md) | workflows_builtin/mineru/hooks/applyResult.mjs:48–72 | 跨平台路径拼接，按宿主分隔符规则归一化并处理绝对路径、盘符与尾部分隔符，替代 Node 的 path 模块。 |
| [rewriteMarkdownImagePaths](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md) | workflows_builtin/mineru/hooks/applyResult.mjs:257–275 | 重写 Markdown 与内联 HTML 中的 images/ 图片引用前缀，指向合并后的 Images_<key> 目录。 |
