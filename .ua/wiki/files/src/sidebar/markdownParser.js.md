
# src/sidebar/markdownParser.js
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/sidebar](../../../modules/src/sidebar.md)
<!-- node: file:src/sidebar/markdownParser.js -->

侧边栏 Markdown 渲染入口：懒加载共享 markdown parser 并按 document profile 渲染消息正文。
源码：[src/sidebar/markdownParser.js](../../../../../src/sidebar/markdownParser.js)

## 符号（3）
<!-- node: function:src/sidebar/markdownParser.js:createMarkdownParser -->
<!-- node: function:src/sidebar/markdownParser.js:getMarkdownParser -->
<!-- node: function:src/sidebar/markdownParser.js:renderSidebarMarkdown -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createMarkdownParser | 函数 | 10–30 | 简单 | markdown、lazy-load、singleton、sandbox | 0 | 懒加载并缓存共享 markdown parser 实例，供侧边栏正文渲染复用。 |
| getMarkdownParser | 函数 | 32–37 | 简单 | markdown、accessor、lazy-load、utility | 0 | 返回已就绪的 markdown parser，必要时触发创建。 |
| renderSidebarMarkdown | 函数 | 39–54 | 简单 | markdown、rendering、sanitize、entry-point | 1 | 按 document profile 渲染 markdown 文本为 DOM，并施加共享 sanitize 规则。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceAcpChild.js](assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| renderSidebarMarkdown | 函数 | 39–54 | 按 document profile 渲染 markdown 文本为 DOM，并施加共享 sanitize 规则。 |
