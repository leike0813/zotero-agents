# Zotero Agent 设置

模型连接、模型卡片、ChatGPT 注册、MCP 来源、搜索来源与目录维护集中在一个独立窗口中配置。`src/modules/workflow/settings/zoteroAgentSettings.ts` 持有窗口、消息准入、订阅、有界投影与动作编排；所有持久事实仍由各自的领域 owner 保存，窗口不持有第二份配置。

## 入口

| 入口                | 路径                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 首选项              | `addon/content/preferences.xhtml` 的 `pref-zotero-agent-settings` 按钮，紧邻 Backend Manager 左侧；`src/modules/preferenceScript.ts` 绑定命令后派发 `openZoteroAgentSettings` |
| 主窗口              | `src/hooks.ts` 的 `onPrefsEvent` 处理同一事件；插件关闭时由 shutdown 步骤调用 `closeZoteroAgentSettings()`                                                                    |
| Assistant Workspace | `assistantWorkspaceActionRouter.ts` 的 Pi 配置动作直接调用 shell host 的 `openZoteroAgentSettings`，`assistantWorkspaceSidebar.ts` 提供惰性实现                               |

三个入口共用 `openZoteroAgentSettings()`。窗口已打开时只聚焦，不新建窗口、不重置草稿。设置窗口使用独立的 `ztoolkit.Dialog` 引用，不复用 `addon.data.dialog`，因此可与 Backend Manager 同时使用。宿主在 `#zs-agent-settings-root` 中插入 iframe，加载 `chrome://<addonRef>/content/dashboard/zotero-agent-settings.html`；iframe 与窗口在 `Pi 关闭构建`（`__PI_RUNTIME_ENABLED__` 为假）下不建立，Pi 设置图因此不进入插件入口图。

## 消息契约

`src/shared/zoteroAgentSettingsWireContract.ts` 是页面与宿主之间唯一的动作、快照与结果边界，页面不 import `src/modules/**`。

- 页面 → 宿主：`zotero-agent-settings:action`，携带 `action`、`requestId`、`objectId`、`payload`。
- 宿主 → 页面：`zotero-agent-settings:snapshot`、`zotero-agent-settings:action-result`，以及可选的 `zotero-agent-settings:progress`（浏览器授权进度）与 `zotero-agent-settings:request-close`（关闭窗口前询问未保存草稿）。

`objectId` 是动作所拥有的对象身份：连接、模型卡片、注册、来源、凭据，或 `window`、`catalog`、`mcp-registry`、`web-registry` 四个范围令牌。宿主按 `objectId` 取代上一个未完成请求，被取代的请求与已关闭窗口的请求都不接收结果；页面在派发同一对象的下一个请求时清除该对象的 pending 状态。准入同时检查 `event.source` 是本窗口 frame、`action` 属于 `ZOTERO_AGENT_SETTINGS_ACTION_NAMES`、`requestId`/`objectId` 非空且不超过 160 字符、`payload` 是普通对象。

每个结果带回同一对 `requestId`/`objectId`，失败只给结构化 `code`，不回显提交文本、异常或密钥。快照发布带世代号，过期结果不会覆盖较新状态。

`createZoteroAgentSettingsSession()` 只持有传输层：准入、请求取代、发布世代与 `dispose()`。所有领域动作由惰性组合点 `zoteroAgentSettingsPiAccess.ts` 的 `createZoteroAgentSettingsOwner()` 分发，返回 `{ snapshot, dispatch, subscribe, dispose }`，并复用既有的 provider、凭据、注册、MCP、搜索、目录与文件选择 owner。

## 页面与 owner

| 页面       | 内容                                                               | 领域 owner                                                               |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 引导       | 连接服务商、选择模型、开始使用；按连接数与默认模型状态给出不同入口 | 同模型工作台                                                             |
| 模型工作台 | 模型连接、连接内模型卡片、默认用途、ChatGPT 注册                   | `piProviderConfiguration.ts`、`piCredentialStore.ts`、`piChatGPTAuth.ts` |
| MCP        | 来源表单、整份 JSON、导入导出                                      | `piMcpSourceRegistry.ts`                                                 |
| 搜索       | 来源配置、启用状态、顺序、来源测试                                 | `piBrokeredWebTools.ts`                                                  |
| 目录与维护 | 预置服务商与模型、公共目录更新、模型信息补充、全局诊断导出         | `piModelCatalog.ts`、`piRuntimeAudit.ts`                                 |

目录浏览保持可见，公共目录更新、模型信息补充与全局诊断是三个默认折叠的分区，每个分区的操作保留各自的反馈与已采用内容。文件选择由宿主发起，页面只拿到展示名与实际采用的新增/更新计数；取消选择不生成文件。

### 模型连接与模型卡片

连接拥有自己的 ID、名称、provider、认证变体、凭据或 ChatGPT 注册引用、启用状态与显式目标输入；模型卡片以稳定 ID 引用连接，并持有自己的 model、reasoning 与目标相关绑定。多个卡片共享一个连接，不会再次要求输入密钥。公共服务选择只提供已有执行器支持的连接；要求当前执行器未实现的账号或网关参数的服务显示不可配置原因。

自定义端点的 API 选项使用 `PiExecutionApi`，认证组合由共享 `PI_API_AUTH_VARIANTS` 投影。无密钥连接使用支持 `none` 的 OpenAI Chat Completions API。本地连接的保存确认按 origin 持久化并回显，换 origin 后失效；实际调用仍由调用方提供其作用域内的 Local Network 授权。

默认用途是卡片上的动作：通用、会话、Skill Run 与标题。缺少会话或 Skill Run 选择时继承通用默认，缺少标题选择时关闭 provider 生成标题。不存在目录回退或首个可用模型的隐式选择。

模型测试由用户显式发起，一次短推理、不带工具、不自动重试，结果关联连接/模型/请求/目标/认证身份。只认实际完成的响应；身份变化后到达的旧结果不能为新绑定背书。凭据、目标与调用参数变化使适用测试结果失效，仅改名称保留。

### MCP 来源

来源配置由 `piMcpSourceRegistry.ts` 持有，`src/shared/piMcpSourceContract.ts` 定义 DTO。引导表单、整份 `mcpServers` JSON 与合并导入规范化为同一个变更集（`PiMcpSourceChangeSet`），经 prepare/validate 后在既有加密凭据 owner 的写入边界上串行提交；提交成功后才发布快照、失效连接与证据并清理孤立绑定。配置写入或凭据写入失败时回到旧权威状态，输入草稿保留。

HTTP 认证是无需认证、Bearer token 或 API key 三种常见形态，另有折叠的高级请求头条目。Bearer 在传输解析处只加一次前缀；API key 使用用户选择的字段。凭据槽以字段身份（请求头名或环境变量名）为键，因此改了字段名而未填新值时不会借用旧字段的密钥，空值编辑只保留同一字段的绑定。请求头唯一性大小写不敏感，重复条目报错而不静默覆盖。

stdio 使用绝对可执行路径、有序 argv 与最小环境；工作目录留空时省略保存，由传输解析到托管运行目录。公网 HTTP 必须 HTTPS；私有/局域网明文 HTTP 需 source+origin 绑定的本地网络授权且不得携带凭据；回环 HTTP 在该授权下可带凭据。跨源重定向失败，OAuth 挑战返回 `oauth_not_supported`。

整份 JSON 的显式全量保存会在影响预览后移除文档省略的来源；合并导入的省略不删除，同名冲突默认保留现有条目。导入的本地网络授权不被信任，目标批准仍由用户显式给出。

### 自动准入

来源不再有用户维护的工具审阅、勾选或提升记录，`PiMcpSource` 也不保存这些值。后续每个 turn 的目录由 `piMcpToolSources.ts` 的 `getCatalogForTurn()` 惰性连接已启用且已配置的来源、发现工具，并在冻结前校验受支持的描述符、schema 与名称；目录条目携带 `sourceId`、`sourceIdentity`、`name`、描述符 `digest` 与 `effects`，整个目录带自身 `digest` 并被冻结。描述符身份只是运行期证据：源地址或描述符改变后重新校验，不会以陈旧含义派发。损坏的注册表不贡献任何可调用工具。

模型通过既有代理访问该有界目录：`search` 与 `describe` 只读冻结目录，`call` 由 Gateway 审批、调度并记录，目录外的工具名直接拒绝。私有网络与 stdio 仍要求各自的作用域授权，服务端自述的能力说明不降低保守派发效果。连接中断后的调用不自动重放。

来源测试是可选的：它只回报该来源的发现结果，既不启用来源，也不构成任何人工审阅结论。

### 搜索来源

搜索只提供项目策展的来源，这些描述符不再经过用户审阅门，只保留受支持的搜索描述符与形状校验。启用状态、顺序与来源测试在 `piBrokeredWebTools.ts` 中保存。显式测试只执行被测的完整已保存来源，与 `enabled` 无关：它校验该来源的完整目标、认证/模型身份与权限，捕获请求/配置/凭据身份后走既有真实执行器。测试不切换启用状态、不挑选回退来源、不重试、不恢复任务，也不解除订阅暂停。仅启用或仅改顺序保留适用测试证据；端点、认证或原生搜索模型变化使其失效。计费来源在派发前先披露可能的费用。

来源测试捕获的 `toolDigest` 是已执行调用的策展描述符证据，它从不充当派发门，也不是用户维护的审阅值。

turn 冻结仍只选启用且合格的来源，并保持原生搜索对实际模型配置的精确优先级。

## 草稿、异步反馈与窗口生命周期

控制器状态按可见页面与连接/卡片/来源/请求分片；明文只存在于输入控件与一次提交，不进入快照、已持久草稿、导出或日志。连接与来源表单整体保存，模型选项与默认用途按卡片立即保存。离开未保存表单或关闭窗口时提供保存、放弃与继续编辑；保存失败保留当前对象与草稿。已完成的 ChatGPT 登录独立于连接草稿存在，取消草稿后仍保留。

每个异步结果绑定对象、请求与配置/认证身份，被取代的结果被拒绝。区域 props 只比较自身可见内容与本地展开/折叠/编辑状态，因此其它对象完成测试或目录更新时，本表单的 DOM、焦点与选区保持不变。每个页面只有一个主内容滚动区，左侧导航与页头不随正文滚动。

窗口关闭会取消本窗口的授权尝试与本地探测、失效页面结果世代、解除订阅并清理临时密钥，但不关闭全局目录/MCP/runtime owner，也不打断其它消费者需要的共享刷新。

## 区域组件与文案

`src/dashboard/components/ZoteroAgentSettingsControls.tsx` 提供 `Button`、`Badge`、`Banner`、`Switch`、`Choice`、`Field`、`TextArea`、`Header` 与 `Modal`，都是受控组件，不持有领域状态。`Choice` 是自绘 listbox 而非原生 `select`，因为 Zotero 对话框无法弹出原生选择菜单，而 provider 与模型选项需要把不可用条目与其原因一起展示。`text(labels, key, fallback)` 统一走 `labelText`：`labels` 命中则用译文，空值或回显的 `task-dashboard-*` 键则用显式英文兜底，因此缺失翻译时页面仍可读。

控件的排版、颜色与间距取自 `addon/content/shared/page-chrome.css` 的共享 token，页面样式只描述本窗口布局。

## 验证入口

- `tests/runtime/292-zotero-agent-settings-host.test.ts`：宿主准入、请求取代、发布世代、关闭清理与惰性入口。
- `tests/dashboard/`：页面动作、区域身份与草稿保护。
- `tests/zotero/core/lite/` 与 `tests/zotero/ui/lite/`：真实宿主中的窗口布局、主题与实机行为。

本次变更的命令、候选身份与人工观察记录在 `openspec/changes/redesign-zotero-agent-settings/verification.md`。
