# GitHub Copilot OAuth 第三方使用一手资料核查

核查日期：2026-09-03。本文为 Wayfinder C05 的 GitHub Copilot 认证范围提供事实底稿。许可判断只采用 GitHub / Microsoft 官方文档、条款、GitHub 官方仓库与 changelog；`pi-ai` 源码只用于确认候选 adapter 的实际行为，不能替 GitHub 作授权。

## 结论先行

1. **GitHub Copilot OAuth 可以保留，但必须改变实现边界。** GitHub 已明确允许第三方应用通过官方 Copilot SDK，把自己的 GitHub OAuth App 或 GitHub App 取得的用户 token 交给 SDK，并使用该用户的 Copilot entitlement。官方文档把 multi-user app、SaaS、ISV、partner integration 和 customer-facing feature 都列为适用场景。
2. **这与“任意第三方可直连 Copilot 内部接口”不是一回事。** 当前公开合同是 Copilot SDK / 官方 Copilot runtime（CLI server）及其公开 API。`/copilot_internal/v2/token`、Copilot proxy inference endpoint、裸 `/models` 与 model-policy endpoint 没有被 GitHub REST 文档发布为通用第三方模型 API。
3. **不得复制 GitHub 官方 Copilot client identity。** 正式路径要求本项目注册自己的 OAuth App / GitHub App。第三方没有公开授权去复制 Copilot CLI 或 VS Code extension 的 `client_id`、伪造 editor/plugin headers，或把自己标成 `vscode-chat`。官方 runtime 在内部使用 GitHub 自有身份不属于第三方复制。
4. **`pi-ai@0.84.4` 的 adapter 不能直接准入。** 它复制一个 GitHub 官方 client ID，声明 VS Code / Copilot Chat headers，直接交换 `copilot_internal` token、读取 proxy endpoint、列模型、改模型 policy 并直发兼容 OpenAI/Anthropic 的请求。该实现证明网络协议可被复现，不证明这一形态属于 GitHub 的公开第三方合同。
5. **C05 应保留产品能力、替换执行路径。** 可准入的是“GitHub Copilot subscription via official Copilot SDK/runtime”；不能准入的是“`pi-ai` native GitHub Copilot provider”。Zotero 插件环境不能直接运行 Node-only SDK，实际承载应放在 Host Bridge / native sidecar，或调用官方 Copilot runtime，而不是把 Node SDK 或私有协议塞进插件进程。

因此，对 C05 的最短决策是：**保留 GitHub Copilot OAuth，但限定为本项目自有 GitHub App/OAuth App + 官方 Copilot SDK/runtime；删除或禁用 `pi-ai` 的 GitHub Copilot OAuth、内部 token exchange、proxy/model 直连和 IDE identity spoofing。**

## 六类问题的状态

| 问题 | 截至 2026-09-03 的状态 | 对本项目的约束 |
| --- | --- | --- |
| 通用 GitHub OAuth / device flow | 公开支持；应用须先注册并为自己的 app 启用 device flow | 可以使用本项目自己的 client identity；device flow 只产生 GitHub user token，不自动把私有 Copilot endpoint 变成公开 API |
| 用户 Copilot subscription 用于第三方应用 | 官方 Copilot SDK 明确支持 | 通过 SDK 的 `gitHubToken` / per-session token 使用；按用户 entitlement、quota 和组织政策执行 |
| `copilot_internal` 与 proxy endpoints | 未列入公开 Copilot REST API；官方 SDK 将其封装在 runtime 后面 | 不把这些 URL、token 格式或 headers 作为本项目接口合同 |
| 官方 client ID / IDE 模拟 | 官方指南要求创建自己的 app；没有公开复用授权 | 不复制 client ID，不伪造 `GitHubCopilotChat`、VS Code 或 `vscode-chat` identity |
| token 导入 | 自有 app token 可传 SDK；SDK 可使用官方 CLI / `gh` 已登录 credential | 不扫描或搬运 VS Code / Copilot 私有 credential，不把内部短期 Copilot bearer token导入 `pi-ai` |
| Business / Enterprise | 同一 SDK 可用，但 seat、CLI/client policy、SSO、IP、模型政策与计费归属由服务端执行 | 认证成功不保证模型请求获准；必须把政策拒绝视为正常结果 |

## 时间线：此前需要谨慎，现在已有正式第三方入口

- **2026-01-14**：GitHub 发布 Copilot SDK technical preview，定位为对 Copilot CLI 的程序化访问。[GitHub changelog](https://github.blog/changelog/2026-01-14-copilot-sdk-in-technical-preview/)
- **2026-04-02**：进入 public preview，GitHub 明确称开发者可将 Copilot agent 能力嵌入自己的应用、工作流和平台服务；Copilot subscriber 的请求计入其用量。[GitHub changelog](https://github.blog/changelog/2026-04-02-copilot-sdk-in-public-preview/)
- **2026-06-02**：Copilot SDK **GA**。GitHub 称 API 已稳定、production-ready，可嵌入自己的 applications、services、developer tools，认证明确包括 GitHub OAuth 与 GitHub Apps；适用于所有现有 Copilot subscribers，包括 Copilot Free，非订阅用户可用 BYOK。[GA 公告](https://github.blog/changelog/2026-06-02-copilot-sdk-is-now-generally-available/)

GA 之后，旧的 preview-only 限制不再是整个 SDK 的当前状态；单独标成 experimental / preview 的能力仍需逐项核查。官方 SDK 仓库本身使用 [MIT License](https://github.com/github/copilot-sdk/blob/main/LICENSE)，但服务使用仍受 GitHub 账户、Copilot 和适用客户合同约束。

## 1. 通用 GitHub OAuth device flow 是开放的

GitHub 的 [Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps) 公开支持 authorization-code flow 和 OAuth 2.0 Device Authorization Grant。Device flow 面向 CLI、IoT 或无浏览器设备，应用需要：

1. 注册自己的 OAuth App 或 GitHub App；
2. 在该 app 设置中启用 device flow；
3. 用该 app 的 `client_id` 申请 device/user code；
4. 遵守服务端返回的轮询间隔和过期时间；
5. 最终得到代表用户的 GitHub access token。

这只回答“第三方应用能否让用户用 GitHub 登录”。GitHub 自己也说明 OAuth scope 只限制 token，不会授予用户本来没有的权限。[Building OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps) 因此，普通 device flow 成功不能单独证明 token 可访问任意 Copilot 后端；Copilot entitlement 与允许的调用表面还要看 Copilot SDK 文档。

GitHub 的安全建议是：新项目优先 GitHub App；公共 native client 更适合 authorization code + PKCE，device flow 只应在受限输入设备确有需要时启用。应用应安全保存 token、处理刷新/撤销，并尽量使用短期 token。[OAuth App best practices](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app)

## 2. 官方 Copilot SDK 明确允许第三方使用用户 subscription

当前 [Copilot SDK GitHub OAuth setup](https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth) 没有只暗示“可能可用”，而是直接规定：

- 第三方创建自己的 GitHub OAuth App 或 GitHub App；
- 用户授权后，应用得到 `gho_` 或 `ghu_` user token；
- 应用把 token 作为 `gitHubToken` 交给 `CopilotClient`，并关闭 logged-in-user fallback；
- Copilot requests 代表该用户执行，并使用该用户的 Copilot subscription；
- 适用场景包括 multi-user apps、internal tools、SaaS、个人账户、组织成员和 enterprise identity。

[Authentication](https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/authenticate) 还列出两种受支持的本机路径：SDK 可以使用官方 Copilot CLI 已登录并安全保存的 credential，也可以回退到 GitHub CLI credential。显式 user token、环境 token、官方 CLI credential 与 `gh` credential 都是 SDK 自己声明的认证来源。

所以，“第三方绝不能消费用户 Copilot entitlement”在当前已经不成立。GitHub 现在有明确的公开产品接口，而且不要求第三方伪装官方客户端。

### 可以导入什么 token

- **可以**：本项目自己的 OAuth App / GitHub App 通过用户明确授权得到的 `gho_` / `ghu_` token，交给官方 SDK。
- **可以**：用户显式配置受官方 CLI / SDK 支持的 fine-grained PAT；其账户和 `Copilot Requests` 权限仍由 GitHub校验。[Copilot CLI authentication](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli)
- **可以**：不导出 token，让 SDK 按文档使用已登录的官方 Copilot CLI / GitHub CLI credential。
- **没有公开支持依据**：扫描 VS Code 或 Copilot extension 的私有存储、解密别的应用 keychain、搬运 `copilot_internal` 返回的短期 bearer token，再交给自写 provider。

“SDK 能使用 stored credential”不等于“第三方可以随意提取并重新托管任何 GitHub 应用的 token”。对本项目，最小权限路径是自己的 OAuth App token；本机复用则交给官方 SDK/runtime 完成。

## 3. 内部 token、proxy 与 model catalog 不是公开第三方 REST API

GitHub 当前 [REST API endpoints for Copilot](https://docs.github.com/en/rest/copilot) 的公开目录把 REST API 定位为“monitor and manage GitHub Copilot”，列出 cloud-agent 管理、content exclusion、usage metrics 和 seat/user management。它没有发布以下接口的第三方请求/响应合同：

- `/copilot_internal/v2/token`；
- `api.individual.githubcopilot.com` 或 token 内 `proxy-ep` 指向的 inference endpoint；
- 裸 `/models` catalog；
- `/models/{id}/policy`；
- 模拟 OpenAI / Anthropic payload 直发 Copilot proxy 的规则。

官方 SDK 的架构是另一条路：各语言 SDK 通过 JSON-RPC 与官方 Copilot runtime / CLI server 通信，由 runtime 处理 Copilot service。[SDK repository README](https://github.com/github/copilot-sdk/blob/main/README.md) 模型能力也通过公开的 SDK `listModels()`、session model selection 与 send API 暴露；`listModels()` 返回 capabilities、billing 和 policy，而不是要求应用解析内部 catalog。[SDK and CLI compatibility](https://docs.github.com/en/copilot/how-tos/copilot-sdk/troubleshooting/compatibility)

这里应使用精确措辞：第一方资料没有逐字写“第三方调用这些 URL 违法”，因此本文不下这个法律结论；但它们**没有公开第三方 API 合同或兼容承诺**，而 GitHub 已提供正式 SDK。对于 provider admission，这足以排除以内部 URL、token 格式和客户端模拟为 SSOT 的实现。

`GITHUB_COPILOT_API_TOKEN` / `COPILOT_API_URL` 出现在 SDK credential priority 中，也不构成 consumer token minting API：官方认证文档没有告诉普通第三方怎样从用户 subscription 独立签发这类 direct API token。公开的用户路径仍是 GitHub user token交给 SDK/runtime。

## 4. 官方 client ID、token store 与 IDE extension identity

[Copilot SDK OAuth guide](https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth) 要求开发者创建自己的 OAuth App / GitHub App，并取得属于该 app 的 client ID。通用 OAuth 文档也说明每个已注册 app 有唯一 Client ID / Secret。[Authenticating with an OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authenticating-to-the-rest-api-with-an-oauth-app)

`client_id` 对公共客户端不是密码，技术上能被别人复制；GitHub甚至提醒公共 client ID 容易被 spoof。这是安全警告，不是使用授权。GitHub 没有公开允许第三方复用 Copilot CLI / VS Code Copilot 的 GitHub-owned client ID。复制后授权页和流量都归属于 GitHub 官方 app，用户看不到实际第三方身份。

同理，GitHub 官方 [multi-tenancy guide](https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/multi-tenancy) 要求 branded agent 使用自己的稳定 integration ID 做 attribution 和 routing；示例是 `my-product-agent`，不是伪装成 `vscode-chat`。因此 C05 应明确排除：

- 复制 GitHub-owned `client_id`；
- 自称 `GitHubCopilotChat`、伪造 `Editor-Version` / `Editor-Plugin-Version`；
- 使用 `Copilot-Integration-Id: vscode-chat` 代表非 VS Code 产品；
- 读取别的应用私有 credential store；
- 依据可观察 token 文本中的 `proxy-ep` 拼接服务地址。

没有找到一条逐字写着“不得复用公开 client_id”或“不得发送某个 editor header”的专项条款；以上准入判断来自官方规定的自有 app / integration identity 路径和缺少第三方授权，不应夸大成已经找到专项禁令。

## 5. 个人订阅、Business 与 Enterprise 的差异

### 个人账户

Copilot SDK GA 公告称 SDK 对所有现有 Copilot subscribers 开放，包括 Copilot Free；请求按账户计划和 allowance 计量。SDK OAuth guide 要求每位用户用自己的 GitHub account 授权，用量归该用户的 subscription。没有 entitlement、quota 已耗尽或模型不在计划内时，OAuth 成功仍可能无法完成模型请求。

个人用户的 AI Features 受 [GitHub Terms of Service, Section J](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#j-ai-features-training-and-your-data) 约束。GitHub API Terms 也明确覆盖“通过第三方产品访问 GitHub API”，禁止分享 token 来突破 rate limit。

### Business / Enterprise 与 EMU

用户 OAuth 路径相同，但服务端还会校验：

- 用户是否有有效 Copilot seat；
- 组织是否启用 Copilot CLI / 对应 client 使用；
- 目标模型是否被组织或 enterprise policy 允许；
- SAML SSO、IP restriction 和 enterprise managed-user 约束；
- content exclusion、data residency 与其它 managed settings。

SDK OAuth guide明确说 EMU 通过同一 OAuth 流程，enterprise policies 由 GitHub 自动执行。官方 CLI 认证页也说明，用户若从组织获得 Copilot，必须启用 Copilot CLI policy。[Copilot CLI authentication](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli) 因为 SDK runtime 建在 Copilot CLI runtime 上，把 CLI/client policy rejection 纳入 smoke test 是合理的工程要求。

Business / Enterprise 的使用受其购买渠道对应的客户合同与 [GitHub Copilot Product Specific Terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#github-copilot) 约束，不能把个人账户的数据和计费假设复制到企业账户。

### 企业服务对服务认证

这与用户 OAuth 是另一种 credential kind。官方 [Server-to-server authentication](https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/server-to-server-tokens) 允许组织启用 GitHub App installation requests：GitHub App 需要 `Copilot Requests: read & write`、当前要求 All repositories，短期 `ghs_` installation token 通过 runtime 环境传入，不能放进 SDK 的 user-level `gitHubToken`。用量归 app installation 所属账户/组织，不要求借某个用户的个人 subscription。

C05 若只做用户自带 subscription OAuth，无需把这条企业 automation 路径一起实现；未来需要时应另设 credential kind 和计费说明。

## 6. `pi-ai@0.84.4` 只能证明实现存在，不能作为准入证据

锁定包 [`@earendil-works/pi-ai@0.84.4`](https://registry.npmjs.org/@earendil-works/pi-ai/0.84.4) 的发布 tarball（`gitHead b79e4cc834970cca69daebffab7df1da7d1e52c4`）包含 [`src/auth/oauth/github-copilot.ts`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/auth/oauth/github-copilot.ts) 与 [`src/providers/github-copilot.ts`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/providers/github-copilot.ts)。它实际执行：

- 解码并使用一个内置 client ID，而不是要求集成方注册自己的 GitHub App；
- 发送 `GitHubCopilotChat`、VS Code、Copilot Chat plugin 与 `vscode-chat` integration headers；
- 只请求 `read:user`，随后直调 `api.github.com/copilot_internal/v2/token`；
- 解析短期 token 中的 `proxy-ep`，自行选择 `api.individual.githubcopilot.com` 等 base URL；
- 直接调用 `/models` 和 model-policy endpoint；
- 用内置 OpenAI completions / responses 或 Anthropic Messages client 直接向 Copilot proxy 发请求；
- 自己保存 GitHub refresh token与短期 Copilot token。

它没有使用 `@github/copilot-sdk`、官方 Copilot runtime 或 SDK JSON-RPC contract。虽然第三方应用使用 Copilot entitlement 这件事已经获官方支持，这个特定实现仍不满足公开路径：

- 上游包是第三方项目，不是 GitHub partner approval；
- GitHub SDK GA 只证明正式 SDK路径可用，不能追认所有历史 reverse-engineered adapter；
- 可成功返回 token/model/response 不等于 GitHub 承诺该 endpoint、header 或 token format；
- 伪装官方 client 和 IDE identity 违背官方自有 app / integration attribution 的设计；
- enterprise routing、policy、data residency 和 model availability 都可能随服务端改变，`pi-ai` 的字符串协议会成为脆弱依赖。

因此，`pi-ai@0.84.4` 不是 C05 provider admission 的正面证据。它反而明确展示了本项目应避免的实现边界。

## Zotero / no-Node 架构影响

官方 TypeScript SDK 是 Node SDK，当前要求 Node.js `^20.19.0` 或 `>=22.12.0`；managed child-process transport 会物化并启动 bundled `copilot-runtime` / `runtime.node`。[Node SDK README](https://github.com/github/copilot-sdk/blob/main/nodejs/README.md) 它不能被直接 import 到 Zotero plugin runtime，本项目“不得把 Node-only code 放入插件环境”的约束仍成立。

这不影响产品准入，只影响承载位置：

- 插件只保留认证 UI、credential handle 与 provider/session projection；
- 官方 Copilot SDK/runtime 放到 Host Bridge、native sidecar 或另一个明确的外部执行进程；
- 优先使用 SDK 的 `mode: "empty"` 和显式 tool allowlist，避免把 Copilot CLI 默认主机工具暴露给插件会话；
- 每位用户/租户使用独立 token 与 session ownership；多租户要求见 [官方 multi-tenancy guide](https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/multi-tenancy)；
- 若选 Node SDK，按它支持的 Node 版本部署；若已有 Rust native boundary，可另行评估官方 Rust SDK，但不要因此把本票扩大成运行时重构。

当前 C05 不需要同时实现官方 SDK 的完整 agent/tool surface。最小可行路径是让外部 host 持有官方 runtime，只向插件投影本项目需要的 model listing、message/session 与取消/错误语义。

## 对 C05 的直接建议

1. 保留 provider 选项，但名称和验收改成 **GitHub Copilot via official SDK/runtime**，不要写成泛化的“任意 Copilot OAuth adapter”。
2. 注册 Zotero Agents 自己的 GitHub App 或 OAuth App；用户明确授权后，只把 user token交给官方 SDK。优先 GitHub App；若无浏览器/受限输入场景确需 device flow，再为自己的 app 启用它。
3. 不复制 GitHub 官方 client ID，不读取 VS Code/Copilot 私有 credential store，不伪造 IDE headers，不解析 `proxy-ep`，不直接调用 `copilot_internal`、proxy `/models`、policy 或 inference endpoints。
4. 删除/禁用 `pi-ai` GitHub Copilot provider 的 login、token refresh、model catalog、policy enable 与 direct stream path；`pi-ai` 可以继续承载其它已准入 provider，但不能借官方 SDK GA 为这个 adapter 背书。
5. C05 smoke 至少分个人与组织账户：自己的 OAuth App token能否创建 SDK session；无 entitlement；quota exhausted；CLI policy disabled；model policy disabled；SSO/IP/data-residency rejection。不要把具体错误全文锁成测试契约。
6. 插件进程不引入 Node SDK。正式实现前单独敲定外部 host 形态、官方 runtime 的分发许可/更新方式和 token ownership。

## 仍不确定但不影响准入结论

- Copilot SDK OAuth guide没有给普通 OAuth App 写出一个唯一的“最小 scopes”集合；示例直接使用标准 user token。实现前应以本项目实际注册的 GitHub App permissions 做最小权限 smoke，而不要沿用 `pi-ai` 的 `read:user` 假设。
- 第一方资料没有逐字发布“禁止复用 GitHub-owned client ID”或“禁止某个 IDE header”的专项条款。可以确认的是：官方支持路径要求自己的 app / integration identity，复制官方身份没有授权也没有必要。
- 公开材料不能证明所有 `copilot_internal` 请求都一定会被服务端拒绝；本文的结论是它们没有公开第三方合同，不能作为可发布 provider 的依赖。
- SDK 与 CLI 的企业 policy 关系主要由共享 runtime和官方 CLI policy说明推得；目标 Business / Enterprise tenant仍需 smoke，尤其是 EMU、data residency、SSO/IP restriction 与 model policy。
- 官方 Node SDK/runtime如何随 Zotero Agents 分发、自动更新及满足 Copilot runtime 自身 notices，需要在选定 host 方案后单独做发布审查。本核查只决定 OAuth/provider 准入，不替代分发许可审查。

本文是产品和工程准入判断，不是法律意见。若计划在 GitHub SDK 公开合同之外复用内部 endpoint 或官方 client identity，应先取得 GitHub 的书面授权；目前没有这样做的工程必要。
