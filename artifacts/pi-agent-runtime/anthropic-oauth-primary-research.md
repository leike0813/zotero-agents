# Anthropic / Claude OAuth 第三方使用一手资料核查

核查日期：2026-09-03。本文为 Wayfinder 中 C05 的 Anthropic 认证范围提供事实底稿。许可判断只采用 Anthropic / Claude 官方文档、帮助中心和条款；`pi-ai` 源码只用于确认候选包实际包含什么，不能证明 Anthropic 授权了该用法。

## 结论先行

1. **官方 Claude Code 的订阅登录仍可用。** Claude Code 当前允许 Pro、Max、Team 和 Enterprise 用户用自己的 Claude 账户完成 OAuth 登录；官方认证文档还提供 `claude setup-token`，供 Claude Code 的 CI、脚本和其承载面使用。这证明 Anthropic 没有全面关闭 Claude OAuth。
2. **第三方产品不能因此复用 Claude Code OAuth。** Anthropic 当前明确禁止第三方开发者在自己的应用中提供 Claude.ai 登录，也禁止代表用户把请求路由到 Free、Pro 或 Max 凭据；第三方开发者还不得收集、保存或中转 Claude.ai credential/session token。登录必须在 Anthropic 自己的流程中完成。
3. **存在一个很窄的官方例外，但不适用于本项目拟议的 native provider adapter。** 第三方平台可以原样预装或运行 Anthropic 发布的、未修改的 Claude Code binary，让每位终端用户直接在该 binary 中用自己的凭据登录和结算；平台不得修改 binary、代付、转售或中转 Claude 用量。Zotero 内嵌 `pi-ai` model stream 并自己执行 OAuth、保存 token、直连 Anthropic endpoint，不属于这个例外。
4. **Agent SDK、`setup-token` 和 2026 年 6 月的 subscription-credit 公告都不是通用的第三方 OAuth 准入。** Agent SDK 当前文档仍写明：除非事先获得批准，第三方产品必须使用 API key，不得提供 Claude.ai login 或 subscription rate limits。`setup-token` 是 Claude Code 官方认证面生成的 token，并未开放第三方 OAuth client registration。2026-06-15 曾计划调整 Agent SDK/第三方应用计费，但当天暂停；暂停公告只描述用量从哪里扣除，没有撤销认证限制。
5. **C05 不应包含 `Anthropic Claude OAuth`。** C04 保留 Anthropic API-key execution。若将来接入公开支持的企业认证，应按 Claude Platform API 的 Workload Identity Federation、App Attest 或 Bedrock / Google Cloud / Microsoft Foundry 另行立项，不能把它们命名成 Claude subscription OAuth。

因此，用户关于“Anthropic 已禁止第三方 OAuth”的实质判断是对的；更精确的说法是：**Anthropic OAuth 仍服务于官方 Claude Code 等受支持表面，但第三方应用不能自行复用 Claude Code OAuth client、token、consumer subscription entitlement 或内部请求形态。**

## 四类场景必须分开

| 场景 | 截至 2026-09-03 的官方状态 | 对 Zotero Agents 的意义 |
| --- | --- | --- |
| 用户在官方 Claude Code 登录 | 支持 Pro / Max / Team / Enterprise；由官方 CLI 发起并保存登录 | 不等于第三方获得 OAuth client 权利 |
| 第三方原样托管 Claude Code binary | 有条件允许：binary 未修改、保留全部认证方法、每位用户自行认证和结算、平台不代付/转售/中转用量 | 若本项目未来单独托管官方 binary，可另行评估；不是 native `pi-ai` provider |
| 第三方应用自己提供 Claude.ai 登录或导入 token | 明确不允许，除非事先获得 Anthropic 批准；不得收集、保存或中转 Claude.ai credential/session token | C05 不能实现该 adapter，也不能从 Claude Code credential store 导入 token |
| 第三方产品调用 Claude API / Agent SDK | 公开默认路径是 Claude Console API key 或受支持云 provider；API 另支持 WIF、App Attest 等商业认证 | 由 C04 API-key 路径承担；企业认证应另定范围 |

## 官方 Claude Code 的 OAuth 仍然存在

[Claude Code Authentication](https://code.claude.com/docs/en/authentication) 当前明确列出：

- Pro 或 Max 用户可以用 Claude.ai account 登录；
- Team 或 Enterprise 用户可以用组织邀请的 Claude.ai account 登录；
- Console、Amazon Bedrock、Google Cloud 和 Microsoft Foundry 是另外的认证路径；
- credential precedence 中，`CLAUDE_CODE_OAUTH_TOKEN` 和 `/login` 产生的 subscription OAuth credential 都仍是受支持来源。

同页的 `claude setup-token` 说明，Pro、Max、Team 或 Enterprise 用户可生成一年期、仅 inference scope 的 token，用于 CI、脚本等无法打开浏览器的 Claude Code 场景。官方 [Team / Enterprise 帮助文档](https://support.claude.com/en/articles/11845131-use-claude-code-with-your-team-or-enterprise-plan) 也要求用户在 Claude Code 中选择 “Claude account with subscription”，然后在 Anthropic OAuth 页面授权。

所以，“Anthropic 关闭了 Claude OAuth”不成立。关闭与否的主体很重要：官方 Claude Code 可以用；第三方产品自行仿制或嵌入该登录流程则受下面的限制。

## Anthropic 对第三方的当前明确限制

[Claude Code Legal and compliance：Authentication and credential use](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use) 给出了最直接的产品规则：

- OAuth authentication 面向订阅购买者，用于 Claude Code 和其它 Anthropic 原生应用的正常使用；
- 构建产品或服务的开发者，包括使用 Agent SDK 的开发者，应使用 Claude Console API key 或受支持 cloud provider；
- Anthropic 不允许第三方开发者在自己的应用中提供 Claude.ai login，或代表用户将请求路由到 Free、Pro、Max plan credentials；
- 开发者不得收集、保存或中转 Claude.ai credential/session token；
- Anthropic 可以在不事先通知的情况下执行这些限制。

同页同时说明一个有限例外：第三方产品可以预装或运行**未经修改的官方 Claude Code binary**，但必须保留其全部认证方式，每位终端用户用自己的 API key、Claude subscription credential 或云 provider credential 登录并直接结算；平台不能代付、转售或中转 Claude 用量。这个例外的 owner 是官方 binary 及其官方登录面，不会覆盖第三方自己写的 provider/OAuth adapter。

[Log in to your Claude account](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account)（页面显示 2026-05-19 更新）进一步区分原生应用与第三方工具：subscription usage 为 Claude web、desktop、mobile 和 Claude Code 等原生 Anthropic 应用的正常使用而设计；第三方软件、工具、服务（包括开源项目）的首选路径是 Claude Console API key 或受支持 cloud provider。Anthropic 可酌情允许开启 usage credits 的付费订阅者使用某些第三方工具，并可让这类请求从 usage credits 而非 subscription limits 扣除，但以下行为明确禁止：

- 冒充其它应用身份；
- 试图让第三方流量消耗 subscription limits；
- 违反适用条款或政策。

这里的 “may at its discretion allow certain third-party tools” 不是公开 client registration、稳定 API 合同或自动准入。没有 Anthropic 的明确批准，C05 不能据此发布 OAuth 选项。

## `setup-token` 与 Agent SDK 为什么不改变结论

### `claude setup-token`

`setup-token` 能生成 OAuth token，只说明 Anthropic 允许官方 Claude Code 在 CI / script 环境无浏览器认证。该 token 的名称、scope 和 credential precedence 都写在 Claude Code 文档中；文档没有开放让任意第三方复制 Claude Code client identity、在自己的 UI 中发起登录或接管 token 生命周期的注册流程。

更关键的是，Legal and compliance 页同时规定第三方不得收集、保存或中转 Claude.ai token。Zotero 插件若把该 token 写入自己的 Credential Store，再由 native `pi-ai` 直接调用 Anthropic，就落在明示限制之内，不能靠 `setup-token` 的存在获得授权。

### Claude Agent SDK

[Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview#get-started) 当前明确写明：除非事先批准，Anthropic 不允许第三方开发者为产品提供 Claude.ai login 或 subscription rate limits，应使用 quickstart 中的 API-key 认证。该页也说明 Agent SDK 的商业使用受 [Anthropic Commercial Terms](https://www.anthropic.com/legal/commercial-terms) 约束；Commercial Terms 允许客户用商业服务为自己的用户提供产品，但其前提是使用这些 Terms 实际覆盖的商业服务和获准认证，并不把消费订阅 credential 变成 API credential。

Anthropic 帮助中心在 [Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) 记录了一次尚未落地的计费变动：

- 原计划自 **2026-06-15** 起，让 Agent SDK、`claude -p` 和通过 Agent SDK 认证的第三方应用改用单独月度 credit；
- **2026-06-15** 更新宣布暂停该变化；页面日期为 **2026-06-16**；
- 暂停期间，上述用量仍从 subscription usage limits 扣除。

这段公告与当前 Agent SDK/Legal 文档合读，含义是“Anthropic 的某些官方 SDK 承载场景当前怎样计量”，不是“任何第三方产品都能内嵌 Claude.ai OAuth”。页面保留下来的旧计划还要求通过 Agent SDK；它也没有授权第三方绕过 SDK，以 Claude Code client identity 直接访问 Anthropic endpoint。

## 第三方集成的公开认证路径

[Claude Platform Authentication](https://platform.claude.com/docs/en/manage-claude/authentication) 当前列出的 API 认证方式是：

- Claude Console API key：个人开发可用 personal key，共享或无人值守 workload 应用 service-account key；
- Workload Identity Federation：工作负载用自己的 IdP identity token 向公开的 `/v1/oauth/token` 交换短期 Claude API token；
- App Attest：注册的 iOS/macOS app 证明是真实安装后取得短期、workspace-bound Messages API token。

Claude Code / Agent SDK 还支持 Amazon Bedrock、Google Cloud、Microsoft Foundry 等 provider credential。这里虽然有 OAuth token exchange 或 user OAuth profile 等机制，但对象是 Claude Platform 商业 workspace、受支持 workload 或官方 CLI profile；它们不消费 Claude.ai Pro/Max subscription entitlement，也不授权第三方复用 Claude Code consumer client。

对当前票面，最小且稳妥的范围是：

- C04 保留 Anthropic Messages API + API key；
- C05 删除 Anthropic Claude subscription OAuth；
- 不读取 Claude Code credential store，不接受 `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_OAUTH_TOKEN` 作为 consumer subscription credential，也不复制 Claude Code client ID、scope 或内部 header；
- 如以后需要 WIF、App Attest 或云 provider，按独立 credential kind、计费主体和 browser/host boundary 再决策。

## `pi-ai@0.84.4` 不能作为准入依据

锁定包 [`@earendil-works/pi-ai@0.84.4`](https://registry.npmjs.org/@earendil-works/pi-ai/0.84.4) 的发布 tarball（`gitHead b79e4cc834970cca69daebffab7df1da7d1e52c4`）确实包含 [`auth/oauth/anthropic.ts`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/auth/oauth/anthropic.ts)，并把它描述为 Claude Pro/Max OAuth。实现使用 Claude Code client identity、Claude.ai authorize endpoint、Claude Platform token endpoint和 Claude Code scopes，并由调用方保存和刷新 token。

这只能证明第三方代码曾实现该协议，不能证明 Anthropic 允许它：

- `earendil-works/pi` 不是 Anthropic 官方认证文档或 partner approval；
- 可观察的 client ID、endpoint、scope 或成功响应不等于第三方使用许可；
- 该实现让第三方应用发起 Claude.ai login、保存 token 并把请求路由到 subscription credential，正是 Anthropic 当前文档明示限制的组合；
- 上游实现现在能否连通也不是可靠门禁。Anthropic 明确保留无预告执行限制的权利，服务端随时可以按 client/surface、header、scope 或计费归属改变行为。

因此，C05 不能因为 `pi-ai` 已内置 adapter 就直接准入、复制或封装它。唯一可能改变这一结论的证据，是 Anthropic 针对本项目或一类公开第三方客户端给出的明确批准/公开注册合同。

## 时间线与证据限度

- **2025-06-17**：当前 [Commercial Terms](https://www.anthropic.com/legal/commercial-terms) 生效；它允许商业客户用受条款覆盖的服务为自己的用户构建产品，并不授权消费订阅 OAuth。
- **2025-10-08**：当前 [Consumer Terms](https://www.anthropic.com/legal/consumer-terms) 生效；它禁止分享账户登录/API key/credential，并禁止在没有 API key 或其它明确许可时进行自动、非人工访问。
- **2026-05-19**：当前登录帮助页显示的更新日期；其中已明确 native-app subscription usage、第三方 API-key 首选路径和违规第三方流量边界。
- **2026-06-15 / 2026-06-16**：Agent SDK monthly-credit 改动在计划生效日暂停；帮助文章次日标注日期并保留原计划供参考。
- **截至 2026-09-03**：Claude Code Legal、Authentication 和 Agent SDK 文档均仍维持第三方 login/rate-limit 限制，同时保留官方 Claude Code subscription login。

本次只检索到当前官方页面和上述带日期的官方更新，没有找到 Anthropic 公开的、可精确定位“首次禁止第三方复用 Claude Code OAuth”的历史公告或源码 commit。因此可以确认当前禁令和至少 2026-05-19 已公开写明的状态，但不能仅凭第一方材料证明它最早从哪一天开始；“很久以前”不宜写进票面作为精确历史事实。

## 对 C05 的直接建议

1. 从 C05 删除 `Anthropic Claude OAuth`；连同 Claude Code client/token import、refresh 和 subscription smoke 一并删除。
2. C05 若继续存在，只保留经各 provider 官方文档明确开放给第三方应用的 OAuth 路径；不能以“上游能跑”代替服务许可。
3. C04 继续提供 Anthropic API-key execution。未来的 WIF / App Attest / cloud-provider auth 是商业 API 认证，不与 consumer OAuth 共用 credential kind 或 UI 名称。
4. 若产品目标必须让用户用 Claude subscription，唯一当前有明确文档边界的形态是运行**未修改的官方 Claude Code binary**并让用户直接向它登录；这会改变本项目的 runtime/provider 架构，应另开票讨论，不能塞进 native `pi-ai` execution。

## 仍不确定但不影响本次结论

- Anthropic 没有在本次找到的第一方历史材料中公布第三方 consumer OAuth 禁令的最初发布日期；当前文档足以决定 C05，但不足以给“很久以前”附上精确日期。
- 2026-06-15 暂停的 Agent SDK credit 方案何时、以什么形式恢复，官方只说未来变更会在生效前公布。
- 帮助中心提到 Anthropic 可酌情允许 “certain third-party tools”，但没有公开 allowlist、申请接口或通用 client registration。没有书面批准时，不能假设本项目在该范围内。
- 本文是产品与工程准入判断，不是法律意见。若要依赖 Anthropic 的个别批准，应让 Anthropic Sales/Legal 书面确认具体产品、认证流、token ownership、计费来源和终端用户场景。
