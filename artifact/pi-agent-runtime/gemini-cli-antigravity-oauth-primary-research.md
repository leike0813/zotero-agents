# Gemini CLI 与 Google Antigravity OAuth 一手资料核查

核查日期：2026-09-03。本文为 Wayfinder 中 C05 的 Google 认证范围提供事实底稿，只讨论 Google 官方支持和许可的认证路径，不把能够模仿某个网络协议等同于获准使用对应服务。

## 结论先行

1. **“Gemini CLI 已移除 OAuth”不够准确。** Google 自 2026-06-18 起停止让 Gemini Code Assist for individuals、Google AI Pro 和 Google AI Ultra 通过 Gemini CLI 的 **Login with Google** 路径提供请求服务；Gemini Code Assist Standard / Enterprise 不受影响。与此同时，2026-09-01 发布的 Gemini CLI `v0.58.0` 仍保留 `Sign in with Google` UI、`oauth-personal` 类型和完整 OAuth 实现。因此没有一个“删除 OAuth 客户端代码”的版本或 commit；被取消的是 consumer entitlement，生效日在服务端。
2. **Gemini CLI OAuth 不开放给第三方客户端复用。** Gemini CLI 自己的官方条款说明明确把“第三方软件直接访问支撑 Gemini CLI 的服务（例如用 Gemini CLI OAuth 访问 Gemini Code Assist）”列为违反适用条款和政策，并警告可能暂停或终止账户。
3. **Antigravity OAuth 也不开放给第三方工具。** Google Antigravity 官方 FAQ 直接以 Claude Code、OpenClaw、OpenCode 为例，说明第三方软件使用 Antigravity login 违反条款；Antigravity Additional Terms 第 6 条又明确以 “OpenClaw with Antigravity OAuth” 为例。协议即使能被观察或复现，也没有产品使用授权。
4. **获准的第三方 Google 模型路径是 API，而不是产品会话 OAuth。** 官方建议第三方 coding agent 使用 Vertex 或 AI Studio API key。Google 另有公开的 Vertex AI ADC / user-credential 路径，但它要求用户自己的 Cloud project、IAM 和 quota，不能继承 Gemini CLI 或 Antigravity consumer quota。

据此，C05 不应实现 `Gemini CLI OAuth` 或 `Antigravity OAuth` adapter。C04 已覆盖的 Gemini API-key 路径可以保留；如果以后确有 Google OAuth 需求，应单独评估公开文档支持的 Vertex AI ADC / OAuth，使用本项目自己的 OAuth client identity 或 Google Cloud 标准凭据，并把它命名为 Vertex AI authentication，而不是 Gemini CLI / Antigravity OAuth。

## 术语与产品边界

| 名称 | 实际服务或认证对象 | 2026-09-03 状态 | 能否供本项目第三方复用 |
| --- | --- | --- | --- |
| Gemini CLI `Sign in with Google` | Google OAuth 后接 Gemini Code Assist 服务；当前源码使用 `cloudcode-pa.googleapis.com/v1internal` | CLI 代码仍存在；consumer tiers 已停服；Standard / Enterprise 保留 | **不能。** 官方 Gemini CLI 条款明确禁止第三方软件使用该 OAuth 访问底层服务 |
| Gemini Code Assist consumer entitlement | Gemini Code Assist for individuals、Google AI Pro / Ultra 在 Gemini CLI 和 IDE extension 中的权益 | 2026-06-18 停止提供请求 | 不适用；它不是通用 Gemini API 授权 |
| Gemini API key | Google AI Studio / Gemini Developer API 的项目 key | Gemini CLI 和 Antigravity CLI 均仍提供独立 API-key 模式 | **可以。** 按 Gemini API 条款、key 所属项目和 quota 使用 |
| Vertex AI | Google Cloud 项目中的 Gemini API；可用 API key、ADC、service account 等 | 继续受支持 | **可以。** 按公开 Vertex AI API、IAM、billing 和 ADC 文档使用 |
| Antigravity account login / OAuth | Antigravity 2.0、Antigravity CLI 的产品账户会话和 shared agent harness | 官方客户端支持本机浏览器及 SSH OAuth flow | **不能。** FAQ 与 Additional Terms 明确禁止第三方软件访问 |
| Antigravity SDK | Google 提供的 Agent SDK | 官方 quickstart 使用 Gemini API key；Vertex 模式使用项目、location 和 ADC | **可以使用官方 SDK/API 路径；**它不授予第三方复用 Antigravity login token 的权利 |

## Gemini CLI：取消的是个人账户服务，不是 OAuth 客户端代码

### 时间线

- **2026-05-19**：Google Developers Blog 宣布迁移到 Antigravity CLI，并给出 2026-06-18 的 consumer cutoff。公告说 Gemini CLI 和 Gemini Code Assist IDE extensions 届时停止服务 Google AI Pro、Ultra 和 Gemini Code Assist for individuals；企业的 Gemini Code Assist Standard / Enterprise 与 Google Cloud 访问保持不变，Gemini CLI 仍可使用 Gemini API key。见 [Google 官方迁移公告](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)。
- **2026-06-18**：Gemini CLI 官方仓库公告确认 cutoff 已生效：Google AI Pro、Ultra 和 free-tier individual accounts 停止得到服务；enterprise Code Assist license 与 API-key authentication 不受影响。见 [Gemini CLI Discussion #28017](https://github.com/google-gemini/gemini-cli/discussions/28017)。
- **截至 2026-09-02 更新的官方 deprecation page**：更精确地写明，consumer accounts 已不能用 `Login with Google` 访问 Gemini CLI 或 IDE extension；Standard / Enterprise 保持不变。见 [Gemini Code Assist consumer accounts deprecation](https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals)。
- **2026-09-01**：Gemini CLI 发布 [`v0.58.0`](https://github.com/google-gemini/gemini-cli/releases/tag/v0.58.0)。该版本仍把 `Sign in with Google`、Gemini API Key 和 Vertex AI 并列为认证选项，见 [`AuthDialog.tsx`](https://github.com/google-gemini/gemini-cli/blob/v0.58.0/packages/cli/src/ui/auth/AuthDialog.tsx#L45-L78)；类型仍定义 `LOGIN_WITH_GOOGLE = 'oauth-personal'`，见 [`contentGenerator.ts`](https://github.com/google-gemini/gemini-cli/blob/v0.58.0/packages/core/src/core/contentGenerator.ts#L63-L70)。

### 当前源码证据

`v0.58.0` 不只是遗留一个枚举：

- 认证对话框实际展示 `Sign in with Google`，并默认选中该项（在没有既存选择或 API key 时）；
- [`oauth2.ts`](https://github.com/google-gemini/gemini-cli/blob/v0.58.0/packages/core/src/code_assist/oauth2.ts#L75-L108) 仍包含 installed-app OAuth client、Cloud Platform / userinfo scopes 和成功/失败回跳；同文件后续仍实现本机 loopback 与手动 authorization-code flow；
- [`server.ts`](https://github.com/google-gemini/gemini-cli/blob/v0.58.0/packages/core/src/code_assist/server.ts#L72-L75) 把 Google-login 请求发往 `cloudcode-pa.googleapis.com` 的 internal Code Assist API，而非公开 Gemini Developer API。

因此，对“Gemini CLI 现在是否支持 Google 登录”必须带上主体：

- **对 consumer accounts：不支持产生模型请求，2026-06-18 起停服；**
- **对 Gemini Code Assist Standard / Enterprise：Google 明确称访问不变，客户端 OAuth 代码仍在；**
- **对 API-key 用户：这是另一条 Gemini Developer API 或 Vertex AI 路径，不是 Login with Google，也不继承 consumer account entitlement。**

### 官方文档漂移

Gemini CLI 的通用 [authentication setup](https://geminicli.com/docs/get-started/authentication/) 在 2026-08-17 的页面版本中，仍把 individual Google accounts（含 free、Google AI Pro / Ultra）列为 `Sign in with Google` 的推荐对象。这与 2026-09-02 更新的专门 deprecation page 及 2026-06-18 生效公告直接冲突。

这里应采用范围更具体、更新时间更晚的 deprecation page。通用认证页只能证明客户端入口和企业路径尚在，不能用来推翻 consumer cutoff。

## Gemini CLI OAuth：公开源码不等于第三方服务许可

Gemini CLI 是 Apache-2.0 开源软件；它的 installed-app OAuth client identity 也能在源码中看到。Google 的通用 OAuth 文档说明，desktop installed app 的 client ID（以及某些情况下的 client secret）会嵌入应用源码；这解释了为什么这些字节可以公开，见 [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2#installed)。它不构成让其它产品冒充该 OAuth client 的许可。

Google 在 Gemini CLI 自有文档中已消除这种歧义：[`v0.58.0` Terms / Privacy Notice](https://github.com/google-gemini/gemini-cli/blob/v0.58.0/docs/resources/tos-privacy.md#L3-L31) 明确区分开源 CLI 软件许可与底层 Google service 条款，并明确说第三方软件使用 Gemini CLI OAuth 直接访问 Gemini Code Assist 违反适用条款。该禁止说明于 **2026-02-27** 由 Google 仓库 commit [`83a3851`](https://github.com/google-gemini/gemini-cli/commit/83a3851dfd6a002ef4552d34cb6c4e76e0640b98) 加入。

通用 Google OAuth 规则也要求 OAuth consent branding 准确代表实际应用身份，并可能暂停冒充或欺骗用户的 app；Google APIs Terms 要求只能按 API 文档描述的方式访问，不能掩盖 API client identity。见 [OAuth 2.0 Policies（2026-08-05 更新）](https://developers.google.com/identity/protocols/oauth2/policies) 与 [Google APIs Terms, §2(c)](https://developers.google.com/terms#section_2_using_our_apis)。Google API Services User Data Policy 还明确禁止在没有许可的情况下使用 undocumented API，并要求所有授权请求准确表示请求数据的应用身份，见 [User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)。

所以，技术上照抄 client ID、scope、redirect flow 并向 internal Code Assist endpoint 发请求，不是 C05 可采用的合法 integration surface。

## Google Antigravity：产品身份、认证方式与第三方限制

Google 官方把 Antigravity 定义为 agent-first development platform；当前文档同时列出 Antigravity 2.0 desktop、Antigravity CLI、Antigravity SDK 和 IDE surfaces。它不是 Gemini Developer API 的别名。产品归属与迁移关系见 [Google 的 2026-05-19 公告](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/) 与 [Antigravity migration guide](https://antigravity.google/docs/cli/gcli-migration)。

官方 [Antigravity CLI Installation & Auth](https://antigravity.google/docs/cli/install/) 记录了三种不同事实：

- account-based 默认认证由官方 CLI 从 OS keyring 读取 session，缺少 session 时打开浏览器；
- SSH 场景使用 authorization URL + authorization code；
- Gemini API key 模式不建立 Antigravity account session，模型请求直接进入 Gemini API。

这证明 Antigravity 官方客户端确有 OAuth-like account flow，也证明 API-key 是独立且明确开放的接口路径。

第三方许可没有模糊空间：

- [Antigravity FAQ](https://antigravity.google/docs/faq#why-cant-i-use-third-party-software-eg-claude-code-openclaw-opencode-with-my-antigravity-login) 明确称使用第三方软件、工具或服务访问 Antigravity 违反 Terms，可能暂停或终止账户，并建议第三方 coding agent 改用 Vertex 或 AI Studio API key；
- [Google Antigravity Additional Terms of Service，第 6 条](https://antigravity.google/terms) 明确把第三方软件访问服务（例：`OpenClaw with Antigravity OAuth`）列为 breach；
- Google 自己提供的 [Antigravity SDK quickstart](https://antigravity.google/docs/sdk/overview) 使用 `GEMINI_API_KEY`；连接 Gemini Enterprise Agent Platform / Vertex 时使用用户自己的 Cloud project、location 和 `gcloud auth application-default login`，没有把 Antigravity account login 暴露成 SDK credential。

由此可以做出比“没有找到公开说明”更强的判断：**Antigravity OAuth 当前明确不准第三方工具使用。** 即使 reverse engineering、token 导入或模拟浏览器流程在技术上成功，也落在官方禁止范围内。

## 获准替代路径

### Gemini Developer API / AI Studio key

Gemini CLI 当前认证 UI 与文档仍支持 Gemini API key；Antigravity CLI 也提供显式 `modelProvider: "gemini"` + `GEMINI_API_KEY` 模式，并说明该模式直接访问 Gemini API、不建立 account session。它与 Google AI Pro / Ultra 的 consumer Login-with-Google entitlement 不同，quota、计费和条款由 key 所属 Gemini API project 决定。

这一路径符合 C04 已定的 API-key execution 边界，不需要 C05 增加 Google OAuth。

### Vertex AI ADC / OAuth

Google Cloud 官方 [Vertex AI Gemini quickstart](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart) 支持 API key 或 Application Default Credentials，并对本地 user credentials 明确使用 `gcloud auth application-default login`。通用 [ADC 文档](https://docs.cloud.google.com/docs/authentication/provide-credentials-adc) 说明 ADC 可供 Cloud client libraries、Google API client libraries 和 REST/RPC API 使用。

若本项目未来支持这条路径，它必须绑定用户自己的 Cloud project、IAM、billing/quota 和标准 API endpoint。它不应读取 Gemini CLI / Antigravity 的 token cache，也不应复用两者的 OAuth client identity 或 internal service endpoint。

## 对 C05 的直接建议

1. 从 C05 provider scope 删除 `Gemini CLI OAuth`，也不要用 `Antigravity OAuth` 替代它。
2. `pi-ai`、OMP 或其它上游包即使内置了这些 OAuth adapter，也不能成为准入依据；项目不得调用或复制其内置 client credentials、token cache 或 internal endpoint。
3. C04 继续承担 Gemini API-key execution。Google AI Studio key 和 Vertex AI key/ADC 必须在 UI、credential kind、错误和文档中与 consumer account login 分开命名。
4. 如果 MVP 必须有 Google 的 OAuth/user-login 体验，新增一个独立决策：是否接入 **Vertex AI ADC / project-bound user credentials**。它是公开 API auth 路径，但需要另外核查 Zotero browser boundary、Cloud project selection、IAM、quota project 与 token storage；不能借 C05 的 consumer OAuth 名称偷渡。

## 仍不确定但不影响本次结论的事项

- Google 的 consumer cutoff 是服务端 entitlement 变更；公开资料没有给出一个对应的 Gemini CLI code commit 或首个移除版本，因为直到 `v0.58.0` 客户端入口仍存在。
- Gemini CLI 通用认证页为什么在 2026-08-17 仍建议 consumer Login with Google，官方没有解释。它与专门 deprecation page 冲突，但不改变后者给出的明确停服日期和账户范围。
- Antigravity OAuth 的 client registration、token endpoint 和 wire protocol 没有面向第三方的官方 API 文档。本核查没有 reverse engineer 官方二进制，因为官方 Terms 已明确禁止目标用法，继续验证协议可复用性不会改变产品决策。
