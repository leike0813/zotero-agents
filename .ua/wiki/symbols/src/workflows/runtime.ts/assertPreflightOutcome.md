
# assertPreflightOutcome
<!-- node: function:src/workflows/runtime.ts:assertPreflightOutcome -->

校验 preflight hook 结论的合法性：状态取值、阻断原因与请求元信息必须自洽。
类型：函数  
复杂度：复杂  
入边数：1  
标签：validation、preflight、workflow  
所属文件：[src/workflows/runtime.ts](../../../../files/src/workflows/runtime.ts.md)
源码：[src/workflows/runtime.ts:330](../../../../../../src/workflows/runtime.ts#L330)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [enrichRequestWithSelectionMeta](../../../../files/src/workflows/runtime.ts.md) | src/workflows/runtime.ts:280–310 | 把选择集元信息（条目类型分布、计数、来源）附加到请求上，供后端与诊断使用。 |

## 调用

该符号没有记录对外调用。
