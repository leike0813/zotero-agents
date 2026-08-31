# Brokered Web Read backend 一手资料核查

核查日期：2026-08-30。本文为 Wayfinder 研究票 [Research Zotero-compatible Brokered Web Read backends](https://github.com/leike0813/zotero-agents/issues/30) 提供事实与决策底稿，不修改已经由 [Define Trusted Native Execution and Brokered Tools](https://github.com/leike0813/zotero-agents/issues/19) 决定的 Agent-facing schema。

## 结论先行

`web_search` 与 `web_fetch` 是通用 Agent 的基础读取能力。MVP 不以“能够证明网络请求绝对不可能绕过 SSRF 防护”为上线前提；这类证明在应用层普通 HTTP client、DNS、代理和连接复用共同参与时并不现实。项目应兑现一组明确、可测试的防护，并把剩余风险如实归入 Trusted Native Execution 的威胁模型。

MVP 采用一条不要求项目运营服务、也不要求用户先申请专用搜索账户的有序路径：

1. `web_search` 优先复用用户已经配置且支持 hosted search 的模型 provider，由 Tool Gateway adapter 归一结果、预算和错误；
2. 没有可用 provider-native search 时，调用 Exa 官方匿名公共 MCP；
3. 公共 MCP 不可用时，使用一个 credential-free 公共搜索页 adapter 作 best-effort fallback，首个实现从 DuckDuckGo HTML 或 Startpage 中按真实网络验证选择；
4. Brave Search API 与 SearXNG 保留为用户显式配置的 BYOK / self-hosted 选项，不作为默认可用性的前提；
5. `web_fetch` 始终使用 Zotero/Mozilla 原生网络栈。

整条路径只需要 Zotero 内的普通 HTTP adapter，不需要把 Node-only runtime code 引入 Zotero 7 或 Zotero 9，也不要求本项目运营公共 gateway。`web_fetch` 在每一跳执行 URL 解析、DNS 地址分类和响应限制；无法获得连接绑定证明属于已知残余风险，不再单独否决该能力。任意搜索结果 URL 的抓取始终重新进入独立的 `web_fetch` Broker 策略。

Firecrawl 和 Jina Reader 在产品功能上都覆盖 search + fetch，但会引入额外服务、凭据、许可或运维面，并暴露 MVP 不需要的 headers、cookies、browser actions、二进制等能力。原生 fetch 已能完成 MVP，因此不为追求不可验证的“更安全”声明增加远程 fetch gateway；只有动态页面或更强正文抽取成为实际需求时再评估它们。

可用性也属于 MVP 合同：Brokered Web Read 进入有效能力包络后，原生 `web_fetch` 与至少一条 credential-free `web_search` 路径应无需第三方配置即可使用，且不逐次弹窗。Brave key、SearXNG endpoint 与其它专用搜索配置只增强质量或稳定性；全部可用路径失败时返回稳定 `search_unavailable` 及实际失败摘要，不能把需要付费账户或自部署伪装成零配置默认。

## 固定范围与版本锚点

本文只核查能够改变 MVP 选择的最小候选集：

| 候选 | 核查锚点 |
| --- | --- |
| Zotero 7 原生 HTTP | Zotero [`7.0.30`](https://github.com/zotero/zotero/tree/7.0.30)，commit `76a04d5aff69a6515aef7af1e3496510f74e62d2` |
| Zotero 9 原生 HTTP | Zotero [`9.0.6`](https://github.com/zotero/zotero/tree/9.0.6)，commit `eabf364f2bad0cd03883e5898ce85619c3d6be21` |
| Brave Search API | 2026-08-30 可见的官方 Web Search API、rate-limit、pricing 与 terms 页面 |
| SearXNG | commit [`d226b78bc4c9ab93a84849b8ad128a68c41be17c`](https://github.com/searxng/searxng/tree/d226b78bc4c9ab93a84849b8ad128a68c41be17c)，官方文档版本 `2026.8.29+d226b78bc` |
| Firecrawl | commit [`9bf1242b9562cfc710b85cd74127f2628561737a`](https://github.com/firecrawl/firecrawl/tree/9bf1242b9562cfc710b85cd74127f2628561737a) 与当日 cloud API 文档 |
| Jina Reader | commit [`1574bfd380d249c86c82db4dace0d9c8fe17e2b1`](https://github.com/jina-ai/reader/tree/1574bfd380d249c86c82db4dace0d9c8fe17e2b1) 与当日 Reader API 页面 |

Zotero 官方说明插件运行在桌面应用内，可使用 Zotero 内部 JavaScript API 和 Firefox 内部 API；Zotero 7 基于 Firefox 115，Zotero 8 将平台升级到 Firefox 140，而 Zotero 9 没有主要 developer-facing 变化。[插件运行环境](https://www.zotero.org/support/dev/client_coding/plugin_development)、[Zotero 7 平台说明](https://www.zotero.org/support/dev/zotero_7_for_developers)、[Zotero 8 平台说明](https://www.zotero.org/support/dev/zotero_8_for_developers)、[Zotero 9 兼容性说明](https://www.zotero.org/support/dev/zotero_9_for_developers)。因此 Zotero/Mozilla 原生实现是 7/9 的共同基线；不能用 Node SDK 示例证明插件兼容性。

## OpenCode、Pi 与 OMP 的现成做法

身份先钉死：当前 OpenCode 是 `anomalyco/opencode@1.18.25`；Pi 的 `@mariozechner/pi-coding-agent@0.73.1` / `badlogic/pi-mono` 是迁移前发布线，当前维护包为 `@earendil-works/pi-coding-agent@0.84.4`、canonical repo 为 `earendil-works/pi`；OMP 是独立 fork `can1357/oh-my-pi`，当前包为 `@oh-my-pi/pi-coding-agent@18.0.11`。[OpenCode manifest](https://github.com/anomalyco/opencode/blob/10765ff2a9da8c3b88e4de873aa383a49c318912/packages/opencode/package.json)、[Pi 旧 manifest](https://github.com/earendil-works/pi/blob/v0.73.1/packages/coding-agent/package.json)、[Pi 当前 manifest](https://github.com/earendil-works/pi/blob/853a80d26c90a14c1886f0ebb8ffaae133ca2185/packages/coding-agent/package.json)、[Pi scope 迁移记录](https://github.com/earendil-works/pi/blob/853a80d26c90a14c1886f0ebb8ffaae133ca2185/packages/coding-agent/CHANGELOG.md#0740---2026-05-07)、[OMP manifest](https://github.com/can1357/oh-my-pi/blob/cdb9c4d985bc7d3ca8526b7e55a0133ef3cf2287/packages/coding-agent/package.json)

| 工具 | 默认 Web 能力 | 零配置、费用与部署 | 权限与未配置行为 |
| --- | --- | --- | --- |
| **OpenCode** | 内置独立 `webfetch` 与 `websearch`。`webfetch` 由本地进程直接请求 HTTP(S)；`websearch` 直连 Exa 或 Parallel 的托管 MCP。[tool registry](https://github.com/anomalyco/opencode/blob/10765ff2a9da8c3b88e4de873aa383a49c318912/packages/opencode/src/tool/registry.ts)、[`webfetch.ts`](https://github.com/anomalyco/opencode/blob/10765ff2a9da8c3b88e4de873aa383a49c318912/packages/opencode/src/tool/webfetch.ts)、[MCP endpoints](https://github.com/anomalyco/opencode/blob/10765ff2a9da8c3b88e4de873aa383a49c318912/packages/opencode/src/tool/mcp-websearch.ts) | Search 只在 OpenCode/OpenCode Go provider 下默认暴露；其它 provider 需设置 `OPENCODE_ENABLE_EXA` 或 `OPENCODE_ENABLE_PARALLEL`。官方称无需 API key，用户也不部署服务；代价被转移给 Exa/Parallel 的匿名公共托管入口，源码与文档没有为该入口提供 SLA 或长期免费合同。[Tools docs](https://github.com/anomalyco/opencode/blob/10765ff2a9da8c3b88e4de873aa383a49c318912/packages/web/src/content/docs/tools.mdx#websearch) | 大多数权限默认 `allow`，可把 `webfetch`/`websearch` 改成 `ask` 或 `deny`。[Permissions docs](https://github.com/anomalyco/opencode/blob/10765ff2a9da8c3b88e4de873aa383a49c318912/packages/web/src/content/docs/permissions.mdx#defaults) 非 OpenCode provider 未设置 enable flag 时，`websearch` 不进入工具列表；`webfetch` 仍可用。 |
| **Pi** | 迁移前后都没有内置 `web_search` 或 `web_fetch`；默认工具始终是 `read`、`bash`、`edit`、`write`。Agent 可通过 `bash` 使用宿主已有的 `curl`，或安装 Skill/extension/package，但这不等于内置搜索 API。[v0.73.1 tools](https://github.com/earendil-works/pi/blob/v0.73.1/packages/coding-agent/src/core/tools/index.ts)、[current tools](https://github.com/earendil-works/pi/blob/853a80d26c90a14c1886f0ebb8ffaae133ca2185/packages/coding-agent/src/core/tools/index.ts) | Core 不承担搜索费或部署。官方文档引用的 `badlogic/pi-skills` 中，`brave-search` 明确要求用户创建 Brave 订阅、绑定信用卡、配置 `BRAVE_API_KEY` 并安装依赖。[Skills docs](https://github.com/earendil-works/pi/blob/853a80d26c90a14c1886f0ebb8ffaae133ca2185/packages/coding-agent/docs/skills.md#example)、[Brave Skill](https://github.com/badlogic/pi-skills/blob/90bb51cae36515a648515b633a81c0c6efc8c74d/brave-search/SKILL.md) | Pi 明确没有 permission popup 或内置 sandbox，工具继承启动用户权限；隔离由容器/VM 或 extension 提供。[README](https://github.com/earendil-works/pi/blob/853a80d26c90a14c1886f0ebb8ffaae133ca2185/packages/coding-agent/README.md#philosophy)、[Security](https://github.com/earendil-works/pi/blob/853a80d26c90a14c1886f0ebb8ffaae133ca2185/packages/coding-agent/docs/security.md) 没安装扩展时根本没有搜索工具，也没有 backend-unconfigured 状态。 |
| **OMP** | 内置 `web_search`；没有单独的 `web_fetch`，HTTP(S) URL 由 `read` 统一读取。`fetch.enabled` 与 `web_search.enabled` 默认开启。[built-in names](https://github.com/can1357/oh-my-pi/blob/cdb9c4d985bc7d3ca8526b7e55a0133ef3cf2287/packages/coding-agent/src/tools/builtin-names.ts)、[`read.ts`](https://github.com/can1357/oh-my-pi/blob/cdb9c4d985bc7d3ca8526b7e55a0133ef3cf2287/packages/coding-agent/src/tools/read.ts)、[settings](https://github.com/can1357/oh-my-pi/blob/cdb9c4d985bc7d3ca8526b7e55a0133ef3cf2287/packages/coding-agent/src/config/settings-schema.ts) | 自动链先复用用户已有 Perplexity、Gemini、Anthropic、Codex 等凭据，再尝试专用 key/endpoint provider，最后顺序抓取免凭据的 Startpage、DuckDuckGo、Ecosia、Google、Mojeek 页面。已有 provider 的费用/配额归用户；公共页面兜底无自部署和 API key，但由项目承担验证码、限流、页面改版和条款变化风险。`Public Web` 并发聚合仅显式选择时启用。[provider order](https://github.com/can1357/oh-my-pi/blob/cdb9c4d985bc7d3ca8526b7e55a0133ef3cf2287/packages/coding-agent/src/web/search/types.ts)、[provider resolution](https://github.com/can1357/oh-my-pi/blob/cdb9c4d985bc7d3ca8526b7e55a0133ef3cf2287/packages/coding-agent/src/web/search/provider.ts)、[Public Web](https://github.com/can1357/oh-my-pi/blob/cdb9c4d985bc7d3ca8526b7e55a0133ef3cf2287/packages/coding-agent/src/web/search/providers/public.ts) | `web_search` 和普通 URL `read` 是 `read` tier；所有 approval mode 都自动批准 read，默认 mode 为 `yolo`，用户仍可按工具设 `prompt`/`deny`。[web search approval](https://github.com/can1357/oh-my-pi/blob/cdb9c4d985bc7d3ca8526b7e55a0133ef3cf2287/packages/coding-agent/src/web/search/index.ts)、[approval modes](https://github.com/can1357/oh-my-pi/blob/cdb9c4d985bc7d3ca8526b7e55a0133ef3cf2287/docs/approval-mode.md#modes) 零凭据时仍有公共页面 provider；只有把这些 provider 全部排除且没有其它凭据时才返回 `Error: No web search provider configured.` |

### 对本项目的直接含义

1. **没有免费搜索基础设施的“第四条路”。** OpenCode 把运营交给 Exa/Parallel；Pi 放弃内置搜索；OMP 用 best-effort 页面抓取换取零 key。
2. **Brave 与 SearXNG 只能是显式配置选项。** 前者需要用户账户/key，后者需要 endpoint/部署，不能叫默认零配置能力。
3. **若零配置搜索是产品要求，OMP 路线最可复制。** 用多个可失败、可顺序回退的公共页面 adapter，接受限流与维护成本；发布前另行核查站点条款和真实网络可靠性。OpenCode 的匿名 MCP 可作为候选 backend，但不能在没有服务合同的情况下假定它会长期免费替第三方项目承载流量。
4. **已有模型 provider 的 hosted search 值得复用。** 统一包装为本项目的 provider-neutral `web_search` 后端；费用和 quota 仍属于用户账户，不能把模型原生工具直接冒充 Broker contract。
5. **逐次确认不是成熟工具的共同默认。** 三者都允许 Agent 自主进行公共读取，只提供全局或按工具收紧手段；这支持本项目把 `web_search`/`web_fetch` 作为默认可自主调用的 read capability。

## 信任边界与 MVP 风险分层

本票沿用 [Select the cross-platform sandbox architecture](https://github.com/leike0813/zotero-agents/issues/18#issuecomment-5422736114) 的威胁模型：信任 Agent 遵守 Tool Gateway policy，不声称抵抗被攻陷的 Agent；同时把网页、搜索结果、redirect、DNS 回答和工具输出中的指令视为不可信内容。这里需要分开三个对象：

- **Agent 决策可信**：Agent 可以自主决定何时搜索、读取哪个公共 URL，以及如何使用返回的文本，不做逐次确认。
- **网络内容与寻址不可信**：页面内容、链接、redirect 和域名解析不能授予新能力。它们可能包含 prompt injection，也可能把一个看似公共的 URL 引向宿主可见的本地资源。
- **宿主网络资源受保护**：loopback、private、link-local、metadata 和本地 IPC 不属于 Public Web。是否允许读取这些目标由独立 `local-network` grant 决定，不能由 Agent、网页或 `external-egress` 权限自行扩大。

信任 Agent 与保留 Broker 防护并不冲突。Broker 不需要防范 Agent 蓄意突破宿主；它需要阻止不可信页面或寻址过程在 Agent 不知情时把一次普通 Web read 变成宿主网络读取，并确保网页拿不到 Zotero cookie、凭据或请求正文。

### 默认硬拒绝

Agent 只看到：

- `web_search { query }`
- `web_fetch { url }`

输出只允许有界的搜索 title/URL/snippet，或 final URL/content type/Markdown/plain text。HTML、plain text 和 JSON 可读；其它 MIME 返回 `unsupported_content_type`。以下能力对 Public Web 读取始终拒绝，不能由 Agent 参数放开：

- 非 HTTP(S) scheme、URL embedded credentials、GET 之外的 method、request body 和用户自定义 header；
- Zotero cookie jar、HTTP auth、client certificate、provider key 或其它宿主凭据；
- 二进制下载、文件物化、页面脚本执行、插件 DOM 注入或 Shell fallback；
- 超出 redirect、解压后字节、MIME、总时长、空闲时长和单 turn 调用预算的响应。

Public Web 默认还拒绝 literal 或当前 DNS 结果中的 loopback、private、link-local、multicast、unspecified、documentation 和 metadata/special-purpose 地址；任一 A/AAAA 落入拒绝范围即拒绝整次请求。已知 cloud metadata endpoint（至少包括 `169.254.169.254` 与 `metadata.google.internal`）始终拒绝。每次 redirect 都关闭自动跟随，重新做 URL、DNS 和地址分类。OWASP 对“任意外部 URL”场景同样建议只允许 HTTP(S)、检查全部 A/AAAA、分类非公共地址并逐跳验证 redirect，同时明确 DNS pinning/TOCTOU 是应用层校验面对的现实难点。[OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)、[OWASP SSRF Top 10](https://owasp.org/Top10/2021/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)、[AWS IMDS](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)、[Google Cloud metadata](https://cloud.google.com/compute/docs/metadata/querying-metadata)

### 可由用户配置或授权放开

- Public Web 可以配置 domain allowlist/blocklist、调用预算，以及确有需要的公开非标准端口；这些配置只能缩小或有界扩展目标，不能注入 header、cookie 或请求正文。
- 普通私网、本机或组织内部站点只能通过既有独立 `local-network` capability 放开。Gateway 从解析结果推导 `local-network` effect，暂停原调用并走既有增量授权路径；授权后仍使用同一个只读、匿名、有界 `web_fetch`，不新增 Broker 专用 allowlist 体系，也不降级为通用 HTTP。cloud metadata endpoint 即使有 Local Network grant 也保持硬拒绝。
- 用户可以选择保留 Firefox/Zotero 的系统代理、DoH 和企业网络配置。Mozilla channel 明确区分 origin DNS 与 proxy DNS；此时 receipt/诊断应标明 `proxy-mediated` 或等价事实，不能宣称本地 preflight DNS 就是代理最终连接地址。宿主网络配置属于受信控制面，而不是网页内容提供的参数。[Mozilla proxy DNS strategy](https://searchfox.org/firefox-main/source/netwerk/protocol/http/nsIHttpChannelInternal.idl#551-583)

### 接受并降低的残余风险

应用层 preflight 与实际 connect 之间仍可能发生 DNS rebinding/TOCTOU；连接复用、Alt-Svc、代理端 DNS 或平台内部重新解析也可能使“预查地址”与“实际 peer”不同。Mozilla 的内部 channel 暴露实际 `remoteAddress`，但接口明确说明端点尚未确定或 HTTP activity observer 未启用时可能不可用，因此它适合作为可用时的二次检查与审计证据，不适合作为能力存在的绝对前提。[`nsIHttpChannelInternal.remoteAddress`](https://searchfox.org/firefox-main/source/netwerk/protocol/http/nsIHttpChannelInternal.idl#330-345)

MVP 接受这部分残余风险，理由是影响已被窄化：请求固定为匿名 GET、无 body/secret、自行处理 redirect、只把有界文本返回给受信 Agent；若可取得 actual remote address 且发现非公共地址，应立即 abort、丢弃响应并记录 `network_denied`。这不能倒推为“请求从未触达该地址”，所以文档和 receipt 只承诺 **best-effort SSRF mitigation**，不宣称 Strong network isolation。

网页内容仍可能诱导 Agent 发起后续调用或污染结论。处理方式是保留来源 URL、把页面标记为不可信 tool output、限制调用与响应、让 Agent 引用和交叉核验；不尝试用 URL 安全检查解决 prompt injection。

### 统一执行合同

每次执行必须满足：

- 默认只访问公共 HTTP(S)，独立 Local Network grant 可以有界放开明确目标；
- DNS 后尽力拒绝 loopback、private、link-local 和其它非公共地址；
- 每次 redirect 都重新做 URL、DNS 和地址分类；
- 不携带 Zotero cookie jar、用户凭据或任意认证头；
- 对 redirect 次数、响应 MIME、解压后字节数、总时长和空闲时长设硬上限；
- 传播 `AbortSignal`，并把 validation、network、timeout、cancel、unsupported content、resource limit 和 unavailable 分成稳定错误；
- provider key 只能是 Broker 持有、绑定到固定 provider origin 的 connection secret，不能成为 Agent 参数，也不能转发给目标网页。

这些是项目 Tool Gateway/Broker 的职责。下文的 “backend 有某能力” 只表示它可被利用；安全声明必须与项目实际能测试和观察的边界一致。

## 可行性总表

| Substrate | Public Web 与结果质量证据 | HTML/text/JSON 提取 | redirect、DNS、私网拒绝 | 大小/MIME/时间/cancel | 凭据、rate、价格 | 分发、许可、未配置行为 | 同时服务两操作？ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Zotero/Mozilla 原生 HTTP** | 没有 Web index，不做 search。它是直接 fetch substrate，覆盖目标站点是否可访问取决于普通公网、站点反爬和 TLS。 | XHR/Fetch 可返回 text/JSON；`DOMParser` 可把 HTML 字符串解析为独立 `Document`。需要正文抽取时可评估 Firefox Reader View 使用的 Apache-2.0 Mozilla Readability；其官方安全说明明确要求先 sanitize，不能把它当 sanitizer。Broker 负责有界文本输出。[Fetch body/JSON/text](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)、[`DOMParser.parseFromString`](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString)、[Mozilla Readability](https://github.com/mozilla/readability) | Zotero 7/9 的 `Zotero.HTTP.request()` 均可 `followRedirects: false`，底层 `asyncOnChannelRedirect` 会取消自动跳转并暴露新 URI；Mozilla `nsIDNSService.asyncResolve()` 可解析主机。Broker 可以逐跳解析并检查全部地址，但 preflight 与 HTTP connect 不是一个原子操作；这是需要记录和测试的 best-effort 防护，不是原生 fetch 的否决条件。可获得 `remoteAddress` 时再做连接后二次检查。[Z7 redirect 源码](https://github.com/zotero/zotero/blob/7.0.30/chrome/content/zotero/xpcom/http.js#L332-L350)、[Z9 redirect 源码](https://github.com/zotero/zotero/blob/9.0.6/chrome/content/zotero/xpcom/http.js#L380-L398)、[Mozilla DNS 接口](https://searchfox.org/mozilla-esr115/source/netwerk/dns/nsIDNSService.idl#250-340)、[Mozilla remote address](https://searchfox.org/firefox-main/source/netwerk/protocol/http/nsIHttpChannelInternal.idl#330-345) | Zotero 7/9 提供 timeout 和 cancel callback；Fetch body 是 `ReadableStream`，`AbortController` 可中止请求、body consumption 和 stream。Broker 仍要在读取流时按**解压后实际字节**计数，并在读取前后复核 MIME；只看 `Content-Length` 不构成上限。[Z7 timeout/cancel](https://github.com/zotero/zotero/blob/7.0.30/chrome/content/zotero/xpcom/http.js#L394-L452)、[Z9 timeout/cancel](https://github.com/zotero/zotero/blob/9.0.6/chrome/content/zotero/xpcom/http.js#L441-L499)、[Response stream](https://developer.mozilla.org/en-US/docs/Web/API/Response/body)、[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) | 无额外服务 key、请求费或第三方 quota。必须显式匿名请求：Zotero 9 源码说明普通请求默认使用 Firefox cookie jar，只有 `{ anon: true }` 才匿名；标准 Fetch 应使用 `credentials: "omit"`。[Zotero 9 cookie 行为](https://github.com/zotero/zotero/blob/9.0.6/chrome/content/zotero/xpcom/http.js#L306-L316)、[Fetch credentials](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#including_credentials) | 随 Zotero runtime 提供，不新增包或分发面。Zotero 的 offline 检查直接抛出 `BrowserOfflineException`；Broker 映射成稳定 unavailable/network error。[Z7 offline](https://github.com/zotero/zotero/blob/7.0.30/chrome/content/zotero/xpcom/http.js#L266-L269)、[Z9 offline](https://github.com/zotero/zotero/blob/9.0.6/chrome/content/zotero/xpcom/http.js#L306-L309) | **只适合 `web_fetch`**。这是最小、Zotero-native 的 MVP 选择。 |
| **Brave Search API** | Brave 声明 Web Search 使用与 Brave Search 相同的独立 Web index，返回 URL、title、description，并可返回最多 5 个额外 snippets；API 的 query 最长 400 字符/50 words，单页最多 20 条。以上能证明覆盖和结果形状，不能独立证明相对排名质量；发布前仍需用项目查询集测 relevance。[产品与 index](https://brave.com/search/api/)、[Web Search API](https://api-dashboard.search.brave.com/api-reference/web/search/get) | JSON 搜索结果与 snippets；不抓取任意结果 URL 的完整 HTML/text/JSON。完整页面必须交给独立 `web_fetch`。 | 插件只请求固定 `api.search.brave.com`，用户 query 不决定网络 host，因此搜索调用本身没有任意 URL SSRF 面。结果 URL 只是数据，不能绕过 `web_fetch` 门禁。Brave 的 crawler/索引内部控制不属于项目可审计边界。 | Provider 约束 query/count；Broker 仍对 API response byte、JSON parse、总时长和 abort 设上限。取消本地 HTTP 只证明调用方停止等待，官方资料没有承诺已开始的 provider 工作被撤销。 | 固定 `X-Subscription-Token`，必须由 Broker 注入。当前 Search plan 为 `$5/1,000 requests`、包含每月 `$5` credit、容量 50 qps；超限返回 `429` 并有标准 rate headers。[认证](https://api-dashboard.search.brave.com/documentation/guides/authentication)、[价格/容量](https://brave.com/search/api/)、[rate limit](https://api-dashboard.search.brave.com/documentation/guides/rate-limiting) | 托管服务，无可分发 server。通用条款限制缓存、再分发和 AI 训练等用途；若要持久化完整结果需要相应 storage rights。没有 key/plan 时跳过该显式 provider 或报告 `backend_unconfigured`。[Search API terms](https://api-dashboard.search.brave.com/app/documentation/general/terms-of-service) | **只适合 `web_search`**。是显式 BYOK 选项，不是零配置默认。 |
| **SearXNG** | 自托管 metasearch，不拥有一个独立 public-Web index；它通过 engine adapter 聚合多个外部搜索服务。官方当前列出 272 个 engine、83 个默认启用。覆盖、排序质量、地区表现和可用性随配置、上游反爬/CAPTCHA 与 engine failure 改变，不能承诺统一质量。[engine 模型](https://docs.searxng.org/dev/engines/engine_overview.html)、[configured engines](https://docs.searxng.org/user/configured_engines.html) | `/` 与 `/search` 支持 GET/POST；启用 `format=json` 后返回 JSON。JSON 包含 query、results、answers、corrections、suggestions 和 `unresponsive_engines`；普通 result 是 URL/title/content snippet，不是目标页面全文。[Search API](https://github.com/searxng/searxng/blob/d226b78bc4c9ab93a84849b8ad128a68c41be17c/docs/dev/search_api.rst)、[JSON 序列化](https://github.com/searxng/searxng/blob/d226b78bc4c9ab93a84849b8ad128a68c41be17c/searx/webutils.py#L213-L228) | 插件只请求配置好的 SearXNG origin；search query 只传给配置好的 engines，不成为任意 fetch URL。SearXNG 的 outgoing 层有 engine timeout、proxy 和 `max_redirects`，但这只管搜索引擎请求，不满足任意 `web_fetch` 的逐跳门禁。[outgoing settings](https://docs.searxng.org/admin/settings/settings_outgoing.html) | 默认 outgoing request timeout 2s、最大 10s，默认最大 30 redirects；Tool Gateway 对 SearXNG response 另设更小的字节/时间上限。HTTP client cancel 不保证所有上游 engine 同时停止。 | 软件无按查询价格；成本是自托管基础设施及上游 API/代理。实例 limiter 需要 Valkey，目标是避免 bot 流量导致上游 CAPTCHA/block；它不是稳定商业 quota 或 SLA。[limiter](https://docs.searxng.org/admin/searx.limiter.html) | 官方提供 Docker/Podman image 与 Compose 路径；代码为 AGPL-3.0-or-later。实例 URL、JSON format 或服务未配置时返回结构化 unconfigured/unavailable，不允许改用公共随机实例。[容器安装](https://docs.searxng.org/admin/installation-docker)、[LICENSE](https://github.com/searxng/searxng/blob/d226b78bc4c9ab93a84849b8ad128a68c41be17c/LICENSE) | **只适合 `web_search`**。是自托管搜索选项，不是 fetch service。 |
| **Firecrawl Cloud / self-host** | `/v2/search` 可搜索 Web，并可对结果继续 scrape；self-host 官方测试使用 JSON-enabled SearXNG，因此 self-host search 的覆盖/质量继承 SearXNG/所配 provider，不是 Firecrawl 独立 index 的证明。[Search endpoint](https://docs.firecrawl.dev/api-reference/endpoint/search)、[self-host SearXNG 测试配置](https://github.com/firecrawl/firecrawl/blob/9bf1242b9562cfc710b85cd74127f2628561737a/.github/workflows/test-server.yml) | `/v2/scrape` 支持 Markdown、HTML、raw HTML、links 和 JSON 等格式，且有 main-content filter；动态页面可走 Playwright。这是候选中最完整的 extraction surface。[Scrape endpoint](https://docs.firecrawl.dev/api-reference/endpoint/scrape) | **原样不合格。** 官方 API 暴露 arbitrary headers/cookies、TLS verification bypass、proxy、PDF 和 browser actions；self-host safe dispatcher 虽在 socket connect 后拒绝非 `unicast` remote address，却把 redirect cap 设为 5000，并创建 CookieJar。Firecrawl 自己的 SSRF 公告记录了 redirect 到本地 IP 的漏洞，并建议部署能阻断 link-local 的安全代理。项目若采用，必须删除危险参数、禁 Cookie、降低 redirect cap，并对所有 engine 路径做同一安全验收。[safe dispatcher 源码](https://github.com/firecrawl/firecrawl/blob/9bf1242b9562cfc710b85cd74127f2628561737a/apps/api/src/scraper/scrapeURL/engines/utils/safeFetch.ts#L15-L95)、[官方 SSRF 公告](https://github.com/firecrawl/firecrawl/security/advisories/GHSA-vjp8-2wgg-p734) | API 有 request timeout，但没有与本项目相同的 text/JSON-only MIME、解压后响应 byte cap 证明；官方 scrape API还明确支持 PDF/base64。内部有 AbortSignal 管理，但同步 scrape/search 没有公开的逐调用 cancel endpoint。Zotero abort 只能停止到 Firecrawl API 的客户端请求。[AbortManager](https://github.com/firecrawl/firecrawl/blob/9bf1242b9562cfc710b85cd74127f2628561737a/apps/api/src/scraper/scrapeURL/lib/abortManager.ts) | Cloud 使用 bearer key；当前 free 1,000 credits/月，scrape 1 credit/page、search 2 credits/10 results，超 rate/concurrency 返回 429。self-host 基线默认未认证，官方要求离开可信网络前自行加认证、TLS 和 network policy。[pricing](https://www.firecrawl.dev/pricing)、[API 429](https://docs.firecrawl.dev/api-reference/v2-introduction)、[SELF_HOST](https://github.com/firecrawl/firecrawl/blob/9bf1242b9562cfc710b85cd74127f2628561737a/SELF_HOST.md) | 核心为 AGPL-3.0，提供官方 container；self-host 同时运行 API/workers、Playwright、Redis、RabbitMQ、PostgreSQL 等，运维面明显大于 SearXNG。Cloud/self-host 未配置时必须 unavailable，不能回退 Shell。[repo/license](https://github.com/firecrawl/firecrawl) | **功能上可以，合同上不能原样启用。** 只作为后续 hardened composite backend。 |
| **Jina Reader SaaS / OSS image** | `s.jina.ai` 搜索 Web，读取 top 5 results 并转换为 LLM-friendly text；官方没有公开独立 index 或可审计 ranking 依据，故不能据此确认搜索质量。[Reader repo](https://github.com/jina-ai/reader/tree/1574bfd380d249c86c82db4dace0d9c8fe17e2b1) | `r.jina.ai/<url>` 返回适合 LLM 的抽取文本；支持 browser/proxy 和多文档格式。 | **自托管原样不合格。** 当前源码只有在 `NODE_ENV` 包含 `prod` 且存在 `GCLOUD_PROJECT` 时才启用 hostname DNS 后的 non-public-address 拒绝；普通 OSS Docker self-host 不满足这个条件。即使 SaaS 有额外控制，公开资料也不足以让项目证明逐跳 DNS/redirect parity。[URL/DNS 检查源码](https://github.com/jina-ai/reader/blob/1574bfd380d249c86c82db4dace0d9c8fe17e2b1/src/services/misc.ts#L15-L100) | 官方页面公布 RPM/token 限额，但未给出与本项目相同的 response byte、MIME、redirect 和 provider-side cancel 合同。 | SaaS 无 key 的 Read 为 20 RPM，Search 被阻止；free/paid key 的 Read 为 500 RPM、Search 为 100 RPM，按 token 计费。API key 只能由 Broker 注入。[rate/pricing](https://jina.ai/reader/) | OSS image 可用 Docker self-host，repo 声明 Apache-2.0；ReaderLM-v2 另为 CC-BY-NC 4.0，若部署路径包含该模型需单独许可复核。未配置服务/key 时 unavailable。[Docker/license 说明](https://github.com/jina-ai/reader/tree/1574bfd380d249c86c82db4dace0d9c8fe17e2b1#self-host-with-docker) | **功能上可以，当前安全证据不足。** 不进入 MVP。 |

## Zotero/Mozilla fetch 的具体可行性

### 能直接复用的能力

Zotero 7 与 9 的 `Zotero.HTTP.request()` 都已有以下 primitive：

- 关闭自动 redirect，并取得 redirect status/Location；
- 指定 response type；
- timeout；
- cancel callback；
- offline detection。

Zotero 9 还明确增加 `anon`/`userContextId` 行为说明。对本工具只能用匿名路径，不能创建 cookie context。标准 `fetch()`/`Response.body` 可用于逐 chunk 计数与及时 abort，`DOMParser` 可把允许的 HTML 解析成不挂入可见 DOM 的 document，再生成纯文本。解析后的 untrusted DOM 不能插入 UI；MDN 明确把 `parseFromString()` 视为 injection sink。

### best-effort SSRF 边界

`followRedirects: false` 和 `nsIDNSService.asyncResolve()` 足以实施 MVP 的逐跳 preflight，但不能组成原子的 check-and-connect。以下事实应进入 receipt、诊断和测试说明，而不是成为无限期上线门禁：

1. 连接使用的地址是否就是刚刚检查过的地址；
2. A/AAAA 多地址是否全部检查，而不是只检查首个；
3. redirect 的 Location 是否在发起下一跳前重新走完整校验；
4. proxy、DNS-over-HTTPS、系统 DNS cache 或 re-resolution 是否造成 policy/connection 不一致；
5. 在收到 headers/body 前能否确认实际 remote address 仍为公共地址。

实现应优先检查所有 preflight A/AAAA；若 channel 暴露实际 `remoteAddress`，在接收 body 前后复核并在发现非公共地址时丢弃响应。代理代为解析、接口不可用或竞态无法消除时，请求仍可在 Public Web grant 下执行，但必须如实标为 best-effort。用户需要更强隔离时，应通过部署层网络策略或未来 Strong Executor 提供；普通插件 fetch 不冒充该能力。

### 与成熟 Agent 工具的真实实践比较

成熟产品也把 Web 能力作为有界工具提供给 Agent，而不是等待“绝对安全”证明：

- OpenAI Agents SDK 直接把 hosted `web_search` 列为 Agent tool，并提供 `allowedDomains` 等过滤选项。[OpenAI Agents SDK tools](https://openai.github.io/openai-agents-js/guides/tools/#hosted-tools)
- Anthropic 的 hosted `web_fetch` 支持 domain allow/block、`max_uses`、内容上限和稳定错误；它拒绝 private addresses，并限制自动 fetch 的 URL 必须已出现在用户消息、搜索结果或先前工具结果中。其文档同时警告不可信输入与敏感数据并存时存在外泄风险，没有把该工具描述为绝对隔离。[Anthropic Web fetch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool#tool-definition)、[URL validation 与 errors](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool#url-validation)
- GitHub Copilot cloud agent 默认以 firewall 和 allowlist 限制互联网访问，也允许管理员配置甚至关闭 firewall；官方明确承认复杂攻击可能绕过，保护常见场景但不是完整安全方案。[GitHub Copilot firewall](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-the-firewall#limitations)

由这些一手资料可作出的推论是：可用的 Agent Web 工具采用域过滤、来源与预算限制、结构化拒绝、告知和审计来降低风险，同时承认实施边界。Zotero MVP 应采用同一路径。Anthropic 的“URL 必须先出现在上下文”可作为未来可选的严格档位或审计信号；本项目既已信任 Agent，默认不禁止 Agent 构造合法公共 URL，以免削弱文档定位、API discovery 等核心用法。

## 必须由 Tool Gateway/Broker 实现的统一 adapter

无论请求最终由 provider-native search、Exa MCP、公共页面 adapter、Brave、SearXNG 或将来的 backend 执行，下面逻辑只有一份 SSOT：

1. **输入**：保持原 schema；内部限制 query/URL 长度，URL 只接受 HTTP(S) 且不得包含 userinfo。Agent 可以构造公共 URL，不要求它先出现在 transcript 或搜索结果中。
2. **provider 配置**：backend kind、base URL、provider key、预算和 timeout 都是 host config，不进入 tool schema。
3. **凭据**：只向固定 provider origin 注入该 provider 的 key；目标页面永远使用 anonymous/credentials-omit，无 Cookie、Authorization、Proxy-Authorization、client certificate 或用户 headers。
4. **搜索结果**：把 provider-specific JSON 归一为有界 title/URL/snippet；丢弃 provider 控制字段，结果 URL 不自动抓取。
5. **fetch preflight**：用平台 URL parser 规范化 URL；解析全部 A/AAAA，并按 [IANA IPv4 special-purpose registry](https://www.iana.org/assignments/iana-ipv4-special-registry) 与 [IPv6 special-purpose registry](https://www.iana.org/assignments/iana-ipv6-special-registry) 分类，不能靠字符串正则处理 IP literal。metadata 永久拒绝；其它非全局可达地址默认拒绝，只有既有 Local Network grant 可放开。公开非标准端口按 host policy 配置。
6. **redirect loop**：关闭自动 redirect；限制跳数；每一跳重新执行 URL、DNS 与地址检查。任何一跳需要 Local Network grant 时暂停，不继承上一跳的 Public Web 判断。
7. **body gate**：先检查 status 与 MIME，再流式读取；按解压后实际 byte 计数；只接受 HTML、plain text、JSON，超限立即 abort；不落盘、不返回 base64。
8. **提取**：JSON 解析后有界序列化；HTML 在隔离 document 中做确定性 text extraction。Markdown 只是输出表示，不能执行页面脚本或读取 Zotero DOM。
9. **生命周期与网络证据**：把 caller `AbortSignal`、总 timeout、idle timeout 传到底层；区分 cancel 与 timeout。可用时复核 channel `remoteAddress`；记录 direct/proxy-mediated、preflight/peer 是否可观测和策略结论，不把缺失证据写成 enforcement success。远程服务没有 provider-side cancel 证明时，诊断标成 caller-aborted，而不是 remote-cancel-confirmed。
10. **失败与 fallback**：未配置、无凭据、quota/rate、DNS policy、redirect policy、unsupported MIME、response too large、timeout、cancel 和普通 network failure 使用既定稳定 metadata。`web_search` 只可沿固定、可观察的无副作用 provider chain 前进；不得改走 Shell 或任意 HTTP，cancel 后不得继续 fallback。审计遵循既有 persistence-safe projection，不持久化页面正文、完整敏感 URL 或原始 header。

## 组合结论

| 顺序 | `web_search` | `web_fetch` | 选择理由 | 明确代价 |
| --- | --- | --- | --- | --- |
| 1 | 已配置模型 provider 的 hosted search | Zotero/Mozilla native + Broker guard | 复用用户已有账户、OAuth/API key 与 quota，不增加搜索专用配置 | provider 覆盖与费用不一致；必须由项目 adapter 归一，不能直接暴露 provider tool |
| 2 | Exa 匿名公共 MCP | 同上 | 官方远程 MCP 面向通用 client，零 key、零自部署；OpenCode 已采用同一路径 | 没有项目可依赖的长期免费或 SLA 合同，失败时必须继续降级 |
| 3 | 一个公共搜索页 adapter | 同上 | 零 key、零运营；只需维护一个最小 parser | best-effort，会受 CAPTCHA、限流、页面改版与站点条款影响 |
| 显式选项 | Brave BYOK / SearXNG self-hosted | 同上 | 用户需要更稳定或可控的搜索时主动配置 | Brave 需要账户/key，SearXNG 需要 endpoint 与运维，均不承担默认可用性 |

因此，MVP 保持两个 operation、共享一层 Broker policy：搜索使用上述最小有序链，抓取只使用 Zotero/Mozilla native。项目不运营服务，不要求用户为基础搜索先申请专用账户，也不复制 OMP 的完整多 provider/多 scraper 体系；一个匿名 MCP 和一个页面 adapter 足以覆盖零配置 fallback。远程 fetch backend 不是原生 fetch 的安全前提。

## 排除项

- **Bing Search API**：Microsoft 已于 2025-08-11 完全退役该产品；Grounding with Bing Search 属于 Azure AI Agent/provider-native surface，不能作为通用 Tool Gateway search endpoint 的等价替代。[Microsoft retirement notice](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement)
- **Google Custom Search JSON API**：已对新客户关闭，现有客户必须在 2027-01-01 前迁移；不适合作为新 MVP 的默认依赖。[Google official notice](https://developers.google.com/custom-search/v1/overview)
- **模型生成过程自行调用、未经过 Tool Gateway adapter 的 search**：不能冒充 `web_search`。由 Tool Gateway 持有 adapter、接收相同 `{ query }`、返回 provider-neutral result 并应用统一 budget/error/audit 的 provider-native search 属于选定实现路径。
- **任意 HTTP、Cookie/认证 header、二进制、Shell**：均已被上游决策排除，不因某个 backend 支持这些功能而重新进入范围。

## 上线前最小证据门禁

本票能决定 substrate，不能替实现签发 Strong network isolation 证明。实现阶段需要验证项目实际承诺的行为：

- Zotero 7 与 Zotero 9 各一次 `web_search`/`web_fetch` happy path；
- literal 与 DNS-resolved loopback/private/link-local 拒绝；
- 已知 cloud metadata address/hostname 即使存在 Local Network grant 仍拒绝；
- public URL redirect 到 private address 拒绝；
- multi-A/AAAA 中任一非公共地址导致拒绝；
- 对 private/loopback 的明确 Local Network grant 能放行原 `web_fetch`，未授权时返回既有 permission/policy 结果；
- redirect 次数、HTML/text/JSON MIME、解压后 size、总/idle timeout 和 cancellation 边界；
- anonymous request 不携带 Zotero cookie jar 或用户 Authorization；
- Agent 构造、但未预先出现在 transcript/search result 的公共 URL 可以读取；
- direct 与 proxy-mediated 路径如实报告可观测的 DNS/peer 证据；`remoteAddress` 不可用不冒充 enforced，也不单独禁用 Public Web fetch；
- 已配置 provider-native search 的归一结果、费用/quota 错误与 credential 隔离；
- Exa 匿名 MCP 的零 key happy path、timeout/rate/unavailable 降级；
- 单个公共搜索页 adapter 的 parser fixture、challenge/改版检测与稳定失败；
- 固定 provider chain 的顺序、cancel 终止和 all-failed `search_unavailable` 摘要；
- Brave/SearXNG 未配置时不影响零配置链，显式选择时返回稳定配置错误；
- backend result normalization 不改变 Agent-facing schema，且 provider-specific 字段不泄漏到模型合同。

验收结论应明确写成“已通过列出的 best-effort SSRF 防护”，不得写成“DNS rebinding 不可能”或“实际 socket 与 preflight DNS 绝对一致”。

搜索“质量”不能用供应商自述代替。应使用一小组与 Zotero 工作流相关、固定期望域/文献类型的查询比较 URL relevance、重复率、语言覆盖和空结果；该 eval 只决定默认 backend，不改变工具 schema。
