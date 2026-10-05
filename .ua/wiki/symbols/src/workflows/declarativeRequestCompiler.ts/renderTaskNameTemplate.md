
# renderTaskNameTemplate
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:renderTaskNameTemplate -->

渲染任务名模板：替换 ${key} 占位符、裁剪冗余空白并保证结果非空。
类型：函数  
复杂度：复杂  
入边数：1  
标签：template-engine、workflow、formatting  
所属文件：[src/workflows/declarativeRequestCompiler.ts](../../../../files/src/workflows/declarativeRequestCompiler.ts.md)
源码：[src/workflows/declarativeRequestCompiler.ts:167](../../../../../../src/workflows/declarativeRequestCompiler.ts#L167)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveTaskName](../../../../files/src/workflows/declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts:222–246 | 解析最终任务名：优先使用模板渲染结果，否则回退到工作流标签或附件文件名。 |

## 调用

该符号没有记录对外调用。
