
# src/modules/workflowExecution/artifactManifest.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/artifactManifest.ts -->

工作流执行产物清单：归一化执行产生的文件/笔记产物条目，形成可校验的 artifact manifest，供结果上下文与 Attachment 导入消费。
源码：[src/modules/workflowExecution/artifactManifest.ts](../../../../../../src/modules/workflowExecution/artifactManifest.ts)

## 符号（3）
<!-- node: function:src/modules/workflowExecution/artifactManifest.ts:collectOutputBundleArtifactPaths -->
<!-- node: function:src/modules/workflowExecution/artifactManifest.ts:isAllowedArtifactPath -->
<!-- node: function:src/modules/workflowExecution/artifactManifest.ts:validateFlatArtifactManifest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectOutputBundleArtifactPaths | 函数 | 127–200 | 复杂 | 产物收集、递归、执行产物 | 0 | 从工作流输出定义中递归收集 bundle 内全部产物路径，形成最终 manifest。 |
| isAllowedArtifactPath | 函数 | 26–45 | 简单 | 路径安全、校验、执行产物 | 0 | 判定产物路径是否落在允许的受管根内，拒绝越界与绝对路径。 |
| validateFlatArtifactManifest | 函数 | 89–125 | 中等 | 校验、清单、执行产物 | 0 | 校验扁平产物清单：路径合法、条目唯一且必填字段齐备，返回规范化结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillOutputValidator.ts](../acp/skillRun/acpSkillOutputValidator.ts.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts | Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectOutputBundleArtifactPaths | 函数 | 127–200 | 从工作流输出定义中递归收集 bundle 内全部产物路径，形成最终 manifest。 |
| validateFlatArtifactManifest | 函数 | 89–125 | 校验扁平产物清单：路径合法、条目唯一且必填字段齐备，返回规范化结果。 |
