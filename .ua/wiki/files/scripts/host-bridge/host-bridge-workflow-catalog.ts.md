
# scripts/host-bridge/host-bridge-workflow-catalog.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-workflow-catalog.ts -->

构建脚本：扫描内置工作流目录，按 manifest 契约投影成 Host Bridge 对外暴露的工作流目录文档。
源码：[scripts/host-bridge/host-bridge-workflow-catalog.ts](../../../../../scripts/host-bridge/host-bridge-workflow-catalog.ts)

## 符号（3）
<!-- node: function:scripts/host-bridge/host-bridge-workflow-catalog.ts:loadBuiltinWorkflowCatalog -->
<!-- node: function:scripts/host-bridge/host-bridge-workflow-catalog.ts:renderBuiltinWorkflowCatalog -->
<!-- node: function:scripts/host-bridge/host-bridge-workflow-catalog.ts:renderParameters -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| loadBuiltinWorkflowCatalog | 函数 | 32–80 | 中等 | catalog、loader、host-bridge、manifest | 0 | 加载全部内置工作流 manifest，并投影出工作流 id、输入输出槽位与后端兼容类型。 |
| renderBuiltinWorkflowCatalog | 函数 | 99–132 | 中等 | documentation、rendering、host-bridge | 0 | 输出完整的工作流目录文档，供 Host Bridge CLI 与站点文档消费。 |
| renderParameters | 函数 | 86–97 | 简单 | documentation、formatting、manifest | 0 | 把 manifest 中声明的参数槽位渲染成可读的文档片段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [manifestContract.ts](../../src/workflows/manifestContract.ts.md) | src/workflows/manifestContract.ts | 工作流 manifest 契约投影：把 manifest 中的执行模式、资源要求、provider 需求、结果证据与选择规则投影为可对外发布的稳定契约。 |
| [types.ts](../../src/workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [render-host-bridge-surfaces.ts](render-host-bridge-surfaces.ts.md) | scripts/host-bridge/render-host-bridge-surfaces.ts | Host Bridge agent-facing surface 的渲染器：把命令契约、surface 目录、内置工作流与插件 skill bundle 组合成多层 SKILL.md 与 reference 文档，本批最核心的生成脚本。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| loadBuiltinWorkflowCatalog | 函数 | 32–80 | 加载全部内置工作流 manifest，并投影出工作流 id、输入输出槽位与后端兼容类型。 |
| renderBuiltinWorkflowCatalog | 函数 | 99–132 | 输出完整的工作流目录文档，供 Host Bridge CLI 与站点文档消费。 |
