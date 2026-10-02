
# src/dashboard/components/SkillrunnerAuditRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/SkillrunnerAuditRegion.tsx -->

Dashboard 的 SkillRunner 连接审计面板（只读）：呈现 governor 指标卡、各维度计数条与近期事件表；唯一的交互是复制 JSON，由集成层通过 onCopyJson 回调完成，不产生任何 wire 动作。
源码：[src/dashboard/components/SkillrunnerAuditRegion.tsx](../../../../../../src/dashboard/components/SkillrunnerAuditRegion.tsx)

## 符号（3）
<!-- node: function:src/dashboard/components/SkillrunnerAuditRegion.tsx:AuditBarsSectionView -->
<!-- node: function:src/dashboard/components/SkillrunnerAuditRegion.tsx:AuditEventsTable -->
<!-- node: function:src/dashboard/components/SkillrunnerAuditRegion.tsx:SkillrunnerAuditRegion -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AuditBarsSectionView | 函数 | 133–164 | 中等 | component、chart、audit | 0 | 渲染审计各维度的计数条形图，按最大值归一化条长并显示计数与标签。 |
| AuditEventsTable | 函数 | 184–215 | 中等 | component、table、audit | 0 | 近期审计事件表：按时间列出事件类型、维度与计数，尾部提供复制 JSON 入口。 |
| SkillrunnerAuditRegion | 函数 | 217–258 | 简单 | component、memo、region | 1 | memo 化的审计区域组件，只渲染 panel model 已解析的全部文案，不自行调用 FTL。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardChromeRenderer.ts](../dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [dashboardPanelModel.ts](../dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [dashboardTypes.ts](../dashboardTypes.ts.md) | src/dashboard/dashboardTypes.ts | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [equalBySignature](../../../../symbols/src/shared/regionEquality.ts/equalBySignature.md) | src/shared/regionEquality.ts | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| SkillrunnerAuditRegion | 函数 | 217–258 | memo 化的审计区域组件，只渲染 panel model 已解析的全部文案，不自行调用 FTL。 |
