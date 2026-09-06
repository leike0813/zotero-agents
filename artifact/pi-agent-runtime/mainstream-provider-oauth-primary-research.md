# 主流模型服务 OAuth / 用户身份推理准入核查

核查日期：2026-09-03。本文为 Built-in Pi Agent Runtime 的 C05 范围决策提供事实底稿。证据只采用供应商官方文档、条款、changelog 与官方仓库；能登录官网、CLI 或 MCP，不等于第三方应用获得模型推理授权。

## 结论

**当前 C05 应选 A：只实现 OpenAI Codex 的 concrete auth module；同时采纳 C 的分类边界，把 consumer OAuth 与 enterprise/federated credentials 分开。不要为当前 MVP 保留 B 所指的通用 OAuth Provider abstraction。**

“除 Codex 外完全没有公开 OAuth 推理路径”并不准确：

- [OpenRouter OAuth PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth) 明确面向第三方应用和本地客户端，但授权码最终交换成 `sk-or-...` 用户 API key；后续模型请求走普通 API-key bearer。
- [Hugging Face OAuth](https://huggingface.co/docs/hub/en/oauth) 允许网站、App、native app 和 CLI 注册 public client，`inference-api` scope 明确允许代表用户调用 Inference Providers；该 bearer 可进入 OpenAI-compatible 流式接口。

它们证明公开路径存在，却没有形成一组与 Codex 同质的 consumer-subscription OAuth Provider：OpenRouter 是 API key 获取流程，Hugging Face 是独立推理网关及独立计费账户。Azure、Vertex AI、Bedrock 与 Anthropic WIF/App Attest 又属于企业 project/workspace/IAM 身份。把这些认证都塞进 C05，会把“OAuth”这个传输机制误当成一个领域模型。

在 coding-plan / 消费订阅范围内，本次没有找到第二个同时满足以下条件的候选：供应商公开允许第三方注册；用户订阅 entitlement 可被第三方调用；凭据可直接交给 C04 的 prepared native provider context；不要求第二套 Agent runtime。

## 判定口径

- **supported**：第一方文档公开说明第三方应用如何注册或使用凭据，并明确授权模型推理。
- **unsupported**：第一方资料把该凭据限制在官方客户端或明确不允许第三方复用。
- **unknown / 不准入**：看到了官方产品登录或实现，但没有找到公开第三方 client registration / inference contract。unknown 不是“禁止”的法律判断，只是不满足 MVP 准入证据。
- **直接支持 model-stream seam**：得到的凭据能用于公开模型 REST/SSE/Responses/Chat/Messages endpoint；启动官方 CLI/SDK Agent runtime、ACP server 或 IDE extension 不算直接支持。

## 1. 消费订阅与 coding-plan 产品

| 产品 / credential kind | 第三方公开注册 | 直接支持 model-stream seam | entitlement / 计费 | 宿主要求 | 成熟度 | 对 C05 的建议 |
| --- | --- | --- | --- | --- | --- | --- |
| **OpenAI Codex OAuth** | 本次不重审；已由用户明确保留 | 既定 C04 prepared-auth 路径 | Codex/ChatGPT 账户语义，按既定决策 | C05 仍需实现 Zotero-compatible browser/device flow；插件无 Node | 已接受范围；细节待 C05 固化 | **唯一 current-scope implementation；concrete module** |
| **Anthropic Claude subscription OAuth** | **unsupported**：Anthropic 要求第三方产品使用 API key 或受支持云平台，不得自行提供 Claude.ai login、收集或中转 subscription credential。[官方 legal/auth 指南](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use) | 否；只有官方 Claude Code / 获批表面 | Free/Pro/Max 等消费订阅 | 原样运行官方 Claude Code binary 是窄例外，但会形成另一 runtime | 官方产品 OAuth 当前可用；第三方路径明确不支持 | 保持已接受删除；C04 用 Anthropic API key |
| **Gemini CLI / Antigravity product session** | **unsupported**：官方 Gemini CLI 条款与 Antigravity FAQ 不允许第三方工具复用产品 OAuth/service。[Gemini CLI 条款](https://github.com/google-gemini/gemini-cli/blob/v0.58.0/docs/resources/tos-privacy.md)、[Antigravity FAQ](https://antigravity.google/docs/faq/) | 否；内部 Code Assist/product service 不是公开 model API | 产品 entitlement，不是 Gemini Developer API billing | 官方客户端；consumer Gemini CLI access 已于 2026-06-18 转换。[官方公告](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/) | consumer path discontinued / transitioned | 保持已接受删除；C04 用 Google AI Studio key |
| **GitHub Copilot subscription** | **supported only through official Copilot SDK/runtime**，第三方须使用自己的 GitHub App/OAuth App。[官方 OAuth 指南](https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth) | **否（对 C04）**；公开合同是 SDK + Copilot runtime，不是裸模型 endpoint | 用户 Copilot entitlement / quota | SDK runtime；TypeScript SDK 要求 Node，插件内不能直接承载 | SDK 于 2026-06-02 GA。[官方 changelog](https://github.blog/changelog/2026-06-02-copilot-sdk-is-now-generally-available/) | 保持已接受删除；未来作为独立 Host Bridge/native-sidecar 集成 |
| **Amazon Q Developer**：Builder ID / IAM Identity Center session | **unsupported for generic third-party inference**：个人 Builder ID 只支持 IDE 和 command line。[官方说明](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/getting-started-builderid.html) | 否；没有公开给第三方的通用 Q Developer model endpoint | Free/Pro 产品额度 | 官方 IDE/CLI；该产品正迁移至 Kiro | GA 产品，但 IDE plugin 和 paid subscription 已公告 2027-04-30 结束支持。[官方公告](https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/) | 不进入 C05 |
| **Kiro**：官方 browser/device session；`KIRO_API_KEY` | OAuth client registration **unsupported/未公开**；公开登录授权的是 Kiro app。自动化入口是 Kiro API key。[认证文档](https://kiro.dev/docs/getting-started/authentication/) | OAuth：否；公开集成面为 `kiro-cli acp` Agent runtime。[ACP 文档](https://kiro.dev/docs/cli/acp/) | OAuth 与 API key 都扣 Kiro subscription credits | 需安装并启动 Kiro CLI / ACP | Kiro 于 2025-11-17 GA。[官方公告](https://kiro.dev/blog/general-availability/) | 若支持，复用 External Agent/ACP；不进入 C05 |
| **Qwen Code / Alibaba Cloud Coding Plan** | 旧 Qwen OAuth 已于 2026-04-15 discontinued；当前 Coding Plan 使用 API key。[认证文档](https://qwenlm.github.io/qwen-code-docs/en/users/configuration/auth/) | 是，但凭据是 `BAILIAN_CODING_PLAN_API_KEY`，走 OpenAI-compatible endpoint | Coding Plan 固定额度；API 使用其计划规则 | 无额外 runtime | OAuth discontinued；Coding Plan formal GA label **unknown** | 归 C04 API-key path |
| **Kimi Code membership** | **unsupported for OAuth reuse**：官方将 OAuth 标为 official clients，将 API key 标为 third-party/self-built apps。[会员接入指南](https://www.kimi.com/en/help/kimi-code/membership-guide) | OAuth：否；第三方 Kimi Code API key 可走 OpenAI/Anthropic-compatible endpoint | OAuth 与第三方 API key 共用 membership quota / extra usage。[会员说明](https://www.kimi.com/code/docs/en/kimi-code/membership.html) | OAuth 需官方 CLI/extension；CLI 另可暴露 ACP | formal GA label **unknown** | 第三方路径归 C04 API key；官方 CLI 若接入则走 ACP |
| **Mistral Vibe / Vibe Code**：browser setup、Vibe/API key | 第三方 OAuth client registration **unknown / 未公开**；官方 Vibe browser flow 最终保存的 credential 仍是 Mistral API key。[官方仓库](https://github.com/mistralai/mistral-vibe/blob/main/README.md) | 是，但公开模型 API 使用 API key。[Vibe credential 文档](https://docs.mistral.ai/vibe/code/cli/api-keys-profiles) | Mistral plan 的 included usage 在 Studio、API、Vibe Code 间共享，超额才 PAYG。[订阅文档](https://docs.mistral.ai/admin/billing-usage/subscriptions) | 直接 API 无宿主；完整 coding agent 才需 Vibe CLI | browser sign-in current；formal GA label **unknown** | 归 C04 API-key path；不进入 C05 |

这里最有价值的反例是 Kimi 与 Mistral：即使供应商愿意让第三方消费用户购买的额度，也完全可以用 product/API key 交付，不需要在 C05 建 OAuth 框架。

## 2. 公开 API 与云身份

| 产品 / credential kind | 第三方公开注册 | 直接支持 model-stream seam | entitlement / 计费 | 宿主要求 | 成熟度 | 对 C05 的建议 |
| --- | --- | --- | --- | --- | --- | --- |
| **Microsoft Foundry / Azure OpenAI Entra ID access token** | **supported**：用户、service principal 或 group 获得目标 resource 的 `Cognitive Services User` RBAC；应用使用 Entra credential。[官方配置](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/configure-entra-id) | 是；官方 REST 示例直接发送 `Authorization: Bearer` 到 OpenAI-compatible Responses endpoint | Azure subscription/resource 计费，不继承 ChatGPT/Copilot consumer plan | Azure tenant、subscription/resource、deployment、RBAC；credential library 可在外部 host，REST 本身不要求 Node | 标准 cloud auth；具体 model/deployment 状态各异 | **enterprise credential**，另立 change；不放 C05 consumer OAuth |
| **Google Vertex AI ADC / user OAuth** | **supported**：第三方可注册自己的 Google OAuth client；本地 ADC 可保存 user credential。[OAuth policy](https://developers.google.com/identity/protocols/oauth2/policies)、[ADC 指南](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment) | 是；ADC access token 可作为 REST bearer。[REST auth](https://docs.cloud.google.com/docs/authentication/rest) | Google Cloud project/quota/billing，不继承 Gemini consumer product plan；user credential 还需 quota project。[quota project](https://docs.cloud.google.com/docs/quotas/set-quota-project) | Cloud project、Vertex API、IAM role、region、quota project；生产更推荐 service account/workload identity | 标准 cloud auth；具体 model 可 GA/preview | **enterprise/project-bound credential**，另立 change |
| **Amazon Bedrock IAM / IAM Identity Center / federation** | 企业可配置 federation；这不是面向任意 model app 的 consumer OAuth registration | 默认否：SSO/federation 先取得临时 AWS credential，推理请求仍用 SigV4。[Bedrock IAM](https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html) | AWS account/project IAM 与 Bedrock usage 计费 | AWS SDK/CLI/credential provider 或自行实现 SigV4 | GA cloud path | 拆成 AWS credential provider；不纳入 OAuth seam |
| **Amazon Bedrock short-term API key** | 由现有 IAM session 生成，不是 OAuth authorization grant | 是；可用 `Authorization: Bearer` 调 Bedrock Runtime，但仍是 IAM-bound service-specific API key。[官方说明](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html)、[使用方法](https://docs.aws.amazon.com/en_us/bedrock/latest/userguide/api-keys-use.html) | 继承生成者 IAM permissions，AWS 账户计费 | 先有 IAM principal/session；最长 12 小时，区域绑定 | current supported path | 手动 key 可归 C04；自动 mint/refresh 属 enterprise auth，不归 C05 |
| **Anthropic Platform WIF** | **supported**：workspace 管理员配置 service account、issuer 与 rule；workload 用 IdP JWT 在 `/v1/oauth/token` 换短期 Claude API bearer。[官方认证](https://platform.claude.com/docs/en/manage-claude/authentication) | 是；与 Claude API key 获得相同 endpoint access | Claude Platform workspace 计费，不继承 Claude.ai subscription | 需要 AWS/GCP/Azure/OIDC workload identity 与 workspace 配置 | current docs，无 preview 标记 | **workload federation**，另立 change |
| **Anthropic App Attest** | **supported**，但只针对在 Claude Console 注册的 iOS/macOS app | 是；一小时 token 只授权 Messages API | 账单归注册 app 的 Claude workspace | Apple App Attest，仅 iOS/macOS；无法覆盖 Windows/Linux Zotero matrix | current docs，无 preview 标记 | 不适合跨平台 C05；若未来做 Apple-only direct client，单独设计 |

这些 credential 有的确实使用 OAuth bearer 或 token exchange，但共同领域是组织资源、IAM、RBAC、quota 与 workload identity。它们需要的状态机和失败语义（tenant、role、project、quota、issuer、session）与 Codex consumer login 不同。

## 3. 聚合 / 路由平台

| 产品 / credential kind | 第三方公开注册 | 直接支持 model-stream seam | entitlement / 计费 | 宿主要求 | 成熟度 | 对 C05 的建议 |
| --- | --- | --- | --- | --- | --- | --- |
| **OpenRouter OAuth PKCE → user-controlled API key** | **supported**：公开 callback/PKCE flow；localhost 可用任意端口，不要求客户端 secret。[OAuth guide](https://openrouter.ai/docs/guides/overview/auth/oauth) | 是，但 OAuth code 先换成 `sk-or-...` key，模型流随后按普通 OpenRouter API key 执行。[exchange API](https://openrouter.ai/docs/api/api-reference/o-auth/exchange-auth-code-for-api-key) | OpenRouter credits，或用户另行配置 BYOK；不继承上游模型商 consumer subscriptions。[FAQ](https://openrouter.ai/docs/faq) | 浏览器 + callback；之后无额外 runtime | current docs，无 preview 标记 | 若将来加入，可做“连接并保存 API key”的 concrete acquisition helper；不需要 OAuth Provider registry |
| **Hugging Face OAuth access token + `inference-api`** | **supported**：任意网站/App 可建 OAuth app；支持无 secret public client、PKCE、loopback 与 device flow。[OAuth docs](https://huggingface.co/docs/hub/en/oauth) | **是**：`inference-api` scope 明确授权代表用户推理；HF router 提供 OpenAI-compatible SSE chat stream。[Chat Completion](https://huggingface.co/docs/inference-providers/tasks/chat-completion) | HF account credits/PAYG；PRO/Team/Enterprise 有月度 compute credits，路由请求统一在 HF 计费。[pricing](https://huggingface.co/docs/inference-providers/pricing) | 浏览器/loopback 或 device flow；REST stream 无额外 runtime | OAuth + Chat Completion current，无 preview 标记；Responses API 另为 beta | 是真实的未来候选；只有明确纳入 C03 catalog/C04 endpoint 后，才考虑抽取共享 seam |

Hugging Face 是本次唯一找到的、除 Codex 外同时具备公开第三方 OAuth registration、明确 inference scope、可直接进入公开流式模型 endpoint 的成熟候选。不过它是统一推理网关，不是复用某家消费型 coding subscription。

## 4. API-key-first 代表抽样

下表只说明当前公开模型 API 的认证合同；“未找到 OAuth”不等于供应商承诺永远不会提供。

| 产品 / credential kind | 第三方公开 OAuth inference registration | model-stream seam / 计费 | 宿主要求 | 成熟度 | 对 C05 的建议 |
| --- | --- | --- | --- | --- | --- |
| **xAI API key** | unknown / 未公开 | OpenAI-compatible bearer API；API billing 与 Grok consumer subscription 分开。[官方 API docs](https://docs.x.ai/overview) | 无 | current API；formal GA label unknown | C04 API key |
| **Mistral API/Vibe key** | unknown / 未公开 | direct API；Mistral included usage 可先抵扣，之后 PAYG。[API key docs](https://docs.mistral.ai/admin/identity-access/api-keys) | 无 | current；formal GA label unknown | C04 API key |
| **Cohere trial/production API key** | unknown / 未公开 | native Chat/stream；production usage 单独计费。[API key docs](https://docs.cohere.com/docs/api-keys) | 无 | current；formal GA label unknown | C04 API key |
| **DeepSeek API key / bearer** | unknown / 未公开 | OpenAI/Anthropic-compatible stream；从 topped-up/granted balance 扣费。[认证](https://api-docs.deepseek.com/api/deepseek-api/)、[定价](https://api-docs.deepseek.com/quick_start/pricing) | 无 | API schema 1.0.0；个别模型能力可 beta | C04 API key |
| **Groq project API key** | unknown / 未公开 | OpenAI-compatible；project usage/billing。[安全文档](https://console.groq.com/docs/production-readiness/security-onboarding) | 无 | current；formal GA label unknown | C04 API key |
| **Together project API key** | unknown / 未公开 | OpenAI-compatible；organization credits/usage billing。[认证](https://docs.together.ai/docs/api-keys-authentication) | 无 | current；部分 project 功能可 early access | C04 API key |
| **Fireworks account API key** | unknown / 未公开 | OpenAI/Anthropic-compatible bearer stream；account PAYG。[quickstart](https://docs.fireworks.ai/getting-started/quickstart) | 无 | REST current；SDK maturity另论 | C04 API key |

这些服务没有为 C05 提供新增价值：它们已经完整落在 C03 Pi Credential Store + C04 API-key/model-stream seam 的边界内。

## 对 A / B / C 的工程判断

### A. C05 只做 OpenAI Codex concrete module — 推荐

将 change 收窄为 `add-pi-openai-codex-auth`，生产模块使用具体名称，例如 `piOpenAICodexAuth.ts`。它只负责 Codex authorization、refresh、logout/clear 与 prepared provider-auth context：

- Pi Credential Store 仍是 encrypted credential 与 atomic refresh 的 SSOT；
- C04 继续拥有 model stream、abort 与 provider failure normalization；
- C01 对 OAuth 保持无感；
- 不新增 adapter registry、factory 或对外通用 OAuth DTO；
- 插件不导入 Node-only login/runtime code。

OpenRouter 若未来加入，OAuth 结束后就是 API key，可直接保存为相应 credential kind；Hugging Face 若未来被产品范围明确接纳，再实现第二个 concrete module。届时根据两份真实代码提取共享 browser/PKCE mechanics，比现在猜测共同接口更稳。

### B. 保留小型通用 OAuth seam — 当前不推荐

仅凭协议词汇可以抽出 authorize URL、PKCE verifier、device polling、token refresh 等操作，但各候选实际返回物和生命周期不同：Codex consumer credential、OpenRouter generated API key、HF scoped bearer、Azure/Google resource token、AWS IAM session 与 WIF token exchange。一个薄 registry 会隐藏计费主体、scope、host 和 refresh/revoke 差异，反而削弱 Pi Model Provider Auth Variant 的明确身份。

如果未来确有两个以上同类实现，最多抽取无状态协议 mechanics；不要暴露第二个 Provider/auth registry，也不要让通用层持有 credential 或选择 Provider。

### C. 拆 consumer OAuth 与 enterprise/federated credentials — 作为硬边界采纳

C 不是要求现在再建一套框架，而是范围分类：

- C05 consumer/product auth：当前只有 OpenAI Codex；
- C04 API-key execution：包括 Kimi、Mistral、Qwen Coding Plan、OpenRouter/HF 的手动 token/key 等；
- future enterprise credentials：Azure Entra ID、Vertex ADC/OAuth、Bedrock IAM/SSO/short-term key、Anthropic WIF/App Attest；
- official runtime integrations：Copilot SDK、Kiro/Kimi ACP、Claude Code binary，属于 External Agent 或独立 Host Bridge/runtime change。

这与现有约束一致：不在 Zotero 插件引入 Node runtime；C04 只接收 prepared native provider context；不为认证增加第二套 Agent runtime；凭据始终由 Pi Credential Store 持有。

## 能推翻本建议的条件

只有以下条件同时满足，才值得把 A 改成 B：

1. 产品范围明确要求在同一 release 加入 Hugging Face `inference-api` 或另一条已获第一方公开授权的终端用户 OAuth inference 路径，而非仅仅“将来可能”；
2. C03 Pi Model Catalog/Configuration 已正式接纳该 Provider/endpoint，C04 能以同一个 prepared provider-auth context 驱动其原生流式 adapter；
3. browser/loopback/device flow 能在 Zotero 7/9/10 和目标 OS matrix 中完成，不引入 Node runtime 或第二 Agent runtime；
4. 两个实现实际共享 authorization transaction、cancel、expiry/refresh 和 credential replacement 语义，而不需要 provider string switch、可选字段堆或降级成 `Record<string, unknown>`；
5. deterministic fixtures 能锁定重入、超时、拒绝、刷新竞争、清除/撤销与 secret-negative 行为，且 registry 仍保持私有。

Azure、Vertex、Bedrock 或 Anthropic WIF 的需求不能单独推翻 A；它们只会触发独立 enterprise credential design。GitHub Copilot、Kiro、Kimi 或 Claude Code 的官方 runtime 需求也不能推翻 A；它们会触发独立 runtime/ACP integration。

## 不确定项

- 本次没有找到 Kimi、Mistral Vibe browser login 面向第三方 OAuth client 的公开注册合同；因此只判 unknown/unsupported for reuse，不下“法律禁止”结论。
- Hugging Face OAuth 主文档明确提供 inference scope 和 public-client flows，但没有在同页给标准 interactive access token 的完整 refresh 行为；实现前应再锁定 discovery metadata、token expiry/revocation 与 refresh contract。
- Microsoft、Google 与 Anthropic 的身份文档为 current supported path，但具体模型、region、tenant policy 和某些 endpoint 的 GA/preview 状态需在将来的 provider-specific change 中逐项核对。
- “主流”不是可穷举集合。本文已覆盖任务指定的消费产品、三大云、两条主要聚合 OAuth 路径和 API-key-first 代表；未发现合同不能证明不存在私有 partner program。

## 项目内关联记录

- [Anthropic OAuth 一手核查](./anthropic-oauth-primary-research.md)
- [Gemini CLI / Antigravity OAuth 一手核查](./gemini-cli-antigravity-oauth-primary-research.md)
- [GitHub Copilot OAuth 一手核查](./github-copilot-oauth-primary-research.md)
- [Wayfinder C01–C05 决策票](https://github.com/leike0813/zotero-agents/issues/26)
