# 第七版：MCP 参数、环境变量与认证引导

[第七版固定原型](revision-7.html) · [当前入口](index.html) · [第六版独立页面基线](revision-6.html)

本版落实用户对 MCP 编辑器的修改要求，完整契约由[工具来源与高级维护 · Resolution](https://github.com/leike0813/zotero-agents/issues/73#issuecomment-5977804714)持有。

用户已明确批准：“可以了，批准这一版原型”。第七版为当前实施引用，见[批准记录](approval.md)。

## 现场路径

选择多连接评审场景，打开左侧 MCP 页，点击“添加来源”：

1. 选择本机程序，填写绝对程序路径。通过“添加参数”逐项输入，通过“添加环境变量”逐项填写名称和值，按条目移除。参数包含空格时作为一个完整参数保留，顺序由列表持有。
2. 工作目录留空，观察输入框中的默认提示及其下方说明。现有 `piMcpToolSources.ts` 使用 `getRuntimePersistencePaths().runtimeRoot` 作为默认目录；原型显示“Zotero Agent 运行目录”，不写入虚构绝对路径。
3. 选择 HTTP / HTTPS，比较无需认证、Bearer token 和 API Key。Bearer 只填 token；API Key 选择常用类型或服务商指定名称，再填密钥。高级请求头默认折叠，通过条目按需添加。
4. 保存后重新编辑，已存认证及变量只显示保存状态，空值保留既有引用。修改名称、参数或单个条目后保存，检查其他绑定保留。选择无需认证时移除已知认证绑定。
5. 模拟保存失败、切换认证方式或 API Key 字段，观察旧配置和新草稿分别保留，新字段不会借用旧字段的凭据。条目重复时提示修正，避免静默覆盖。
6. 使用整份 JSON 编辑、导入与导出，比较引导式表单中的投影及空认证槽。普通编辑器不再使用参数数组、环境变量字典或请求头字典的文本框。

## 验证

- [MCP 引导表单走查](revision-7-guided-mcp-walkthrough.json)：36 项通过。
- [来源、搜索与维护回归](revision-7-tools-walkthrough.json)：62 项通过。
- 共 98 项，浏览器运行错误及外部请求均为零。独立严格 TypeScript、构建脚本语法、原型构建与 Prettier 检查通过。使用临时浏览器走查脚本，不新增项目长期维护测试。
- [stdio 条目与默认目录提示](revision-7-stdio-entries.png)、[Bearer 引导](revision-7-bearer-form.png)、[API Key 引导](revision-7-api-key-form.png)、[紧凑 stdio 表单](revision-7-compact-stdio.png)、[深色 Bearer 表单](revision-7-dark-bearer.png)。

## 交接边界

第七版继续使用独立的 MCP 和搜索页面。已存凭据不回填，草稿值不进入状态投影、导出或错误回显；取消、关闭及保存失败保留既有行为。

认证类型和字段身份是原型中的安全展示元数据。生产实现须通过既有 MCP 来源/凭据 owner 完成 token 到实际请求头的转换（Bearer 前缀只添加一次）、字段替换与移除、凭据事务及测试证据失效；本版没有执行真实认证请求，不提供实际 wire 证据。既有不透明自定义认证需保留，不能仅从凭据引用猜测认证方式。

整份 JSON 与引导式表单继续使用同一来源配置；默认目录来自现有运行目录 owner。原型不替代生产 schema、运行时、实机登录或正式验收。
