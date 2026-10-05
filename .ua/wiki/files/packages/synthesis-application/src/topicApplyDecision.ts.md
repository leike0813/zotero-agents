
# packages/synthesis-application/src/topicApplyDecision.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/topicApplyDecision.ts -->

主题结果包 apply 决策：校验 synthesis 结果 bundle 的结构、基线哈希与直接写键白名单，据此判定 create、update_full、update_patch 或拒绝应用。
源码：[packages/synthesis-application/src/topicApplyDecision.ts](../../../../../../packages/synthesis-application/src/topicApplyDecision.ts)

## 符号（2）
<!-- node: function:packages/synthesis-application/src/topicApplyDecision.ts:decideSynthesisApply -->
<!-- node: function:packages/synthesis-application/src/topicApplyDecision.ts:validateSynthesisResultBundle -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| decideSynthesisApply | 函数 | 248–271 | 中等 | apply-决策、主题、纯函数 | 0 | 在结果包校验通过后判定 apply 动作：依据 operation 与 base_hashes 完整性选择 create、update_full、update_patch 或拒绝。 |
| [validateSynthesisResultBundle](../../../../symbols/packages/synthesis-application/src/topicApplyDecision.ts/validateSynthesisResultBundle.md) | 函数 | 89–246 | 复杂 | 校验、结果包、白名单、核心、安全 | 1 | 逐字段校验 synthesis 结果 bundle：检查 kind/operation 组合、必需路径、基线哈希形状，并拒绝不在白名单内的直接写指令。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [topicApplication.ts](topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts | 主题（topic）应用层：读取主题状态与 bundle 依赖快照，校验候选 bundle 资产完整性，产出主题列表/详情的就绪度与投影视图。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| decideSynthesisApply | 函数 | 248–271 | 在结果包校验通过后判定 apply 动作：依据 operation 与 base_hashes 完整性选择 create、update_full、update_patch 或拒绝。 |
| [validateSynthesisResultBundle](../../../../symbols/packages/synthesis-application/src/topicApplyDecision.ts/validateSynthesisResultBundle.md) | 函数 | 89–246 | 逐字段校验 synthesis 结果 bundle：检查 kind/operation 组合、必需路径、基线哈希形状，并拒绝不在白名单内的直接写指令。 |
