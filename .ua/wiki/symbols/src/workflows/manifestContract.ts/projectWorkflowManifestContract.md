
# projectWorkflowManifestContract
<!-- node: function:src/workflows/manifestContract.ts:projectWorkflowManifestContract -->

把 manifest 投影为 WorkflowManifestContract：执行模式、资源要求、provider 需求、必需选项、结果证据与选择规则。
类型：函数  
复杂度：复杂  
入边数：1  
标签：contract、projection、workflow  
所属文件：[src/workflows/manifestContract.ts](../../../../files/src/workflows/manifestContract.ts.md)
源码：[src/workflows/manifestContract.ts:61](../../../../../../src/workflows/manifestContract.ts#L61)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [loadBuiltinWorkflowCatalog](../../../../files/scripts/host-bridge/host-bridge-workflow-catalog.ts.md) | scripts/host-bridge/host-bridge-workflow-catalog.ts:32–80 | 加载全部内置工作流 manifest，并投影出工作流 id、输入输出槽位与后端兼容类型。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [compatibleBackendTypesForManifest](../../../../files/src/workflows/manifestContract.ts.md) | src/workflows/manifestContract.ts:36–59 | 按 manifest 声明的 provider 与 request kind 推导出兼容的后端类型集合。 |
