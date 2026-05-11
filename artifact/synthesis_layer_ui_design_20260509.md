# Synthesis Layer UI 方案

## 1. UI 定位

Synthesis UI 是跨文献综合资产的管理和阅读界面。

它不属于 Assistant sidebar 的三面板会话界面，也不应并入 ACP Chat、ACP Skills 或 SkillRunner 的 transcript runtime。

v1 UI 应服务于四个动作：

- 发现已有 Synthesis Artifact；
- 阅读 topic synthesis；
- 浏览当前文献库的 Unified Citation Graph；
- 查看 coverage / missing artifacts / freshness；
- 打开或定位 canonical assets。

生成和更新动作可以从 UI 触发 workflow，但 UI 不承载 synthesis 推理本身。

## 2. 首选形态：Zotero 主区域 tab

首选方案是在 Zotero 主区域打开一个 `Synthesis` tab，并在其中内嵌本地 web app。

理由：

- synthesis 是资产管理和知识浏览，不是窄侧边栏对话；
- topic detail、coverage 表格和 Markdown 阅读需要更大横向空间；
- 项目已有 browser-hosted Dashboard 与 host/web bridge 经验；
- 主 tab 更接近 Zotero Reader / Dashboard 的工作台语义。

技术路线：

```text
Toolbar/menu action
  -> open Synthesis tab
  -> create browser frame
  -> load addon/content/synthesis/index.html
  -> host posts init/snapshot
  -> web app sends action envelope
  -> host handles workflow/storage/open-file actions
```

参考约束：

- Zotero 7 源码中 `Zotero_Tabs.add()` 可以创建 tab container；
- Reader tab 也是在 container 中挂载 `browser`；
- 该 API 属于 Zotero 内部接口，不应视为长期稳定公共 API；
- 实现必须保留 Sidebar fallback。

## 3. Fallback：Sidebar

Sidebar 作为 fallback 或快捷入口。

适合放在 Sidebar 的内容：

- 当前选中 collection 的 synthesis 摘要；
- 当前 selected item 关联的 topic links；
- 快速打开 Synthesis tab；
- 当前 artifact freshness 小提示；
- 最近打开的 artifacts。

不适合放在 Sidebar 的内容：

- 完整 Markdown 阅读；
- 大型 coverage 表格；
- dependency graph；
- diff preview；
- 批量更新管理。

如果 Zotero 8 或某些环境下主 tab API 不可用，应降级为 Sidebar + external folder / Markdown open actions。

## 4. v1 页面结构

v1 Synthesis tab 使用 workspace layout：

```text
top tabs: Artifacts / Citation Graph / Registry
left rail: filters / list / graph controls
main pane: selected view
right drawer: selected item / edge / artifact details
```

Artifacts 视图左侧：

- artifact search；
- kind filter，v1 只有 `topic_synthesis`；
- freshness filter；
- topic / collection filter；
- artifact list；
- create topic synthesis action。

Artifacts 主区域：

- artifact title；
- scope summary；
- freshness / coverage chips；
- generated time；
- representative papers；
- missing artifacts；
- Markdown rendered preview；
- source artifacts；
- actions。

v1 actions：

- open canonical Markdown；
- open synthesis folder；
- copy artifact id；
- refresh snapshot；
- rebuild Paper Registry；
- rebuild Unified Citation Graph；
- run synthesize-topic workflow；
- locate Zotero anchor。

Citation Graph 视图和 Registry 视图见下文。

## 5. Citation Graph Explorer

Synthesis UI 应提供当前文献库 Unified Citation Graph 的可视化浏览能力。

该视图只展示插件侧确定性生成的 Unified Citation Graph：

- 库内 paper citation；
- external reference citation；
- unresolved reference；
- citation analysis 中已有的 citation role annotation。

它不展示 method lineage graph、claim conflict graph、topic phase graph 或 topic timeline graph。topic timeline 仍属于 `topic_synthesis` 工件内容。

### 5.1 图形交互

Citation Graph Explorer 至少支持：

- pan / zoom；
- node search；
- paper / external reference / unresolved reference 节点类型区分；
- citation edge 类型和 target status 区分；
- citation role filter；
- tag / collection / year / topic resolver filter；
- selected topic 的 resolved paper set 高亮；
- 鼠标悬浮 node 时高亮一跳邻居；
- 鼠标悬浮 edge 时高亮 source、target 和 edge details；
- 点击 node 打开右侧 details drawer；
- 点击库内 paper node 可定位 Zotero item 或打开 item detail；
- 点击 external reference node 显示 reference metadata 和匹配状态。

### 5.2 Layout Presets

Citation Graph Explorer 应提供离散 layout preset 控制。

v1 graph UI 技术栈：

```text
Graphology: graph data model
D3-force: layout computation
Sigma.js: WebGL rendering
```

布局不是 UI 打开后实时模拟出来的，而是在 Unified Citation Graph 更新后预先计算并持久化。UI 只读取对应 preset 的坐标并交给 Sigma.js 渲染。

v1 内置 preset：

- `compact`：节点更紧凑，适合看整体结构和大簇；
- `balanced`：默认布局，适合日常浏览；
- `expanded`：节点更分散，适合阅读 label 和边关系。

UI 中的 clustering distance 控件应是 segmented control 或 discrete slider，只允许在 preset 之间切换，而不是连续数值 slider。切换 preset 只切换已计算坐标，不运行全图 D3-force simulation。

仍然保留的 graph view controls：

- degree threshold filter；
- connected component filter；
- show only selected neighborhood；
- expand neighborhood depth: 1-hop / 2-hop / all visible；
- manual recompute layout action；
- layout preset status: ready / computing / missing / dirty。

这些控件只影响当前可视化布局和显示范围，不改变 Unified Citation Graph 的事实数据。若某个 preset layout 缺失，UI 应回退到 `balanced`，并提示可后台计算或手动 recompute。

### 5.3 Hover 高亮

Hover 行为应稳定且可解释：

- hover paper node：高亮 inbound citations、outbound citations、直接邻居和对应列表项；
- hover external reference：高亮引用它的库内 papers；
- hover edge：高亮 edge source / target，并在 tooltip 中显示 citation role、matching confidence、source artifact；
- hover 后 details drawer 不自动切换，避免鼠标移动导致阅读上下文跳变；
- click 才切换 selected details。

### 5.4 Graph Details

右侧 details drawer 展示：

- selected paper metadata；
- artifact availability 摘要；
- citation in / out count；
- matched / external / unresolved reference count；
- citation roles；
- source artifact links；
- Zotero item key / libraryId；
- open in Zotero action；
- open related synthesis action。

外部 reference details 展示：

- reference title；
- authors；
- year；
- DOI / URL；
- matching status；
- candidate matched Zotero items；
- citing papers。

### 5.5 性能边界

大库不能一次性渲染全量复杂图。

UI 应支持：

- 分页或按 filter 获取 graph slice；
- 默认只显示当前 topic / collection / selected neighborhood；
- 明确的 “show full library graph” 操作；
- graph node / edge 数量提示；
- 超限时提示用户缩小 filter；
- layout 计算不阻塞主 UI；
- UI 默认不运行全图 D3-force simulation；
- full graph 只使用已持久化 layout preset；
- 小 graph slice 可以 later phase 支持临时 live preview。

## 6. Registry View

Registry View 用于查看 Paper Registry 这个本地 materialized projection。

它以表格为主，不做 graph：

- title；
- year；
- itemType；
- tags；
- collections；
- digest status；
- structured references status；
- citation analysis status；
- markdown status；
- coverage / readiness；
- diagnostics。

Registry View 支持：

- search；
- tag / collection filter；
- missing artifact filter；
- ready-for-synthesis filter；
- open Zotero item；
- run missing artifact workflow entrypoint。

## 7. Host/Web Bridge

UI bridge 沿用 Dashboard 的 snapshot/action 模式。

建议消息：

- `synthesis:init`；
- `synthesis:snapshot`；
- `synthesis:action`。

snapshot 至少包含：

- storage binding state；
- anchor state；
- auto watch / rebuild preference state；
- artifact summaries；
- selected artifact；
- graph summary；
- selected graph slice；
- graph layout preset state；
- paper registry summary；
- available workflows；
- last error；
- labels。

action 至少包含：

- select artifact；
- search artifacts；
- open artifact file；
- open synthesis folder；
- create topic synthesis；
- run workflow；
- rebuild paper registry；
- rebuild citation graph；
- update auto watch preferences；
- locate storage root；
- select graph node；
- select graph edge；
- update graph filters；
- switch graph layout preset；
- recompute graph layout；
- open Zotero item；
- load graph slice；
- search registry；
- refresh。

UI 不直接访问文件系统或 Zotero API，所有动作回到 host 处理。

## 8. 与现有 UI 的关系

### 8.1 与 Dashboard

Synthesis UI 可以复用 Dashboard 的 browser-hosted 技术模式，但不应塞进 Task Dashboard 的任务页。

Dashboard 继续负责任务、后端、运行日志和 workflow 设置。

Synthesis UI 负责 synthesis 资产。

### 8.2 与 Assistant sidebar

Synthesis UI 独立于 Assistant sidebar。

Assistant sidebar 可以在后续读取 Synthesis Artifact 作为上下文，但不负责管理 synthesis storage、index、anchor 或 Markdown preview。

### 8.3 与 workflow settings

创建或更新 synthesis 时，仍通过 workflow settings / run dialog 收集参数。

Synthesis UI 只提供入口和当前 scope 默认值。

## 9. v1 状态展示

UI 必须展示：

- storage root 是否已配置；
- Zotero anchor 是否存在；
- root path 当前机器是否可访问；
- auto watch 是否启用；
- Paper Registry 自动重建是否启用；
- Unified Citation Graph 自动重建策略；
- artifact 数量；
- selected artifact freshness；
- selected artifact 是否 stale；
- coverage 是否 partial；
- missing digest / citation analysis 的 paper 数量；
- Unified Citation Graph 是否可用；
- graph layout presets 是否可用；
- 当前 graph layout preset；
- Paper Registry 是否已构建；
- 当前 graph slice 的 node / edge 数量；
- 最近一次生成或更新的时间。

错误状态必须能被用户理解：

- root missing；
- anchor missing；
- index parse failed；
- artifact file missing；
- metadata mismatch；
- graph unavailable；
- graph layout missing；
- graph layout dirty；
- registry rebuild required；
- graph rebuild required；
- staleness scan disabled；
- auto watch disabled；
- workflow unavailable。

## 10. Preferences 入口

Synthesis UI 应提供 preferences 的可见入口，但实际读写仍由 host 处理。

v1 需要暴露的偏好项：

- enable / disable source watch；
- enable / disable Paper Registry auto rebuild；
- Unified Citation Graph rebuild mode: off / idle / auto；
- default graph layout preset；
- compute all graph layout presets after graph rebuild；
- enable / disable topic synthesis staleness scan；
- rebuild debounce interval；
- maximum library size for automatic graph rebuild；
- run hash check on startup。

UI 不应在 preferences 关闭时静默启动 watcher 或后台重建。关闭自动能力后，UI 应保留手动 refresh / rebuild 操作。

## 11. 后续 UI 扩展

later phase 可以增加：

- stale-soft / stale-hard dashboard；
- update diff preview；
- method / gap / related-work tabs；
- batch update queue；
- embedding index status；
- Obsidian-style backlink navigation；
- claim conflict map。

这些能力不进入 v1 验收。
