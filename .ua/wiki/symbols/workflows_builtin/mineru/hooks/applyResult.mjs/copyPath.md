
# copyPath
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:copyPath -->

基于宿主 file API 的递归复制实现，先确保父目录存在再逐项复制，支持目录与文件两种源。
类型：函数  
复杂度：中等  
入边数：2  
标签：file-system、copy、cross-runtime  
所属文件：[workflows_builtin/mineru/hooks/applyResult.mjs](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md)
源码：[workflows_builtin/mineru/hooks/applyResult.mjs:193](../../../../../../../workflows_builtin/mineru/hooks/applyResult.mjs#L193)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [copyImagesIntoStage](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md) | workflows_builtin/mineru/hooks/applyResult.mjs:363–386 | 把分片图片目录合并进暂存目录，检测到同名文件冲突即报错，避免多分片图片互相覆盖。 |
| [materializeParts](materializeParts.md) | workflows_builtin/mineru/hooks/applyResult.mjs:388–471 | 物化核心：先把各分片 Markdown 合并、图片重写到暂存目录，再原子替换目标图片目录并写盘 Markdown，最后以 stored_file 方式创建或替换父条目下的附件，清理发生在 finally 中。 |

## 调用

该符号没有记录对外调用。
