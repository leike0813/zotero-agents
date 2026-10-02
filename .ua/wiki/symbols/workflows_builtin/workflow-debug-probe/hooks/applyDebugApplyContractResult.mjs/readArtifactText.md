
# readArtifactText
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:readArtifactText -->

读取产物文本，优先走宿主注入的 resultContext.readArtifactText，否则回退到 bundleReader.readText。
类型：函数  
复杂度：中等  
入边数：2  
标签：产物读取、适配器、回退策略  
所属文件：[workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs.md)
源码：[workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:118](../../../../../../../workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs#L118)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [readArtifactManifest](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:135–159 | 读取并严格校验 artifact manifest：必须是扁平 JSON 对象且每个值都是非空路径字符串，否则抛出明确错误。 |
| [readBundleArtifact](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:93–116 | 解析 bundle 产物来源：没有直接 artifact_path 时经 manifest 解析出产物路径，并提供默认回退路径。 |

## 调用

该符号没有记录对外调用。
