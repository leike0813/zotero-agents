# OpenAI Codex OAuth 生态采用与支持方向研究

核查日期：2026-09-03  
问题：`pi-ai@0.84.4` 的 Codex/ChatGPT subscription OAuth 是否只是未经授权的私有接口复用；`oh-my-pi`（OMP）与 OpenCode 是否实施同类方案；这对 C05 的准入、安全与维护判断意味着什么。

## 结论

**先前“没有面向第三方的官方公开稳定合同，所以 C05 不应进入 MVP”的结论需要收窄。** 现在有很强的一手证据表明：OpenAI 的 Codex 负责人 Tibo（`@thsottiaux`）在 2026-01-09 公开说 OpenAI 正与 OpenCode 合作，让 Codex 用户可在 OpenCode 中直接使用订阅和用量；当天 OpenCode 将这项能力合入 core，当前仍作为内置功能维护。次日 Tibo 又表示会以与 OpenCode 相同的方式优先支持开源 coding agents/tools，并点名正在与 Pi 洽谈。

这足以支持以下较窄的产品判断：**面向用户主动登录、以真实客户端身份使用其本人的 Codex subscription 的 C05，是 OpenAI 明确支持方向下的兼容集成；它不是应当从 MVP 删除的“无依据绕过”。** 同时，它不是可从 OAuth/OpenAPI 文档独立推导的公开 SDK 合同，也不能转化为“任意第三方复制协议均获授权”或“没有风险”。

对本项目最小、可行的路线仍是 device-code：它不需要 Node HTTP callback 或 `node:crypto`。三套实现都显示此路线可行；Zotero 只需用 `fetch`、`setTimeout`、`atob`/base64url 解码和受控凭据存储实现协议的必需部分。不要直接依赖或搬运 Node/Bun 包。

## 证据边界与判定语言

| 结论层次 | 本次能证明什么 | 不能证明什么 |
| --- | --- | --- |
| OpenAI 支持方向 | Codex 负责人对 OpenCode 的直接公开表态，及后续 OSS 扩展方向；官方 Codex app-server 也把 ChatGPT managed auth 列为推荐模式。 | 单凭 X 帖子不能生成一份可版本化、可独立调用的第三方 OAuth API 规范。 |
| 产品采用 | Pi、OMP、OpenCode 均使用同一 OpenAI client id、OAuth/device-code/token 路径和 ChatGPT Codex backend；OpenCode/OMP 是持续发布的主产品能力。 | 三个开源项目的采用本身不构成 OpenAI 服务许可。 |
| 技术可行 | device-code 无须 localhost listener；OpenCode 明确提供 headless path，OMP 同样实现。 | 原样复制代码即可适用于 Zotero；Node/Bun 的等待、二进制解码、持久化仍须替换。 |
| 安全 | 每个实现均以短期 access + 长期 refresh token、account id 与过期刷新为核心；OpenCode 将本地文件设为 `0600`。 | 其各自存储实现可直接成为 Zotero 的安全标准；长期 refresh token 仍属于高价值凭据。 |
| 稳定性 | 官方客户端、OMP、OpenCode 正在维护同一 wire shape；OpenCode 的多次后续修复显示其真实使用。 | endpoint/header/scope 永不变，或 Zotero 不需要版本观测与失效恢复。 |

尤其不能采用逻辑谬误“没有发现禁止，所以已获允许”。本次正面依据来自 OpenAI 负责人的明确支持表态和官方 runtime 的公开方向；**未发现禁止**只是不再额外提供反证，不能单独成为准入理由。

## OpenAI 的一手支持信号与正式合同

### 2026-01-09/10 的公开表态

1. Tibo（OpenAI Codex 负责人）的 [X 原帖 oEmbed，2026-01-09](https://publish.twitter.com/oembed?url=https%3A%2F%2Fx.com%2Fthsottiaux%2Fstatus%2F2009742187484065881) 原文：

   > “We are working with OpenCode to allow Codex users to use their Codex subscriptions and usage limits in OpenCode directly. Also exploring how to support other awesome actors in the space.”

2. Tibo 的 [X 原帖 oEmbed，2026-01-10](https://publish.twitter.com/oembed?url=https%3A%2F%2Fx.com%2Fthsottiaux%2Fstatus%2F2010064438033104966) 原文开头：

   > “Codex ❤️ OSS. Over the coming days we are prioritizing working with open source coding agents and tools to support them in the same way as OpenCode …”

   oEmbed 的正文在省略处截断，但该原帖是可验证的第一方帐号内容；不得把截断后未显示的部分当作原话引用。

两条并非 API reference 或可执行合同，且第一条措辞是 “working with” 而不是“所有实现已无限期批准”。不过它直接覆盖了本票关心的“OpenCode 里使用 Codex subscription/usage limits”方向，远强于仅凭社区项目“能跑”的推断。

### OpenCode 的同日合入与当前维护

- OpenCode 的 [PR #7537](https://github.com/anomalyco/opencode/pull/7537) `feat: codex auth support` 于 **2026-01-09 23:47:37 UTC** 合并，merge commit 为 [`172bbdac`](https://github.com/anomalyco/opencode/commit/172bbdaced3e87d747f637ec988970ae820a614f)。这与上述公开表态同日发生，是强时间相关证据；但没有 PR 评论证明每一行代码由 OpenAI 审核，故不得夸大为“该 commit 得到逐行官方认证”。
- 当前稳定 release [`v1.18.27`](https://github.com/anomalyco/opencode/releases/tag/v1.18.27) 指向 [`4b7e19e`](https://github.com/anomalyco/opencode/tree/4b7e19e315cca414121ba1d61523fef74bb3ae8b)，当前 `dev` 在核查时为 [`f12e14c`](https://github.com/anomalyco/opencode/tree/f12e14cf1640cbf0dfb6b1ff425b2daaef459eec)。两者都有 core 内置的 [`packages/opencode/src/plugin/openai/codex.ts`](https://github.com/anomalyco/opencode/blob/4b7e19e315cca414121ba1d61523fef74bb3ae8b/packages/opencode/src/plugin/openai/codex.ts)，不是要求用户另装的第三方插件。
- OpenCode 自己的 [provider 文档](https://github.com/anomalyco/opencode/blob/f12e14cf1640cbf0dfb6b1ff425b2daaef459eec/packages/web/src/content/docs/providers.mdx#L1773-L1807) 把 ChatGPT Plus/Pro browser OAuth 作为用户可用能力。它是 OpenCode 的产品承诺，不能替代 OpenAI 的服务条款或 API 合同。

### 官方 Codex runtime 的正式合同仍与 direct adapter 不同

官方 [`codex app-server` README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md#authentication-modes) 规定 `chatgpt` / `chatgptDeviceCode` 是 **Codex managed**：Codex 自己持有、持久化并刷新 token；并要求接入方通过 [`initialize.clientInfo`](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md#initialization) 标明身份，企业集成联系 OpenAI 加入 known-clients list。官方 [auth protocol](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/auth.rs) 也清楚区分 `Chatgpt`（Codex managed）和 `ChatgptAuthTokens`（外部 host 提供）。

因此 C05 的准确名称不应是“OpenAI 公共 OAuth API provider”，而应是：**OpenAI Codex subscription compatibility auth（基于 OpenAI 已公开支持方向的 direct flow）**。若未来需要企业合规、SLA 或明确稳定接口，应该走 app-server/known-client 方案；这不是 C05 的最小路线。

## 三个开源实现的可重复核查

所有源码链接均固定到下列版本/commit。字段“相同”只描述实现观察，不推导服务授权。

| 项目 | 固定来源与采用度 | authorize / device / token | token 与请求 | browser runtime 结论 |
| --- | --- | --- | --- | --- |
| `@earendil-works/pi-ai@0.84.4` | npm `gitHead` [`b79e4cc`](https://github.com/earendil-works/pi/tree/b79e4cc834970cca69daebffab7df1da7d1e52c4)，MIT。 | client id `app_EMoamEEZ73f0CkXaXp7hrann`；`auth.openai.com/oauth/authorize`、`/oauth/token`；browser callback `http://localhost:1455/auth/callback`；device routes `/api/accounts/deviceauth/{usercode,token}`。 | access/refresh/expires/account id 由应用 credential store 持有、刷新；[`provider`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/providers/openai-codex.ts) 直连 ChatGPT backend。 | 原 login 模块引用 `node:crypto` 与 `node:http`，不能原样用于 Zotero；device protocol 本身不要求 callback listener。 |
| OMP `v18.1.6` | release tag 固定到 [`d2d2c17`](https://github.com/can1357/oh-my-pi/tree/d2d2c17368c5078c33f502476876c77574400675)，发布于 2026-09-03。README 将 OpenAI Codex `oauth` 列为 Frontier API。 | [`registry rule`](https://github.com/can1357/oh-my-pi/blob/d2d2c17368c5078c33f502476876c77574400675/packages/catalog/src/compat/rules/auth/openai-codex.kdl)：同 client id、PKCE、authorize/token；scope 多出 `api.connectors.read` / `api.connectors.invoke`；固定 localhost `1455`，注释称该 URI 被 allowlist。[`device implementation`](https://github.com/can1357/oh-my-pi/blob/d2d2c17368c5078c33f502476876c77574400675/packages/ai/src/registry/oauth/openai-codex.ts) 使用同一 device endpoints 及 `https://auth.openai.com/deviceauth/callback`。 | 凭据文档说持久化到 `~/.omp/agent/agent.db`，按需 refresh、按 workspace/account 区分；[`wire constants`](https://github.com/can1357/oh-my-pi/blob/d2d2c17368c5078c33f502476876c77574400675/packages/catalog/src/wire/codex.ts) 固定 `https://chatgpt.com/backend-api`、`chatgpt-account-id`、`originator: pi`。 | device path 没有 localhost server，但现成实现用了 `Bun.sleep`、`Buffer`，必须最小替换，不能直接 import。 |
| OpenCode `v1.18.27` / current dev | [`v1.18.27`](https://github.com/anomalyco/opencode/tree/4b7e19e315cca414121ba1d61523fef74bb3ae8b)；current dev [`f12e14c`](https://github.com/anomalyco/opencode/tree/f12e14cf1640cbf0dfb6b1ff425b2daaef459eec)。由同日 PR #7537 起始，后续持续修复 model、residency、WebSocket 等兼容问题。 | [`codex.ts#L10-L149`](https://github.com/anomalyco/opencode/blob/f12e14cf1640cbf0dfb6b1ff425b2daaef459eec/packages/opencode/src/plugin/openai/codex.ts#L10-L149)：相同 client id/issuer/backend；browser PKCE、scope `openid profile email offline_access`、originator=`opencode`；[`#L467-L548`](https://github.com/anomalyco/opencode/blob/f12e14cf1640cbf0dfb6b1ff425b2daaef459eec/packages/opencode/src/plugin/openai/codex.ts#L467-L548) 是 headless device code。 | [`#L345-L434`](https://github.com/anomalyco/opencode/blob/f12e14cf1640cbf0dfb6b1ff425b2daaef459eec/packages/opencode/src/plugin/openai/codex.ts#L345-L434)：refresh 后写回 access/refresh/expires/account id，把 `/v1/responses`/`/chat/completions` 改写为 `/backend-api/codex/responses`，发送 bearer、`ChatGPT-Account-Id` 与 residency header；[`#L556-L564`](https://github.com/anomalyco/opencode/blob/f12e14cf1640cbf0dfb6b1ff425b2daaef459eec/packages/opencode/src/plugin/openai/codex.ts#L556-L564) 发送 `originator: opencode`。 | device path无 localhost callback；实现中 `node:timers/promises` 和 `Buffer` 可分别换成 `setTimeout`、`atob`。它的 [`auth store`](https://github.com/anomalyco/opencode/blob/f12e14cf1640cbf0dfb6b1ff425b2daaef459eec/packages/opencode/src/auth/index.ts#L10-L89) 是 `auth.json` + 0600，不应直接照抄为 Zotero 的安全模型。 |

### 共同的实际 wire shape

1. 使用官方 Codex 源码也公开的 client id `app_EMoamEEZ73f0CkXaXp7hrann`（[官方常量](https://github.com/openai/codex/blob/main/codex-rs/login/src/auth/manager.rs#L1707-L1715)）。
2. browser flow：authorization code + PKCE；device flow：请求 user code、用户在 `https://auth.openai.com/codex/device` 完成授权、轮询取得一次性 code/verifier、再通过 `/oauth/token` 换 access/refresh token。
3. stream：以 JWT claim 获得 workspace `chatgpt_account_id`，向 `https://chatgpt.com/backend-api/codex/responses` 发送 bearer 和 account header。三者都使用自身真实的 `originator`（`pi` 或 `opencode`），没有伪装成官方 Codex CLI。

这说明 C05 面对的是一个被多个维护型项目验证过的 **兼容协议族**，不是 Pi 私有的独创方案。反过来，OMP 已将 scope、headers、WebSocket、workspace identity 等问题持续修复；这就是必须把 C05 设计为可观测、可禁用的兼容层的理由。

## 服务条款、禁止证据与账户风险

### 找到的官方约束

OpenAI [Terms of Use](https://openai.com/policies/terms-of-use/) 禁止共享账户凭据/让他人使用账户，禁止绕过 rate limit、限制或保护措施，并禁止反向工程服务的底层组件。这些约束仍适用于 C05：

- 每个用户只连接自己的账号；不得把 subscription token 变成代理服务、共享给其他用户或转售。
- 不实现多账号轮换以规避用量限制，不伪造 `originator`、account id 或用户代理。
- 账户被冻结、refresh 被拒绝、permission/plan 不可用时，停止该能力并要求用户重新认证，不尝试规避。

### 未找到的明确禁止或可独立引用的授权

截至核查日，未找到 OpenAI 官方文档明确写出下列任何一句：

- “第三方不得复制 Codex client id”；
- “第三方不得直接调用 `chatgpt.com/backend-api/codex/responses`”；
- “Pi / OMP / OpenCode 未获准”；
- 或相反地，“任何第三方可无限期直接复制这些 OAuth endpoint、scope、headers 和 refresh token 合同”。

这不是“自动允许”。与之相对，Tibo 对 OpenCode 的公开支持和 OpenCode 的同日 core merge 给出的是**具体生态方向的积极证据**；对 Zotero Agents 这样的新集成，最诚实的产品陈述仍应是 compatibility integration，而不是稳定 public API。

还应避免把 ChatGPT 的 **Sign in with ChatGPT** 身份登录与本案混为一谈。OpenAI 的 [identity help article](https://help.openai.com/en/articles/20001410-sign-in-with-chatgpt) 说该机制给 participating partner 的默认数据仅为姓名、邮箱和头像，token/ChatGPT data 不会自动分享；这不能单独授权 subscription inference。C05 的正面依据是 Codex/OpenCode 的专门表态，不是普通身份登录说明。

## 对 C05 的建议

### 准入

保留 C05，改为下列可验证范围：

- 名称：`OpenAI Codex subscription compatibility auth`；文档说明它使用用户本人登录，且随 OpenAI/compatibility changes 可能不可用。
- 登录：只实现 device-code，打开官方 device URL，显示用户码；不用 localhost callback server，不加入 Node 依赖。
- 请求：必要时使用 direct Codex backend compatibility adapter；`originator` 只能是本项目真实身份，绝不填写 `pi` 或 `opencode`。
- 凭据：由 C03 的受控 credential store 持有 access/refresh/expires/account id；日志、错误、telemetry 一律脱敏。没有跨账户池化、代发、共享或 quota bypass。
- 降级：OAuth 失败不会破坏现有 API-key provider；允许用户登出/清除凭据；401、token refresh failure 和协议不兼容提供重新登录/禁用路径。

### 不应借此加入的内容

- 不引入 pi-ai/OMP/OpenCode 的 Node 或 Bun runtime、HTTP server、WebSocket pool、代理、usage scraper、多账号 rotate/fallback。
- 不声称 OpenAI 已给本项目 SLA、发布版本兼容保证或将本项目列为 known client。
- 不把“没有禁止”写成安全论证；security review 仍要覆盖 refresh-token 加密、XSS/日志泄漏、state/cancel、账户隔离和最小权限。

### 最小验证门

1. 自动化：不含真实 token 的 device-code response / cancellation / timeout / refresh-rotation / redaction 单元测试；验证 bundle 无 `node:` / `Bun` import。
2. 人工：一名自愿测试者的真实账户 smoke（device login、stream、refresh、logout/revoke 后失败可恢复）。不得把 token 写入测试工件或 CI。
3. 发布后：只记录匿名化兼容错误类别和版本；若 OpenAI 改变 flow，直接显示 re-auth/temporarily unavailable，而非尝试规避。

## 最终判断

生态采用的意义很具体：**Pi、OMP、OpenCode 的共同实现消除了“这是否只是 Pi 私有、Node-only 黑魔法”的技术疑虑；OpenAI Codex 负责人的公开表态消除了“完全没有官方支持方向”的疑虑。** 它们没有消除长期 token 的安全责任，也没有把内部/兼容 endpoint 自动升级成公开稳定 SDK。

所以推荐 C05 进入 MVP，但以最小 device-code compatibility slice 进入：真实项目身份、单账户、无 Node、无代理/轮换、可退出、可恢复、可降级；再为 future app-server/known-client 企业集成另立票。
