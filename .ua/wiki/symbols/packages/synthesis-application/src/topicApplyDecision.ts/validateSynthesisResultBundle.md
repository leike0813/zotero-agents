
# validateSynthesisResultBundle
<!-- node: function:packages/synthesis-application/src/topicApplyDecision.ts:validateSynthesisResultBundle -->

逐字段校验 synthesis 结果 bundle：检查 kind/operation 组合、必需路径、基线哈希形状，并拒绝不在白名单内的直接写指令。
类型：函数  
复杂度：复杂  
入边数：1  
标签：校验、结果包、白名单、核心、安全  
所属文件：[packages/synthesis-application/src/topicApplyDecision.ts](../../../../../files/packages/synthesis-application/src/topicApplyDecision.ts.md)
源码：[packages/synthesis-application/src/topicApplyDecision.ts:89](../../../../../../../packages/synthesis-application/src/topicApplyDecision.ts#L89)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [decideSynthesisApply](../../../../../files/packages/synthesis-application/src/topicApplyDecision.ts.md) | packages/synthesis-application/src/topicApplyDecision.ts:248–271 | 在结果包校验通过后判定 apply 动作：依据 operation 与 base_hashes 完整性选择 create、update_full、update_patch 或拒绝。 |

## 调用

该符号没有记录对外调用。
