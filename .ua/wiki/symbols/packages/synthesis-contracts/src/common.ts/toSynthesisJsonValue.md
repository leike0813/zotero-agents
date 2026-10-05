
# toSynthesisJsonValue
<!-- node: function:packages/synthesis-contracts/src/common.ts:toSynthesisJsonValue -->

把任意运行时值收敛为合法 JSON 值：拒绝 undefined、函数、非有限数字与循环引用，并保留数组空位语义。
类型：函数  
复杂度：复杂  
入边数：5  
标签：JSON-校验、公共基础、守卫、核心  
所属文件：[packages/synthesis-contracts/src/common.ts](../../../../../files/packages/synthesis-contracts/src/common.ts.md)
源码：[packages/synthesis-contracts/src/common.ts:77](../../../../../../../packages/synthesis-contracts/src/common.ts#L77)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildSynthesisStructuredDiagnostic](rebuildSynthesisStructuredDiagnostic.md) | packages/synthesis-contracts/src/common.ts:183–232 | 重建结构化诊断条目：规范化 code、message、location 与 details，保证诊断输出可比较且有界。 |
| [toSynthesisJsonObject](toSynthesisJsonObject.md) | packages/synthesis-contracts/src/common.ts:144–161 | 在 toSynthesisJsonValue 之上要求结果必须是普通对象，否则以字段定位路径报错。 |
| [rebuildProtocolJsonValue](../../../../../files/packages/synthesis-contracts/src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts:94–115 | 把 schema 校验通过的值收敛为协议 JSON 值类型。 |
| [rebuildSynthesisProtocolWorkerDto](../../../../../files/packages/synthesis-contracts/src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts:235–292 | 重建 worker 描述 DTO，校验 worker 种类与并发参数。 |
| [boundedJson](../../../../../files/packages/synthesis-contracts/src/webDavSync.ts.md) | packages/synthesis-contracts/src/webDavSync.ts:320–333 | 收敛有体积上限的 JSON 值，限制节点数与编码字节数。 |

## 调用

该符号没有记录对外调用。
