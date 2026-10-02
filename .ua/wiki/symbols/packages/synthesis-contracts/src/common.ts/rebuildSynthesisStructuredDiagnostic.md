
# rebuildSynthesisStructuredDiagnostic
<!-- node: function:packages/synthesis-contracts/src/common.ts:rebuildSynthesisStructuredDiagnostic -->

重建结构化诊断条目：规范化 code、message、location 与 details，保证诊断输出可比较且有界。
类型：函数  
复杂度：中等  
入边数：2  
标签：诊断、合约、结构化、公共基础  
所属文件：[packages/synthesis-contracts/src/common.ts](../../../../../files/packages/synthesis-contracts/src/common.ts.md)
源码：[packages/synthesis-contracts/src/common.ts:183](../../../../../../../packages/synthesis-contracts/src/common.ts#L183)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildReceipt](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:187–229 | 重建 effect 执行 receipt，记录成功、跳过与失败原因。 |
| [diagnostics](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:94–104 | 重建有界诊断列表，逐条校验 code/message 并截断到上限。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [toSynthesisJsonValue](toSynthesisJsonValue.md) | packages/synthesis-contracts/src/common.ts:77–142 | 把任意运行时值收敛为合法 JSON 值：拒绝 undefined、函数、非有限数字与循环引用，并保留数组空位语义。 |
