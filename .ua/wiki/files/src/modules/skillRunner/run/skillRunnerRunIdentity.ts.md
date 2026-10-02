
# src/modules/skillRunner/run/skillRunnerRunIdentity.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerRunIdentity.ts -->

按 workflowRunId:sequenceJobId:stepId 三段拼接生成 SkillRunner 序列步骤的本地 runId，任一环节缺失时返回空串。
源码：[src/modules/skillRunner/run/skillRunnerRunIdentity.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerRunIdentity.ts)

## 符号（2）
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunIdentity.ts:buildSkillRunnerSequenceStepLocalRunId -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunIdentity.ts:normalizeIdentityPart -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSkillRunnerSequenceStepLocalRunId | 函数 | 5–17 | 简单 | utility、skillrunner、identity、run-management | 0 | 由 workflowRunId、sequenceJobId 与 stepId 三段规范化后拼接为本地 runId，任一段缺失即返回空串，避免产生不可用的运行标识。 |
| normalizeIdentityPart | 函数 | 1–3 | 简单 | utility、normalization、identity | 1 | 把任意输入转为去除首尾空白的字符串，是 runId 拼接前的标识规范化步骤。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSkillRunnerSequenceStepLocalRunId | 函数 | 5–17 | 由 workflowRunId、sequenceJobId 与 stepId 三段规范化后拼接为本地 runId，任一段缺失即返回空串，避免产生不可用的运行标识。 |
