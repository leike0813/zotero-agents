
# src/workflows/manifestContract.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/manifestContract.ts -->

工作流 manifest 契约投影：把 manifest 中的执行模式、资源要求、provider 需求、结果证据与选择规则投影为可对外发布的稳定契约。

规模：114 行
源码：[src/workflows/manifestContract.ts](../../../../../src/workflows/manifestContract.ts)

## 符号（2）
<!-- node: function:src/workflows/manifestContract.ts:compatibleBackendTypesForManifest -->
<!-- node: function:src/workflows/manifestContract.ts:projectWorkflowManifestContract -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compatibleBackendTypesForManifest | 函数 | 36–59 | 中等 | contract、resolution、compatibility | 1 | 按 manifest 声明的 provider 与 request kind 推导出兼容的后端类型集合。 |
| [projectWorkflowManifestContract](../../../symbols/src/workflows/manifestContract.ts/projectWorkflowManifestContract.md) | 函数 | 61–114 | 复杂 | contract、projection、workflow | 1 | 把 manifest 投影为 WorkflowManifestContract：执行模式、资源要求、provider 需求、必需选项、结果证据与选择规则。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-workflow-catalog.ts](../../scripts/host-bridge/host-bridge-workflow-catalog.ts.md) | scripts/host-bridge/host-bridge-workflow-catalog.ts | 构建脚本：扫描内置工作流目录，按 manifest 契约投影成 Host Bridge 对外暴露的工作流目录文档。 |
| [hostBridgeWorkflowControl.ts](../modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [registry.ts](../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| compatibleBackendTypesForManifest | 函数 | 36–59 | 按 manifest 声明的 provider 与 request kind 推导出兼容的后端类型集合。 |
| [projectWorkflowManifestContract](../../../symbols/src/workflows/manifestContract.ts/projectWorkflowManifestContract.md) | 函数 | 61–114 | 把 manifest 投影为 WorkflowManifestContract：执行模式、资源要求、provider 需求、必需选项、结果证据与选择规则。 |
