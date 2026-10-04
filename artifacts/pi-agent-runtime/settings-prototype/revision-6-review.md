# 第六版：MCP 与搜索独立配置页

[第六版固定原型](revision-6.html) · [当前入口](index.html) · [第五版操作基线](revision-5-review.md)

用户要求将 MCP 和搜索拆成两个独立选项页。本版在左侧导航分别提供“MCP”和“搜索”，各有独立页头及内容，移除合并页面的切换标签。“开始使用”页也分别提供“配置 MCP”和“配置搜索”入口。

当前契约由[工具来源与高级维护 · Resolution](https://github.com/leike0813/zotero-agents/issues/73#issuecomment-5977804714)持有。MCP 表单/JSON/导入导出、搜索来源独立测试、模型连接和维护操作承接既有决定。

## 走查

直接打开 `revision-6.html`，选择多连接评审场景：

1. 点击左侧“MCP”，查看来源卡片、添加来源和 JSON 操作。
2. 发起 MCP 连接测试后切到“搜索”，检查两个页面各自的内容和导航高亮；返回 MCP，测试结果及配置仍在。
3. 在搜索页配置、测试或排序来源；本页不出现 MCP 注册表操作。
4. 回到“开始使用”，分别打开“配置 MCP”和“配置搜索”。比较标准、紧凑和深色窗口。

## 证据

- [独立导航与切页走查](revision-6-navigation-walkthrough.json)：16 项通过。
- [来源、搜索与维护回归](revision-6-tools-walkthrough.json)：62 项通过。
- 两组共 78 项，浏览器运行错误及外部请求均为零。独立 TypeScript、构建和 Prettier 检查通过；走查使用临时脚本，不新增维护测试。
- [MCP 独立页](revision-6-mcp-page.png)、[搜索独立页](revision-6-search-page.png)、[紧凑深色搜索页](revision-6-compact-dark-search.png)。

第六版演示用户确认的页面拆分，自动走查不等同于用户重新现场批准。本原型仍是内存模拟；真实登录、持久化、搜索与 MCP 请求的执行，以及正式宿主验收，由生产实施流程完成。第五版固定资产保留为操作基线。
