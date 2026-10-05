
# src/sidebar
> 目录聚合页：10 个文件、102 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/sidebar/acpChildApp.js](../../files/src/sidebar/acpChildApp.js.md) | 文件 | 0 | ACP 子应用页面的单行 esbuild 入口，只负责从 assistantWorkspaceAcpChild 引入并引导子运行时启动。 |
| [src/sidebar/assistantPanelModel.js](../../files/src/sidebar/assistantPanelModel.js.md) | 文件 | 16 | Assistant Workspace 面板的纯投影模型：把工作区 snapshot 归一化为面板 DTO，包含状态/应用态语义、精确工作区字段、任务与分组、抽屉区块与空态 chrome。 |
| [src/sidebar/assistantPanelRenderer.js](../../files/src/sidebar/assistantPanelRenderer.js.md) | 文件 | 5 | 面板 chrome 的命令式 DOM 渲染器：管理 toolbar/banner/plan 等托管挂载点、区域标记与 overlay 关闭，并向宿主派发面板 action。 |
| [src/sidebar/assistantRegionCollapse.ts](../../files/src/sidebar/assistantRegionCollapse.ts.md) | 文件 | 5 | Assistant Workspace 区域折叠控制器：按区域可见性自动决定折叠阶段，并维护用户覆盖态，折叠只切换容器 class 与 data 属性。 |
| [src/sidebar/assistantTranscriptRenderer.js](../../files/src/sidebar/assistantTranscriptRenderer.js.md) | 文件 | 29 | Transcript 区域的命令式渲染器：虚拟滚动窗口、分页缓存与 anchor 保持、工具调用活动分组、代码块装饰及底部粘滞逻辑都在此实现。 |
| [src/sidebar/assistantWorkspaceAcpChild.js](../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | 文件 | 15 | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |
| [src/sidebar/assistantWorkspaceApp.js](../../files/src/sidebar/assistantWorkspaceApp.js.md) | 文件 | 0 | Assistant Workspace 侧边栏页面的构建入口，仅引入 shell 模块以触发其副作用完成挂载。 |
| [src/sidebar/assistantWorkspaceShell.js](../../files/src/sidebar/assistantWorkspaceShell.js.md) | 文件 | 13 | Assistant Workspace 生产版 shell：管理三个标签页的子 iframe 装载、宿主 ready 握手与重试、快照发布缓存与 ACK 确认、surface 配置下发，以及抽屉开合与 payload scope 同步。 |
| [src/sidebar/markdownParser.js](../../files/src/sidebar/markdownParser.js.md) | 文件 | 3 | 侧边栏 Markdown 渲染入口：懒加载共享 markdown parser 并按 document profile 渲染消息正文。 |
| [src/sidebar/prototypeWorkspaceApp.js](../../files/src/sidebar/prototypeWorkspaceApp.js.md) | 文件 | 16 | Harness 专用的原型工作台 shell：复用生产 shell 的子页面桥接与发布逻辑，把导航模型换成「Conversations / Skill Runs」双泳道加子标签切换，并渲染由生产样式表驱动的静态 mock 面板。 |

## 子目录
- [components](sidebar/components.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/shared](shared.md) | 5 |
| [src/sidebar/components](sidebar/components.md) | 1 |
