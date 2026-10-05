
# src/synthesis/registryProjection.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/synthesis](../../../modules/src/synthesis.md)
<!-- node: file:src/synthesis/registryProjection.ts -->

注册表区域选择态投影：把 wire 快照与本地 registry 行合成审阅选择 DTO，并提供空审阅状态的常量。
源码：[src/synthesis/registryProjection.ts](../../../../../src/synthesis/registryProjection.ts)

## 符号（1）
<!-- node: function:src/synthesis/registryProjection.ts:projectRegistrySelection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [projectRegistrySelection](../../../symbols/src/synthesis/registryProjection.ts/projectRegistrySelection.md) | 函数 | 19–100 | 复杂 | projection、registry、selection、synthesis | 1 | 把 wire 快照与本地 registry 行投影为审阅选择 DTO，输出选中行、目标候选与计数。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registryTypes.ts](components/registry/registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |
| [synthesisWorkbenchPanelModel.ts](synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTypes.ts](synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisSurfaceProjection.ts](synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [projectRegistrySelection](../../../symbols/src/synthesis/registryProjection.ts/projectRegistrySelection.md) | 函数 | 19–100 | 把 wire 快照与本地 registry 行投影为审阅选择 DTO，输出选中行、目标候选与计数。 |
