
# src/shared/preactRegionMount.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/preactRegionMount.ts -->

与页面无关的 managed-region 挂载辅助：为按区域独立渲染的 Preact 页面创建并定位 managed mount 子节点，并给区域容器打上通用 data 属性。
源码：[src/shared/preactRegionMount.ts](../../../../../src/shared/preactRegionMount.ts)

## 符号（3）
<!-- node: function:src/shared/preactRegionMount.ts:ensureRegionMount -->
<!-- node: function:src/shared/preactRegionMount.ts:markPageRegion -->
<!-- node: function:src/shared/preactRegionMount.ts:shouldManageRegion -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureRegionMount | 函数 | 19–39 | 简单 | dom、region-mount、factory | 1 | 在 container 下创建或复用名为 name 的 managed mount 节点，可指定插入到既有兄弟节点之前。 |
| markPageRegion | 函数 | 47–59 | 简单 | dom、region-mount | 0 | 给区域容器打上页面级 data 属性标记，供样式与调试定位使用。 |
| shouldManageRegion | 函数 | 66–77 | 简单 | predicate、region-mount | 0 | 判定某个容器是否应由 managed mount 模式接管，避免对页面自有 chrome 误用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManagerRenderer.ts](../dashboard/backendManagerRenderer.ts.md) | src/dashboard/backendManagerRenderer.ts | 后端管理对话框的 chrome renderer：在页面根容器下建立 header/body/footer 与两个预设对话框共五个 managed mount，每个 mount 挂独立 Preact root，使单个区域重渲染不会清空兄弟区域。 |
| [dashboardChromeRenderer.ts](../dashboard/dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [synthesisWorkbenchChromeRenderer.ts](../synthesis/synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureRegionMount | 函数 | 19–39 | 在 container 下创建或复用名为 name 的 managed mount 节点，可指定插入到既有兄弟节点之前。 |
| markPageRegion | 函数 | 47–59 | 给区域容器打上页面级 data 属性标记，供样式与调试定位使用。 |
| shouldManageRegion | 函数 | 66–77 | 判定某个容器是否应由 managed mount 模式接管，避免对页面自有 chrome 误用。 |
