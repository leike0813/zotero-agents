# Backend Manager

`openBackendManagerDialog()` 由 `src/modules/workflow/settings/backendManager.ts` 持有。宿主创建 Zotero 对话框及 iframe，并通过 `src/shared/dashboardWireContract.ts` 的消息契约与 `src/dashboard/backendManagerApp.ts` 通信。页面各区域是 `src/dashboard/components/BackendManagerRegion.tsx` 的 Preact 组件；`addon/content/dashboard/backend-manager.js` 是构建产物。

## 两条配置路径

| 页面 | 数据来源 | 保存动作 |
| --- | --- | --- |
| ACP、SkillRunner、Generic HTTP | `BackendInstance` 行，来自 `backendsConfigJson` | `save` 汇总和校验全部 Backend Profile 行，再调用 `persistBackendsConfig()` |
| 内置 Agent | 独立的 `builtinAgent` snapshot，来自 Pi 模型 Provider 配置、脱敏凭据元数据及 Pi 模型目录 | `pi-*` 动作单独保存配置、默认值或刷新目录；不传入 Backend Profile 行 |

现有三个 Backend Profile 页保留原有 ACP 预设、Generic HTTP 预设、SkillRunner 管理入口、连接探测及行级校验。托管本地 SkillRunner 行继续隐藏，保存其他行时保留。

## 内置 Agent 页面

已选配置的凭据引用随宿主 snapshot 更新；页面仅在用户未另选凭据且 provider、认证类型仍匹配时同步该引用。登录后的保存保留新关联的凭据和其它未保存字段，用户手动改选的凭据优先保留。

此页维护多份 Pi 模型 Provider 配置。用户可选择目录 provider 和模型、显式认证类型、凭据引用、reasoning、可选自定义端点及 API dialect；配置与凭据删除互不级联。页面显示配置与目录状态、已保存凭据的脱敏元数据，并提供全局、Pi Conversation、Pi Skill Run 默认项、`models.yml` 的只读导入/刷新与显式移除。模型候选按 provider 查询，一次最多返回 100 条，避免把完整目录投影进页面。

「Model catalog」区域只接收宿主投影的白名单来源状态：来源（内置种子、官方目录、上一份目录）、独立 revision、检查与更新时间、自动更新开关、是否可恢复、overlay 状态和所选账户的发现状态。完整目录、凭据和私有路径都不进入页面。

公共更新、自动更新开关、恢复上一份目录和 overlay 移除各带独立请求 ID；页面只认领最后一次请求的结果，被取代的结果不会覆盖较新的状态。失败时保留仍可用的目录数据，只显示安全的结构化码，不回显可能包含本地路径的异常文本。目录状态或候选在表单编辑期间变化不会重置未保存的草稿、默认值或已选配置；消失的候选也不会回退到首个剩余项。窗口卸载只解除对目录的订阅，不取消其它窗口共享的更新请求。

C04 在此页提供 API key 的录入、替换和清除。密码输入框在提交时立即清空，宿主只把密钥交给加密凭据库；页面快照仍只有掩码元数据。用户可对已保存配置手动发起一次短连接测试，结果只显示脱敏状态码，不保存测试会话。C05 为已保存的 OpenAI Codex 配置提供设备码登录、取消、重连和本地断开：验证码只在当前请求的页面暂态显示，由宿主打开固定验证地址；登录成功才写入加密凭据并更新配置引用。Pi 配置及 MCP 来源中的选择项由页面内的 Preact 按钮列表呈现，避免 Zotero 独立弹窗中的原生选择菜单无法用鼠标展开。配置允许不完整地保存，但禁用、缺少匹配类型的凭据或目录中不存在的模型不能成为可运行默认项。

Pi 模型目录由 `src/modules/piModelCatalog.ts` 持有。配置和基础目录加载只读取固定 catalog、只读 `models.yml` 及有效的脱敏 overlay 缓存。Codex 登录成功或用户点击刷新模型后，才使用所选凭据查询官方账户模型发现接口；可见描述符归一化为内存中的凭据专属目录，失败保留先前有效结果，断开会移除相应目录并拒绝迟到结果。模型候选查询带请求 ID 和凭据引用。官方未提供的输出上限保持未知，原生 Codex 使用已知上下文窗口约束输出预留，不推断工具能力。

配置选择由 `src/modules/piProviderConfiguration.ts` 持有，凭据封装由 `src/modules/piCredentialStore.ts` 持有。共享 DTO 在 `src/shared/piProviderContract.ts`，页面不导入宿主模块。Pi 密文及脱敏元数据存在 profile 偏好中，加密密钥使用现有插件状态库的 `plugin_meta`，不依赖 Host Bridge token。

`src/modules/piProviderExecution.ts` 把已解析的选择快照投影给原生 Pi stream adapter，逐次读取指定的加密凭据。Codex 选择经 `src/modules/piOpenAICodexAuth.ts` 解析账号声明并在过期时原子刷新，使用原生 Codex SSE 适配器。自定义本地端点须由调用方先提供 Local Network 授权；缺失时调用在发出请求前失败。模型流只向 `PiRuntime` 传递文本增量或结构化失败码，不把原始响应正文、请求头或异常传到 UI。此切片尚未把模型源接入 Pi Conversation 或 Skill Run owner。

同页的 MCP Tool Sources 区域管理独立的 profile 源注册表。保存源不连接；用户主动测试后才显示工具，逐项选择并可将已选工具提升为直接工具。审阅绑定工具描述符摘要，源地址或描述符改变后须重新审阅。HTTP 公网源必须使用 HTTPS，本地网络源要显式批准 origin；私有网络明文 HTTP 不得绑定凭据。stdio 使用绝对可执行路径、显式参数和最小环境，通过长驻进程适配器执行。`.mcp.json` 先预览再导入，字面密钥进入同一加密凭据库的 `mcp-source` 命名空间；导出只提供需重新绑定的空槽位。

`src/modules/piMcpToolSources.ts` 惰性持有官方 MCP v2 客户端及内存目录。每个 turn 的已选目录由 C07 Gateway 代理与直出定义冻结；代理的 search/describe 只读取冻结目录，call 由 Gateway 审批、调度和记录。连接中断后的调用不自动重放，结果经 1 MiB 边界归一化。当前 C10 提供源与 Gateway 组合接口，实际 Pi Conversation / Skill Run owner 的模型工具接线属于后续 change。

## 验证入口

- `tests/dashboard/251-dashboard-backend-manager.test.ts`：页面动作、区域身份和三个原有页的行为。
- `tests/zotero/ui/lite/278-pi-provider-configuration.zotero.test.ts`：真实宿主中目录控件与未保存草稿的共存。
- `tests/runtime/57-backend-manager-risk-regression.test.ts`：Backend Profile 既有保存及副作用边界。
- `tests/runtime/242-pi-provider-configuration.test.ts` 至 `244-pi-credential-store.test.ts`：Pi 选择、目录、凭据行为。
- `tests/runtime/246-pi-api-key-provider-execution.test.ts`、`tests/tooling/246-pi-provider-env-guard.test.ts`：模型流、脱敏失败和浏览器构建边界。
- `tests/zotero/core/lite/278-pi-provider-configuration.zotero.test.ts` 与 `tests/zotero/ui/lite/278-pi-provider-configuration.zotero.test.ts`：真实宿主边界。
- `tests/zotero/core/lite/280-pi-api-key-provider-execution.zotero.test.ts`：真实 Zotero 中使用确定性响应夹具执行原生 Provider 路径。
- `tests/runtime/251-pi-openai-codex-auth.test.ts` 与 `tests/zotero/core/lite/285-pi-openai-codex-auth.zotero.test.ts`：设备码、凭据轮换与原生 Codex stream 的受控响应验证。
- `tests/runtime/249-pi-mcp-tool-sources.test.ts`、`tests/zotero/core/lite/283-pi-mcp-tool-sources.zotero.test.ts`：源、审阅、Gateway 代理与真实 stdio 边界；`npm run check:pi-mcp-browser-bundle` 验证浏览器包。
