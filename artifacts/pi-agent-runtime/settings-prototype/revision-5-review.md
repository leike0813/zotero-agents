# 第五版：工具来源与维护交互走查

[第五版固定原型](revision-5.html) · [当前入口](index.html) · [第三版布局基线](revision-3.html) · [第四版模型操作基线](revision-4.html)

本版演示用户三轮确认的 MCP、搜索和维护决定。完整契约由[确定工具来源与高级维护的配置边界 · Resolution](https://github.com/leike0813/zotero-agents/issues/73#issuecomment-5977804714)持有；本文件只记录走查入口及验证边界。

第三版是用户明确通过的布局基线。第五版是已确认契约的演示，自动走查不代表用户重新现场批准第五版，也不代表生产实施或实机账户验收完成。

## 打开与走查

直接打开 `revision-5.html`，无需服务器。窗口外的评审控件用于模拟保存、来源测试、维护结果、补充文件有效性和诊断保存结果；这些控件不属于产品界面。

1. **MCP 配置即用**：选择多连接场景 → 工具来源 → 添加来源。比较 HTTP 与本机程序的条件字段，填写虚构地址/程序和认证，保存后直接启用。可选测试只显示连接及工具数量，不出现审阅、工具选择或提升步骤。
2. **表单与整份 JSON**：在表单修改来源，再打开“编辑 JSON”；观察同一配置。输入无效 JSON，保存禁用且原文保留。修改来源后阅读新增/修改/移除摘要；模拟保存失败，检查全部旧配置与草稿均保留。
3. **导入与导出**：导出显示连接结构和空认证槽。导入含同名来源及新来源的配置，比较默认保留与显式替换。替换的空认证槽需要重新录入。本地地址要确认具体目标授权。
4. **草稿保护**：修改来源、搜索配置或 JSON 后取消/关闭，比较保存、放弃、继续编辑。关闭后重新打开，已取消测试不遗留等待态；评审场景重置拒绝旧请求的迟到结果。
5. **未启用来源测试**：进入搜索，为 Tavily 保存虚构密钥但不启用。先测试，阅读费用提示，再观察只有此来源产生结果。启用、停用和调序不抹掉同一配置的测试证据，不更改常用模型。
6. **原生搜索绑定**：配置 OpenAI Web Search，复用现有 ChatGPT 连接并单独选择示例搜索模型。没有第二份密钥表单；普通模型测试与来源搜索测试分别显示。原型示例不代表真实搜索模型白名单。
7. **三个维护折叠区**：进入目录与维护，模型目录保持展开，公共更新、补充模型信息和诊断默认折叠。分别模拟更新/恢复失败和成功；恢复成功才关闭自动更新。
8. **补充文件保留**：有效导入后查看采用数量和 Beta 模型卡片上的限制。再模拟无效或丢失源文件，已采用内容保留；显式移除后才清除。连接和默认用途保持原值。
9. **全局诊断导出**：比较保存、取消、失败及重试。导出只演示脱敏全局范围，不包含会话正文或账户凭据；不创建真实诊断文件。

## 验证证据

- [工具、搜索与维护走查](revision-5-tools-walkthrough.json)：62 项通过。
- [模型连接回归走查](revision-5-model-contract-walkthrough.json)：63 项通过。
- 合计 125 项；浏览器运行错误及外部请求均为零。走查使用临时脚本，不新增项目长期维护测试。
- [MCP 列表](revision-5-mcp.png)、[来源表单](revision-5-mcp-form.png)、[整份 JSON](revision-5-json.png)、[搜索入口](revision-5-search-overview.png)、[原生搜索绑定](revision-5-native-search.png)、[默认折叠维护区](revision-5-maintenance-collapsed.png)、[维护结果](revision-5-maintenance.png)、[紧凑窗口](revision-5-compact-maintenance.png)、[深色搜索](revision-5-dark-search.png)。

独立严格 TypeScript、构建脚本语法、原型构建、Prettier 和所改文件的 diff 检查通过。复用已安装的 Preact、esbuild 和 Playwright，无依赖安装、开发服务器、Git 提交或分支切换。

```sh
./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --jsx react-jsx --jsxImportSource preact --lib es2022,dom,dom.iterable --moduleResolution bundler --module esnext --target es2020 src/dashboard/prototypes/builtinAgentSettings.prototype.tsx
node --check scripts/internal/build-builtin-agent-settings-prototype.mjs
node scripts/internal/build-builtin-agent-settings-prototype.mjs
./node_modules/.bin/prettier --check CONTEXT.md src/dashboard/prototypes/builtinAgentSettings.prototype.tsx src/dashboard/prototypes/builtinAgentSettings.prototype.css scripts/internal/build-builtin-agent-settings-prototype.mjs artifacts/pi-agent-runtime/settings-prototype/revision-5-review.md artifacts/pi-agent-runtime/settings-prototype/approval.md
git diff --check -- CONTEXT.md
```

构建命令只生成当前 `index.html`，固定版本保留供实施引用。

## 事实与边界

公共目录沿用项目 seed 的离线归一化数据；更新/恢复仅模拟版本状态，不执行真正的目录合并、退休事实维护或网络更新。搜索来源目录直接复用 `src/shared/piWebSourceContract.ts` 的纯 DTO 与默认值。账户、凭据、请求、程序启动、文件解析、持久化和诊断保存均为模拟。

认证输入不进入状态投影、原生异常回显或导出，内存投影只持有虚构凭据引用。`web_fetch` 不出现在配置页。实际 native 搜索白名单、凭据事务、MCP 自动目录及 Gateway 准入、目录采用与诊断文件生成必须复用正式 owner，并同步旧规格；交给[确定原型到 OpenSpec 的实施约束与验收交接](https://github.com/leike0813/zotero-agents/issues/74)。
