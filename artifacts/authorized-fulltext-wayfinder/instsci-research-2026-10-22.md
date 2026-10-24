# InstSci 授权全文获取能力调查（面向 Zotero literature-search-ingest 首版）

- 调查日期：2026-10-22
- 上游项目：https://github.com/Rimagination/instsci
- 固定基线：`7a233a4df767c7fe64f03491ef1b6abe84d08c34`（tag `v0.2.0`，提交日期 2026-09-29，`origin/main` 同点）
- 引用形式：`https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/<path>#L<line>`
- 调查方式：只读克隆到 `/tmp`，未执行上游代码、未安装依赖、未修改任何上游文件

## 结论

**本次源码调查未发现 CNKI 专用适配。** 对 `cnki` / `知网` / `中国知网` / `caj` 的字符串搜索及 profile／目录核对未发现 CNKI profile、专用登录入口或 CAJ 支持。这不能证明通用页面／代理路径对所有知网入口均不可用；适用性仍需实测。

因此，对于「首版跑通知网 CNKI 中文文献下载」，目前不能把 InstSci 当作已验证的实现。可参考：

1. **通用机制层**：机构身份路线策略、会话持久化的分层语义、失败分类与重试策略、证据分级（HTTP preflight vs browser verified）。
2. **单篇 WebVPN/EZproxy 抓取骨架**：`instsci/auth.py` 的 URL 加密与人工登录后复用，可作为「经高校 WebVPN 代理访问 CNKI」的通用底座——但它只服务于单篇抓取流程，不在出版社批量流程里。

置信度：CNKI 缺失为高置信（源码级全量 grep + profile/目录清单核对）；WebVPN 可覆盖 CNKI 属可行性推断，未实测。

## 一、CNKI 现状核查（逐条源码定位）

| 核查项 | 结果 | 证据锚点 |
| --- | --- | --- |
| 全库 `cnki`/`知网`/`caj` 字符串 | 0 命中 | `rg -i 'cnki|知网|caj' --exclude-dir=.git` 覆盖全部文件类型 |
| 出版社 profile 含 CNKI | 否，21 个 key 无 CNKI | publisher_profiles.py#L766 |
| 出版商访问目录含 CNKI | 否，21 个条目 | publisher_access_catalog.json#L5 |
| 浏览器验证矩阵含 CNKI | 否，21 个条目（19 success / 1 unsupported / 1 failed） | publisher_browser_verification_matrix.json#L67 |
| HTML 抽取器含 CNKI adapter | 否，仅 6 家（nature/elsevier/wiley/acs/rsc/tandfonline）+ generic 兜底 | extractors/html_extractor.py#L10 |
| CAJ 格式支持 | 否。PDF 校验硬要求 `%PDF-` magic + ≥5000 字节，CAJ 会被判 `missing_pdf_header` | pdf_bytes.py#L8、#L16、#L38 |
| 通用 PDF 链接发现是否适配当前知网 | 未验证，不能从已有通用抽取逻辑推导成功 | fetcher.py#L861、#L899 |
| `webvpn.json` 高校入口是否含 CNKI 专项 | 未发现 CNKI 专项配置；网关目录不证明某机构订阅了知网或某篇论文 | data/webvpn.json |
| 与 Zotero 的会话/接口耦合 | 无。仓库内 `zotero` 零命中；上游用自带 Chromium（CloakBrowser），不接触 Zotero API | 全库 grep；cloakbrowser_compat.py |

### 由此推出的 CNKI 现实约束（推理，非上游声明）

- **知网样本的 OA 覆盖率未知**：现有 OA 路线不能替代用户希望验证的机构授权路线；本报告没有调查知网文献的 OA 覆盖率，也不依据 DOI 前缀判断数据库归属。
- **CAJ 是格式级阻断，不是登录级阻断**：即便 WebVPN 登录成功、拿到 `.caj`/`.kdh` 文件，现有字节校验与 pymupdf 文本抽取链路都无法处理（pdf_bytes.py#L11、extractors/pdf_extractor.py）。CNKI 部分期刊提供 PDF 替代格式，该差异未做样本核查。
- **批量流程完全够不着代理层**：`publisher_batch.py` 内 `ezproxy` / `webvpn` 命中数为 0（grep 验证）。批量路线只有「出版社 profile + 可见浏览器 + 联邦 SSO」，没有 WebVPN/EZproxy URL 拼接。

## 二、机构授权路线：已实现 vs 宣称

### 2.1 已实现（源码可查）

| 能力 | 实现位置 | 机制 |
| --- | --- | --- |
| 校外联邦 SSO 优先 | institutional_identity_policy.json#L23 `identity_order` = publisher_broker → federated_sso → webvpn_broker → campus_connector → http_preflight；#L7 `preferred_off_campus_access = shibboleth_or_openathens` | 策略文件是唯一事实源，CLI `instsci identity-policy` 直接打印（cli.py#L1511） |
| 出版社页 SSO 按钮点击 | publisher_batch.py#L1087 `_click_sso_entry` | Playwright 在可见浏览器里点 `Institutional Sign In` / `Access through your organization` 等公共控件 |
| OpenAthens / WAYF 选择器 | publisher_batch.py#L1668、#L1727、#L2060 | 机构名别名匹配 + 选择器集合（institution_identity.py） |
| CARSI 门户预认证 | publisher_batch.py#L50 `https://ds.carsi.edu.cn/login/index.html`、#L627 `_preauthenticate_carsi_portal` | 先在同 profile 里走 CARSI，再进出版社页 |
| 6 家出版社的 WAYF 登录入口 | data/publisher_carsi.json（sciencedirect/springer/wiley/ieee/tandfonline/nature） | 含 `login_url`、`search_selector`、`result_selector` |
| WebVPN URL 加密 | auth.py#L34 默认 key、#L102 `convert_url`（AES-CFB 加密 hostname，路径查询原样保留） | 面向中国高校 WebVPN 网关的通用实现 |
| EZproxy 代理前缀 | auth.py#L388 `EZProxyAuth`、#L539 `get_proxied_url` | 前缀拼接 + 浏览器登录 + cookie 复用；`webvpn.json` 内 4 所香港高校为 ezproxy 类型 |
| 人工登录交接 | auth.py#L191（WebVPN，最多 10 分钟轮询）、auth.py#L452（EZproxy） | 只检测登录页离开/网关 cookie，不代填凭据 |
| 人工输入登录凭证 | 已查的登录流程由用户在可见浏览器中完成；机构搜索框由代码填写 | 不据此推断整个程序没有其他凭证存储；浏览器 profile 和 cookie 文件本身含敏感会话状态 |
| 本地 SOCKS 连接器 | cli.py#L1683 `--connector-url socks5://…` | EasyConnect/aTrust 场景，登录由本地客户端完成 |
| 单篇抓取七步流水线 | fetcher.py#L185–#L255 | OA → Elsevier API → DOI 解析 → CARSI → 直连 PDF → 浏览器 PDF → WebVPN 兜底 |

### 2.2 宣称多于实现（需要独立验证的部分）

- **浏览器验证矩阵的 19 个 `success`**：矩阵自述 `verdict_source = InstSci built-in CloakBrowser workflow`、`last_browser_verification = 2026-06-07`（publisher_browser_verification_matrix.json#L3），但其 `source_runs` 指向 `downloads\…` 形式的本地路径，**这些原始产物不在仓库内**。只能读到结论断言，读不到截图/PDF 证据。本报告不把这些 `success` 当作独立验证证据。
- **同矩阵里 Elsevier 自身是 `failed`（`challenge_or_viewer_timeout`）、APS 是 `unsupported`（`institution_login_unsupported`）**。同一套机制对不同出版社结论相反，说明路线对出版社高度敏感，不能推广。
- **`personal_or_library_subscription` 被列为闭源访问的合法前提之一**：17 处出版商条目的 `closed_access_requires` 都写着 `institutional_ip_or_proxy` / `federated_sso_or_openathens` / `personal_or_library_subscription`（示例：publisher_access_catalog.json#L16）。这是上游对「个人订阅也是授权来源」的建模，值得借鉴，但只是策略声明，不是任何出版社的授权承诺。
- **策略文件里的机构结论只有清华一例**：`institutional_findings` 仅记录 `tsinghua_library_notice_2026_06_07` 与 `tsinghua_webvpn_2026_06_07`，且 WebVPN 结论是 `not_universal_pdf_route`（登录成功但导出 cookie 无法还原完整会话、同一 live context 也未能对抽样出版社直接抓 PDF）。该文件同时声明「不得把清华当默认机构」。

## 三、持久会话怎么工作（首版最相关的部分）

上游把「登录态」拆成三层，语义不同、可信度不同。这套分层是 InstSci 最值得迁移到 Zotero 侧的设计。

| 层 | 位置 | 内容 | 上游自述的效力范围 |
| --- | --- | --- | --- |
| L1 浏览器 profile | `~/.instsci/chrome-profile`（config.py#L45） | Playwright `launch_persistent_context`（publisher_batch.py#L602），保留 cookies/localStorage/IndexedDB/cache | 策略文件写 `verdict_scope: "browser startup hint"`，且重启后仍可能丢失 TLS 会话与 challenge 状态（institutional_identity_policy.json#L87） |
| L2 导出的 cookie | `~/.instsci/cookies.json`（WebVPN/EZproxy）、`~/.instsci/carsi_cookies/<publisher>.json`（逐出版社） | session_store.py#L14 `CookieStore` | 策略文件明确 `verdict_scope: "HTTP preflight only"`（#L83） |
| L3 长驻 broker | `~/.instsci/brokers/<publisher>/`（session_broker.py#L24） | 每出版社一个子进程 + 一个活的 CloakBrowser context，任务走文件队列 | 上游推荐复用活会话；broker state **刻意不存 cookie 值**（session_broker.py#L6），这不表示 profile／cookie 文件也不含会话值 |

策略文件列出的「不可导出状态」清单值得借鉴：TLS session、浏览器指纹、WebVPN 内存态、Cloudflare/WAF challenge state、页面生成的 PDF token、HTTP/2 连接态（institutional_identity_policy.json#L91）。一句话：**cookie 导出 ≠ 完整登录态**。

会话诊断工具 `instsci session-doctor` 只报 host 名与 cookie 数量，**从不读 cookie 值**（profile_health.py#L68），可作为 Zotero 侧同类诊断的参考形状。

并行 worker 会复制 profile 目录（publisher_batch.py#L572 `_prepare_worker_profile`），复制时排除 Singleton/Cache 等目录。

## 四、失败恢复与证据分级

- 失败分类（retry_policy.py#L6）：`transient`（pdf_not_captured / timeout / rate_limited 等）、`human_action`（sso_required / auth_required / captcha_required / challenge_or_viewer_timeout 等）、`access_denied`（not_entitled / access_denied）、其余 `attention_required`。
- 自动重试只针对 transient：30 秒冷却、单线程一轮、条目间隔 5 秒（retry_policy.py#L4）。human_action 类**故意不自动重试**。
- 显式恢复：`instsci jobs resume <id>`（全部未完成）与 `--transient-only`（仅瞬时失败）（cli.py#L1131）。
- 证据分级是硬规则：`final_pdf_verdict_requires = "visible_cloakbrowser"`（institutional_identity_policy.json#L22），HTTP 探测只算 preflight。
- 成功判定不只看「拿到文件」：manifest 里 `success` 要求正文抽取后与 DOI/标题匹配，否则降级 `unverified`；无文件为 `missing`（publisher_batch.py#L3906 `_write_complete_artifacts`）。

## 五、可暴露的 CLI / API 面

- CLI 入口 `instsci` 与 `instsci-mcp`（pyproject.toml#L21）。包未发布到 PyPI（`https://pypi.org/pypi/instsci/json` 返回 404，2026-10-22），只能从 Git 安装。
- CLI 命令 27 个，覆盖：环境配置（`setup` / `config-cmd` / `schools`）、登录（`login` / `federated-login` / `elsevier-setup`）、检索与抓取（`search` / `fetch` / `batch` / `papers` / `publisher-batch` / `queue`）、任务恢复（`jobs list|status|tail|resume|cancel`）、诊断（`session-doctor` / `publisher-doctor` / `identity-policy`）、broker（`session-broker-status|stop`）。
- MCP 8 个工具（mcp_server.py#L182 起）：`get_institutional_identity_policy`、`get_publisher_access_catalog`、`get_publisher_browser_verification_matrix`、`plan_publisher_pdf_workflow`（只规划不下载）、`configure_school`、`fetch_paper`、`search_papers`、`get_paper_metadata`。
- **对 Zotero 侧最有复用价值的其实是三个只读 JSON**（`instsci/data/*.json`），它们把「身份路线 + 出版商路由 + 登录入口提示 + 持久化建议 + 证据口径」做成了机器可读的事实源，正好对上项目既有的「DTO/Schema 先行、单一事实源」约束。

## 六、运行时与依赖

- Python ≥3.10；依赖 typer / rich / requests / beautifulsoup4 / lxml / cloakbrowser≥0.3.31 / pymupdf / mcp[cli] / pycryptodome（pyproject.toml#L9–#L20）。
- CloakBrowser 自带 Chromium，首次使用时下载到 `instsci/_browsers/cloakbrowser`（已 gitignore）。
- Python 3.14+ 直接拒绝走浏览器路径（Playwright sync API 与 asyncio loop 冲突），OA/HTTP 路径仍可用（cloakbrowser_compat.py#L22）。
- **无 Zotero 依赖**：全库 `zotero` 零命中；上游通过自带 Chromium 工作，不经 Zotero 插件 API。
- 运行时状态全部本地：`~/.instsci/`（config.json、cookies.json、chrome-profile/、carsi_cookies/、brokers/、runs/），全部 gitignore（.gitignore）。

## 七、许可证与适配注意事项

上游为 MIT（LICENSE#L1，Copyright (c) 2025 InstSci contributors）。

需要克制表述的地方：

- MIT 授予的是**软件著作权**层面的使用、修改、分发、合并许可，附带「保留版权与许可声明」「软件按现状提供、不作担保」的条件。
- **MIT 不涉及也不承诺任何机构授权范围、出版社许可条款、或下载行为的合规性**。上游代码能在技术上走通 SSO/WebVPN，不代表使用者自动获得该出版社或机构的下载授权；授权归属使用者与其订阅关系。
- 因此复用上游代码/数据，与「首版能合法下载 CNKI 中文文献」是两个独立问题，不能互相推导。
- 引入方式上建议按 MIT 条款保留版权与许可声明（含 `instsci/data/*.json` 这类派生数据文件）。

## 八、冲突与不确定

- **README 与代码不一致处**：README 中文段称「支持 100+ 中国高校」，实测 `webvpn.json` 为 147 所、类型分布 138/4/3/2，与「100+」不冲突但 README 未提 ezproxy 只有 4 所；README 徽章写版本 `0.1.0`，`pyproject.toml` 已是 `0.2.0`（徽章陈旧）。
- **EZproxy/WebVPN 未接入批量流程**：`publisher_batch.py` 内两者 grep 命中 0，说明 `papers` / `publisher-batch` 主流程不覆盖代理层。这是「宣称支持 WebVPN/EZproxy」与「实际可用范围」之间的实际落差，引用时须带上。
- **出版社能力矩阵不可独立复核**：`source_runs` 指向仓库外本地路径，原始证据不在仓库内；本报告只引用其结论字段，不作为独立验证。
- **CNKI 站点行为尚未验证**：未发现专用适配是源码观察；通用路线能否工作、授权成功率和样本的 CAJ/PDF 分布均未知。
- **未做**：未执行上游代码、未安装依赖、未做真实浏览器登录、未做 CNKI 站点实际探查、未逐出版社深挖（按用户指示收敛范围）。

## 九、对首版决策地图的含义

1. **不能把 InstSci 当成已验证的 CNKI 下载器**。本次未发现 CNKI 专用适配。优先调查 Zotero 已有 CNKI translator 和原生浏览器路径；尚不能判断是否需要新增站点适配，更不能判断必须从零编写。
2. **可迁移的是「授权会话怎么管」这套模型**：机构身份解析顺序（显式 → 配置 → 交互询问，禁止硬编码默认学校）、会话三层持久化与其各自的证据效力、cookie ≠ 完整登录态、失败四分类与「human_action 不自动重试」、最终结论必须来自可见浏览器而非 HTTP 探测。
3. **落到 Zotero 侧的会话现实**：上游不接触 Zotero，也没有与 Zotero 会话共享的实现，因此 Zotero 7 的 `CookieSandbox`+`BrowserDownload` 与 9/10 的 `BrowserRequest` 是独立面；InstSci 的 L1/L2/L3 分层无法直接映射到 Zotero 的浏览器请求模型，需要在 Zotero 侧单独设计持久化与凭据交接（用户已定：会话仅留本机）。
4. **格式与入口应分别验证**：具体样本是否提供 PDF／CAJ、现有标识符是否够用、能否保存附件、能否原生阅读和参与后续分析，是不同问题。不能把 CAJ 存储成功当成阅读或解析成功，也不能把 DOI 路线一概判为不适用。

## 来源

- 仓库固定基线：https://github.com/Rimagination/instsci/tree/7a233a4df767c7fe64f03491ef1b6abe84d08c34 （tag `v0.2.0`，2026-09-29）
- 许可证：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/LICENSE
- 机构身份策略：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/instsci/data/institutional_identity_policy.json
- 出版商访问目录：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/instsci/data/publisher_access_catalog.json
- 浏览器验证矩阵：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/instsci/data/publisher_browser_verification_matrix.json
- CARSI/WAYF 入口表：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/instsci/data/publisher_carsi.json
- 认证实现（WebVPN/EZproxy）：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/instsci/auth.py
- 浏览器批量流程：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/instsci/publisher_batch.py
- 会话 broker：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/instsci/session_broker.py
- 失败分类：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/instsci/retry_policy.py
- MCP 服务：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/instsci/mcp_server.py
- 打包与依赖：https://github.com/Rimagination/instsci/blob/7a233a4df767c7fe64f03491ef1b6abe84d08c34/pyproject.toml
- PyPI 未发布核验：`https://pypi.org/pypi/instsci/json` → HTTP 404（2026-10-22）
