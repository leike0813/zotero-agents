
# src/sidebar/components/PlanRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/PlanRegion.tsx -->

计划区域：渲染 Agent 给出的 plan 条目列表及其当前状态，并支持条目级操作。
源码：[src/sidebar/components/PlanRegion.tsx](../../../../../../src/sidebar/components/PlanRegion.tsx)

## 符号（3）
<!-- node: function:src/sidebar/components/PlanRegion.tsx:PlanContent -->
<!-- node: function:src/sidebar/components/PlanRegion.tsx:planEntries -->
<!-- node: function:src/sidebar/components/PlanRegion.tsx:planVisible -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| PlanContent | 函数 | 39–81 | 中等 | component、plan、region、preact | 0 | 计划内容渲染：逐条渲染计划条目及其状态与操作。 |
| planEntries | 函数 | 24–32 | 简单 | projection、plan、accessor、utility | 1 | 从面板 DTO 提取计划条目列表，缺省时返回空数组。 |
| planVisible | 函数 | 34–37 | 简单 | visibility、plan、guard、utility | 0 | 判断计划区域当前是否应展示。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [chromeRenderer.ts](chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |
