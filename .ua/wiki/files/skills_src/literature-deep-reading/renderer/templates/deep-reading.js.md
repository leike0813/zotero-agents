
# skills_src/literature-deep-reading/renderer/templates/deep-reading.js
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/literature-deep-reading/renderer/templates](../../../../../modules/skills_src/literature-deep-reading/renderer/templates.md)
<!-- node: file:skills_src/literature-deep-reading/renderer/templates/deep-reading.js -->

深度阅读页面的主渲染与交互脚本，负责 Markdown/摘要/参考文献渲染、概念气泡、滚动锚点跟踪以及引用图谱降级展示。
源码：[skills_src/literature-deep-reading/renderer/templates/deep-reading.js](../../../../../../../skills_src/literature-deep-reading/renderer/templates/deep-reading.js)

## 符号（21）
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:applyConceptOverlay -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:conceptForTerm -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:detectConstrainedViewer -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:digestHeadings -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:init -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:initScrollTracking -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderCitationGraph -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderCitationGraphFallback -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderConceptRail -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderInsight -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderMarkdown -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderPrefaceTimelineNode -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderReadingRegion -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderReferenceItem -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderReferences -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:renderSide -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:scheduleActiveAnchorUpdate -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:setActiveAnchor -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:setImageSources -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:showConceptBubble -->
<!-- node: function:skills_src/literature-deep-reading/renderer/templates/deep-reading.js:syncResponsiveLayout -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyConceptOverlay | 函数 | 326–373 | 中等 | renderer、frontend、interaction | 0 | 把概念标注层挂到阅读区节点上，实现术语与概念卡片的关联。 |
| conceptForTerm | 函数 | 244–263 | 简单 | renderer、frontend、interaction | 1 | 在概念集合中按术语查找匹配项，找不到时返回空。 |
| detectConstrainedViewer | 函数 | 829–857 | 中等 | renderer、frontend、interaction | 1 | 检测宿主是否为受约束查看器环境，据此选择简化渲染路径。 |
| digestHeadings | 函数 | 67–82 | 简单 | renderer、frontend、interaction | 0 | 抽取摘要正文的标题层级，用于生成大纲与锚点跳转。 |
| init | 函数 | 1141–1172 | 中等 | renderer、frontend、interaction | 0 | 页面初始化入口，装配数据、渲染各区域并绑定滚动与概念交互。 |
| [initScrollTracking](../../../../../symbols/skills_src/literature-deep-reading/renderer/templates/deep-reading.js/initScrollTracking.md) | 函数 | 1041–1140 | 复杂 | renderer、frontend、interaction | 1 | 初始化滚动跟踪，按可见阅读容器更新目录激活项与锚点位置。 |
| renderCitationGraph | 函数 | 958–1036 | 复杂 | renderer、frontend、interaction | 0 | 渲染引用图谱区域，加载图谱数据并在失败时降级为静态兜底视图。 |
| renderCitationGraphFallback | 函数 | 899–929 | 中等 | renderer、frontend、interaction | 0 | 引用图谱不可用时的静态兜底渲染，输出图例与空态说明。 |
| renderConceptRail | 函数 | 288–325 | 中等 | renderer、frontend、interaction | 1 | 渲染概念轨道列表，为每个概念生成可点击条目与定位逻辑。 |
| renderInsight | 函数 | 614–634 | 简单 | renderer、frontend、interaction | 0 | 渲染洞察卡片区域，把结构化洞察投影为可读文本。 |
| [renderMarkdown](../../../../../symbols/skills_src/literature-deep-reading/renderer/templates/deep-reading.js/renderMarkdown.md) | 函数 | 83–157 | 复杂 | renderer、frontend、interaction | 2 | 把受控 Markdown 渲染为阅读区 HTML，处理标题锚点、表格、公式与图片引用。 |
| renderPrefaceTimelineNode | 函数 | 446–522 | 复杂 | renderer、frontend、interaction | 0 | 渲染前言区域的主题时间线节点，按年份比例定位并绑定跳转。 |
| renderReadingRegion | 函数 | 551–573 | 简单 | renderer、frontend、interaction | 1 | 渲染正文阅读区域，处理窄屏与受约束查看器下的降级布局。 |
| renderReferenceItem | 函数 | 741–778 | 中等 | renderer、frontend、interaction | 0 | 渲染单条参考文献条目，包含标题、作者与可用的来源标签。 |
| renderReferences | 函数 | 779–801 | 简单 | renderer、frontend、interaction | 0 | 渲染参考文献列表，按引用类型分组并标注来源语言。 |
| renderSide | 函数 | 642–662 | 简单 | renderer、frontend、interaction | 1 | 渲染页面侧栏区域，组合概念轨道与阅读指南。 |
| scheduleActiveAnchorUpdate | 函数 | 26–26 | 简单 | renderer、frontend、interaction | 0 | 以节流方式调度锚点更新，避免高频滚动触发重复渲染。 |
| setActiveAnchor | 函数 | 663–673 | 简单 | renderer、frontend、interaction | 0 | 设置当前激活锚点并同步导航高亮与滚动位置。 |
| setImageSources | 函数 | 217–232 | 简单 | renderer、frontend、interaction | 0 | 把图片占位节点绑定到实际资源地址，并对缺失资源做占位处理。 |
| showConceptBubble | 函数 | 273–287 | 简单 | renderer、frontend、interaction | 0 | 在术语旁展示概念浮层气泡，内嵌解释与跳转入口。 |
| syncResponsiveLayout | 函数 | 192–216 | 简单 | renderer、frontend、interaction | 0 | 按视口宽度同步响应式布局，决定是否启用概念轨道等区域。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [markdown-renderer.js](markdown-renderer.js.md) | skills_src/literature-deep-reading/renderer/templates/markdown-renderer.js | 共享 Markdown 渲染器模板，把受控 Markdown 子集渲染为 HTML，包含表格、图片、公式与 HTML 片段净化规则。 |
