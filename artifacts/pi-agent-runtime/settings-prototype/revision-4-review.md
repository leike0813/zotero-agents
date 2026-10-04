# 第四版：模型连接操作契约走查

[第四版固定原型](revision-4.html) · [当前入口](index.html) · [第三版布局基线](revision-3.html)

本版演示三轮讨论中用户确认的保存、取消、模型用途、账户切换、删除、测试及服务商参数行为。完整契约由[模型连接、ChatGPT 登录与默认模型的交互契约 · Resolution](https://github.com/leike0813/zotero-agents/issues/72#issuecomment-5977561423)持有；此文件只提供走查入口与验证边界。

第三版是用户明确通过的布局基线。第四版保持其窗口、导航、首次引导和连接工作台结构，增加已确认行为的演示；自动走查不等同于用户重新现场通过第四版。

## 打开方式

直接打开 `revision-4.html`，无需服务器。评审控件在产品窗口之外，可选择场景、模拟保存/发现/测试/撤销结果；状态面板显示内存投影，输入密钥不进入该投影。

重新构建可迭代入口：

```sh
node scripts/internal/build-builtin-agent-settings-prototype.mjs
```

该命令只生成 `index.html`；固定版本保留用于交接。

## 建议现场路径

1. **登录后取消草稿**：选择首次使用 → ChatGPT → 登录 → 在窗口外点击“登录成功” → 确认方案 → 取消 → 放弃修改。再添加 ChatGPT 连接，在账户列表复用刚才的注册。观察账户已登录与连接已保存分别成立。
2. **草稿保护与保存失败**：选择多连接场景 → 编辑连接 → 修改名称 → 切换编辑连接。比较保存、放弃、继续编辑；把模拟保存切到失败后重试，观察仍停留在原草稿。关闭窗口采用相同保护。
3. **默认用途及删除影响**：在 Alpha 设置常用，在 Beta 设置工作流和标题；移除 Beta，先阅读影响确认。移除当前常用连接时，检查继承的会话/工作流也明确变为未设置。系统不另选替代模型。
4. **逐模型测试**：在 Alpha 点击测试并批准一次请求，Beta 仍显示尚未测试。修改 Alpha 推理强度后，默认用途保留，旧测试证据失效。模拟保存失败时，卡片原值及用途摘要保持不变。
5. **暂停恢复**：选择额度暂停 → 在 Alpha 测试并恢复。先使用“仅部分响应”，再使用“实际完成”。只有后者解除暂停，提示原任务仍需手动继续。
6. **发现结果与身份**：在多连接场景编辑 ChatGPT 连接，启动刷新后切换注册；观察原请求的迟到结果不会覆盖新注册。切换模拟发现结果，比较失败保留旧列表、成功空列表保留不可用卡片、能力不足阻止新用途。
7. **注册共享与退出**：让两条连接引用同一注册，退出时查看全部受影响连接。比较退出与移除注册；连接、卡片及默认用途保留，本地完成与远端撤销未知分别报告。
8. **额外服务商参数**：添加 API Key 连接，选择 Cloudflare AI Gateway，填写示例账户 ID、网关 ID 和虚构密钥。保存后从目录添加模型，观察各模型的目标按目录模板解析。目录更新不改已存目标；Amazon Bedrock 等缺少适配的入口仍禁用。
9. **本地无密钥与目标修复**：保存自定义本地服务但不批准网络访问，观察模型用途不可用。批准后可设置；修改本地目标需要重新批准。目标待确认场景保留默认用途，需显式接受后才恢复准入。

## 验证证据

- [浏览器交互走查](revision-4-walkthrough.json)：63 项通过，外部请求与浏览器运行错误均为零。脚本是临时评审走查，不新增项目维护测试。
- [日常工作台](revision-4-workbench.png)、[草稿保护](revision-4-draft-protection.png)、[删除影响](revision-4-model-removal.png)、[恢复结果](revision-4-recovery.png)、[成功空列表](revision-4-empty-models.png)、[服务商参数](revision-4-provider-parameters.png)、[紧凑窗口](revision-4-compact.png)、[深色主题](revision-4-dark.png)。
- 独立严格 TypeScript 检查、构建脚本语法、原型构建与 Prettier 检查通过。复用已安装的 Preact、esbuild、Playwright，没有安装依赖。

验证命令：

```sh
./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --jsx react-jsx --jsxImportSource preact --lib es2022,dom,dom.iterable --moduleResolution bundler --module esnext --target es2020 src/dashboard/prototypes/builtinAgentSettings.prototype.tsx
node --check scripts/internal/build-builtin-agent-settings-prototype.mjs
node scripts/internal/build-builtin-agent-settings-prototype.mjs
./node_modules/.bin/prettier --check CONTEXT.md src/dashboard/prototypes/builtinAgentSettings.prototype.tsx src/dashboard/prototypes/builtinAgentSettings.prototype.css scripts/internal/build-builtin-agent-settings-prototype.mjs artifacts/pi-agent-runtime/settings-prototype/revision-4-review.md
```

## 证据边界

账户、授权、保存、加密凭据、网络授权、发现、测试、撤销及清理均为内存模拟；公共模型展示事实来自项目 seed 的离线归一化数据。模拟密钥只用于操作演示；原型没有生产认证或凭据模块导入。

API Key 的身份引用及清理提示演示已确认的归属，不能证明生产安全存储已经清理。迟到回调按钮模拟过期授权结果，实际 OAuth 验签、轮换、撤销及 owner 清理仍由生产契约和真实宿主证据验证。

MCP、搜索/网页来源和公共目录维护操作的完整行为由下一张契约票决定。本票没有实施生产配置页、修改认证协议、更新 OpenSpec 实施任务或完成真实登录/C20 验收；没有 Git 提交、分支切换、依赖操作或服务器。
