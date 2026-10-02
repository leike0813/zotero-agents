
# joinPath
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:joinPath -->

跨平台路径拼接，按宿主分隔符规则归一化并处理绝对路径、盘符与尾部分隔符，替代 Node 的 path 模块。
类型：函数  
复杂度：中等  
入边数：2  
标签：path-utils、cross-platform、utility  
所属文件：[workflows_builtin/mineru/hooks/applyResult.mjs](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md)
源码：[workflows_builtin/mineru/hooks/applyResult.mjs:48](../../../../../../../workflows_builtin/mineru/hooks/applyResult.mjs#L48)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [copyImagesIntoStage](../../../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md) | workflows_builtin/mineru/hooks/applyResult.mjs:363–386 | 把分片图片目录合并进暂存目录，检测到同名文件冲突即报错，避免多分片图片互相覆盖。 |
| [materializeParts](materializeParts.md) | workflows_builtin/mineru/hooks/applyResult.mjs:388–471 | 物化核心：先把各分片 Markdown 合并、图片重写到暂存目录，再原子替换目标图片目录并写盘 Markdown，最后以 stored_file 方式创建或替换父条目下的附件，清理发生在 finally 中。 |

## 调用

该符号没有记录对外调用。
