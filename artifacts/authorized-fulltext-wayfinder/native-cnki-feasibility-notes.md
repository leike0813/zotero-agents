# 知网原生路线与本项目接入事实

2026-10-22。Linux 本机 Zotero 10.0.5 已取得一篇匹配的知网 PDF：原生 HTTP.request 成功，HTTP.download 返回 HTML，匿名请求返回登录页。未安装依赖或改动生产实现；这不是 workflow 已接入的证据。

## 已明确的用户约束

- 用户最初要求明确方向并建立决策地图，随后明确授权开始原生验证；生产实现尚未授权。
- 首版先验证知网中文文献，机构为兰州交通大学，使用知网机构登录／CARSI；原生窗口登录后的单篇 PDF 路径已在本机验证。
- 首轮平台为 Linux＋Zotero 10；实际补丁版本在验证启动时读取，不据此修改项目兼容性矩阵。
- 登录与会话留本机。用户不希望依赖外部服务；若需额外安装浏览器／Python 等组件，需要重新讨论是否值得做，不能默认接受。
- 用户确认首版交互：用户批准入库后，若需要机构认证，打开本机登录窗口；用户登录完成后自动继续。
- 用户确认首版格式：仅支持 PDF。只有 CAJ 的文献保留缺全文状态，不加入 CAJ 转换、阅读或解析能力。

## 上游可复用事实

instsci 的固定基线是 `7a233a4df767c7fe64f03491ef1b6abe84d08c34`，调查见 [上游研究](./instsci-research-2026-10-22.md)。未发现知网专用适配；通用路线能否工作未实测。它依赖独立的 Python＋CloakBrowser 浏览器环境，并非可直接嵌入 Zotero 的模块。

Zotero 官方提供 [CNKI translator](https://github.com/zotero/translators/blob/7bf0dfbedea5968bfc10571e99395135f4e43527/CNKI.js#L301)。本次按该文件最后修改 commit 固定引用；文件的 `lastUpdated` 是 2023-11-27。代码：

- 搜索结果页的多条导入不获取 PDF／CAJ；详情页才尝试附件。
- [getPDF／getCAJ](https://github.com/zotero/translators/blob/7bf0dfbedea5968bfc10571e99395135f4e43527/CNKI.js#L311) 提取页面上的下载链接。
- [getAttachments](https://github.com/zotero/translators/blob/7bf0dfbedea5968bfc10571e99395135f4e43527/CNKI.js#L329) 检查 `loginuserid`，优先 PDF，其次 CAJ。

这些源码证明有可研究的既有路径，不证明当前知网页面可用，不证明目标机构登录可用，也不证明 Connector 中的会话会自动出现在 Zotero 插件浏览器里。

项目固定的 Zotero 7/9/10 基线都有 `getFileResolvers`、`downloadFirstAvailableFile` 与 `addAvailableFiles`。它们处理 DOI／页面／OA／自定义解析，不能据此推导通用 SSO 支持：

| 基线 | 源码观察 |
| --- | --- |
| [Zotero 7.0.32](https://github.com/zotero/zotero/blob/188c54c186fbbaa6889145986d43ba64160a44fa/chrome/content/zotero/xpcom/attachments.js#L1176) | 下载路径传递 CookieSandbox，部分站点回退 BrowserDownload；文件发现路径还会使用站点 sandbox。 |
| [Zotero 9.0.6](https://github.com/zotero/zotero/blob/7132587c2d6d56725debe64908733a8140bc6be3/chrome/content/zotero/xpcom/attachments.js#L1169) | 下载路径的部分站点回退为 BrowserRequest。 |
| [Zotero 10.0.1](https://github.com/zotero/zotero/blob/36749bd0bd4fdac9ee46c16f7aa7bed094a0851f/chrome/content/zotero/xpcom/browserRequest.js#L83) | BrowserRequest 描述按 userContextId 共享浏览器／HTTP cookie jar；已配置站点挑战处理不能直接视为知网 SSO 实现。 |

本地参考子模块未初始化，以上通过官方仓库固定 commit 的 raw 文件核查，没有初始化或修改子模块。

## 本项目当前链路

源码基线 `a991d608188795e5123702179d608fc6c0e43e13`。下列路径相对仓库根：

- `skills_builtin/literature-search-ingest/SKILL.md:12`：当前 Skill 明确只用公开来源，禁止使用登录会话、机构代理与浏览器自动化。新增用户授权路线需要明确调整产品合同；当前政策不能被当成此次讨论的禁止事项。
- `skills_builtin/literature-search-ingest/references/pdf-probe.md:13`：Agent 执行权威详情页、OA、公开 Web 三条 PDF 探测路线；`:148` 附近规定来源与会话限制。中文文献未被一概排除。
- `contracts/host-bridge/capabilities.v2.json` 的 `literature.ingest`：paper 目前接收 `landingUrl`、`pdfUrl` 等字段，无授权会话或 CAJ 文件输入。
- `src/modules/zoteroHostCapabilityBroker.ts:4232`：下载到 staging，再 prepared-file 校验与导入；`:4300` 的 `attachPdfBestEffort` 失败形成可选 enrichment failure。现有 PDF 路线在 Host 侧实际下载，不是 Agent 已经下载文件。
- `src/modules/zoteroHost/zoteroHostNativeMutations.ts:298`：当前 adapter 调用 `Zotero.HTTP.download`，仅显式传递 Referer；没有负责建立或选择机构登录会话。不能从未传 cookie 参数就断言底层请求必然匿名，实际 jar／上下文需要验证。
- `src/modules/zoteroHostCapabilityBroker.ts` 的 `attachments.create` 已支持 prepared stored-file／stored-url／linked-url；后续应先比较已有能力，尚未决定必须扩展 `literature.ingest`。
- `workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs:53`：结果标签使用 PDF 状态判断 `status:need-fulltext`。若支持 CAJ，需要明确「已保存正文」的语义及后续消费者能力，不能只增加下载分支。
- 现有相关测试位于 `tests/workflows/137-literature-search-ingest-workflow.test.ts`、`tests/runtime/192-literature-search-ingest-skill-runtime.test.ts`、`tests/zotero-host/102-zotero-host-broker-capability-api.test.ts`。本次未运行，也不将 HTTP 桩测试当作真实机构授权证据。

## 由此提出的验证，尚非实现决定

先选用户真实有权访问的机构入口，在 Zotero 原生浏览器中验证登录、进入论文详情页、从同一授权上下文取得匹配文件；记录 PDF／CAJ、登录过期和窗口关闭的结果。原型只获取文件事实，不调用会直接写库的原生便捷方法去绕过 canonical mutation。

只有这一步成立，才决定 workflow 如何发起／等待、文件如何受控导入、已有条目如何补全文、部分成功如何报告。若只能借助外部运行时，先回到「继续、辅助操作或停止」的产品决策。上述结论均未承诺成功率。

## 兰州交通大学公开入口调查

用户已指定兰州交通大学。2026-10-22 核查官方来源，未登录或提交认证：

- [网络信息中心 CARSI 通知](https://nic.lzjtu.edu.cn/info/1115/1510.htm)，2020-02-25：学校说明可在校外不经 VPN 访问知网等资源；知网步骤为进入资源访问入口、选择兰州交通大学并完成统一身份认证，随后可查找下载文献。本次直接访问返回 HTTP 412，内容通过搜索引擎收录的官方页面正文核查；不能据此确认当前流程、订阅范围或下载可用性。
- [学校 IdP 首页](https://idp.lzjtu.edu.cn/)：搜索索引仍列出中国知网 CNKI 校外访问入口。直接读取未取得可解析正文；最近的索引记录不等于成功登录证据。
- [WebVPN 上线公告](https://www.lzjtu.edu.cn/info/1062/7610.htm)，2020-04-17：本次取得完整正文。公告说明 WebVPN 已接统一身份认证，无需安装 VPN 客户端，可从网上办事大厅或 `webvpn.lzjtu.edu.cn` 进入。公告还说明将停止旧图书馆校外入口，不能用它推导独立 CARSI 服务也已停止。

用户随后确认，当前可正常下载论文的路径为知网机构登录／CARSI，选择兰州交通大学。这是用户的普通浏览器使用反馈，首轮据此验证 CARSI；WebVPN 不纳入首轮。学校已有的访问服务与插件新增的下载运行时是两项不同前提；现有证据支持先尝试浏览器认证路径，不证明 Zotero 内置浏览器能完成整个过程。

首轮实际平台为 Linux＋Zotero 10.0.5，已选定一篇知网首页真实链接指向的期刊论文，取得 PDF。CAJ 未测试。校园网 Portal 的无客户端说明不能被用来证明所有 VPN 业务都无客户端；本调查未作这种外推。

## Linux／Zotero 10 最小原生验证方案

以下为已获用户批准的验证方案；实际执行进度单独记录于下节。

1. 使用项目既有 Zotero 测试基础设施和隔离 profile，记录实际版本。真实库／profile 仅作只读来源，不在用户原库中验证写入；首轮文件只进入临时目录。
2. 正式验证前，用户在其已有授权范围中选一篇普通浏览器可下载 PDF 的知网期刊论文。论文身份留本机核对，issue 仅记录去标识化样本类别与结果；若遇仅提供 CAJ 的样本，单独记录格式限制。
3. 在 Zotero 原生可见窗口完成 CARSI 登录，由用户输入凭证。观察返回知网页面后的机构授权状态，不读取或导出 cookie／令牌。
4. 分开验证「原生浏览器内下载」与「插件 Host 下载」：先确认同一窗口能取得目标文件，再检查明确选定的同一授权上下文能否供 Host 下载使用。浏览器下载成功不能算 Host 请求成功；不以跨进程复制 cookie 补足证据。
5. 验证所得文件可作为 PDF 读取、与目标论文一致，并记录登录页伪装下载、授权缺失、窗口关闭／会话过期的适用结果。只保存必要的结构化诊断，不记录凭证、临时签名 URL、论文正文或用户身份。
6. 通过标准是 CARSI 登录和 Host 原生取文件在 Linux／Zotero 10 连通。原生浏览器成功而 Host 失败，只能得出辅助操作路径的可行性；若登录或文件获取受阻，记录失败阶段并返回产品取舍，不自动引入外部组件。CAJ 保存、阅读和解析分别判定，不做格式转换。

本轮不接 workflow、不改 canonical mutation、不安装组件，也不自动把文件写入 Zotero。后续受控附件导入与幂等／审批由接入契约票决定。

## 原生验证结果：单篇样本取正文成功

用户已明确授权开始验证。实际使用全新隔离 profile／data，在 Linux 桌面启动原生 Zotero；未加载插件，未访问或修改用户原库。本轮是原生可行性 spike，不是插件 System E2E。

进程内回读确认实际版本为 **Zotero 10.0.5**，profile 和 data 均为本轮隔离目录。安装树目录仍标为 10.0.2，但其 application.ini 和运行时版本均为 10.0.5；不将目录名用作版本证据，不修改安装树或兼容性矩阵。

已取得的原生证据：

| 阶段 | 观察 |
| --- | --- |
| 学校 IdP 首页 | Zotero 原生 viewer HTTP 200，解析出知网入口 fsso.cnki.net。 |
| 知网机构选择页 | 原生 viewer HTTP 200，从当前页面找到兰州交通大学的机构入口。 |
| 机构跳转 | 已进入 authserver.lzjtu.edu.cn，HTTP 200，密码框存在；未读取任何输入值。 |
| 用户认证 | 用户亲自登录；随后同会话 HTTP.request 取得 PDF，匿名对照返回登录页 HTML。 |
| 论文详情 | 从知网当前首页的实际链接，在同一 viewer 直接导航到详情页，HTTP 200；确认标题、正文相关结构及 PDF／CAJ／HTML 入口。 |
| 正文与 Host 下载 | HTTP.request 取得 649859 字节的 6 页 PDF，解析可读，前两页中找到与详情页一致的标题。 |
| 现有 HTTP.download | 同一页面 PDF 入口返回 HTTP 200、5786 字节的 text/html，不是 PDF；未保留该 HTML 文件。 |
| 匿名对照 | 同一入口返回 login.cnki.net 的 text/html、18555 字节，不是 PDF。 |

GUI 自动化接口因缺 AT-SPI 依赖不可用，未安装组件；采用现有 RDP 协议与 Zotero 自带 PageData actor 做有界检查。临时 RDP 客户端复用项目的 RdpClient，并在临时副本中修正 UTF-8 帧解析、支持 evaluateJSAsync 回读；实际中文机构页回读成功。没有把这些改动引入生产工具链。

本轮使用干净 profile 的默认 cookie 上下文 userContextId 0，和日常 profile 相互独立；没有读取或导出 cookie／令牌。实际 10.0.5 的 HTTP.download 已采用流式 fetch 路径，因此后续必须独立验证 request 与 download，不能仅凭旧版接口实现外推。

用户反馈登录后，窗口一度停留在机构列表页，随后进入知网首页。用户无法在 viewer 中打开论文，明确要求代理代为打开。当前首页发现 19 条真实论文详情链接，其中一条经原生 viewer 的 loadURI 在同一窗口打开；没有猜造文章地址。首页大量入口使用 target=_blank，但未通过点击重现来证明它就是导航受阻的原因，因此不作根因结论。

详情页最前面的 h1 属于自动登录组件，初始通用标题探测误把它当作文章标题；随后通过页面标题与正文区域的标题交叉核对，确认正确文章，并按可见的 PDF 下载控件定位到唯一直接下载候选。未将这组临时站点选择器引入生产实现。

等待用户选文期间进行了只含合成 cookie 的本机 loopback 校准。标准库测试 peer 不参与生产方案，已结束；没有向它发送账号、机构会话或论文信息。分别对默认 jar 与新建隔离 context 执行 set/check，匿名请求为负对照。两轮控制均有效：

| 原生 API | 默认上下文 | 显式隔离上下文 |
| --- | --- | --- |
| HTTP.request | 返回合成 cookie 存在 | 返回合成 cookie 存在 |
| 匿名 HTTP.request | 返回合成 cookie 不存在 | 返回合成 cookie 不存在 |
| HTTP.download | 下载结果中合成 cookie 不存在 | 下载结果中合成 cookie 不存在 |

校准说明本机实际 10.0.5 的 request 与 download 不能被视为相同会话通道，也与安装树中 download 的流式 fetch 实现一致。后续实际知网探测得到同方向的结果：request 取得真实 PDF，download 取得 HTML，匿名 request 返回登录页。由此支持原生授权取文件路径的可行性，但不证明所有站点、其他安装树或用户均相同；尚未修改插件下载实现。

PDF 使用既有共享环境中的 PyMuPDF 离线验证，断言可读、非加密、页数为正，并在前两页文本中核对规范化标题。诊断只输出字节数、页数和匹配布尔值；原始 PDF、标题核对文件与临时链接留在本机忽略目录，未写入研究仓库或 GitHub。该离线诊断工具不是拟引入的产品运行时依赖。

当前结论：不必先引入 instsci 的 Python／CloakBrowser 即可继续设计，但现有插件 HTTP.download 路径不能按本次结果直接宣称已支持授权下载。生产接入仍需决定浏览器交互与会话所有权、受控文件导入、取消／恢复及授权失败处理。窗口关闭与授权缺失的追加验证见下节；CAJ、真实会话过期、插件实际入库及其他 Zotero 版本仍未测试。

私有 run-info 位于本机忽略目录 .scaffold/test/cnki-native-8eLXyY/；临时脚本位于 /tmp。Zotero 窗口保留在论文详情页，PDF 仅保存在隔离临时目录，未写入文献库。仓库研究材料和 issue 仅保存去标识化阶段事实。

## 追加原生验证：窗口生命周期与授权缺失

2026-10-22，继续使用同一个 Linux／Zotero 10.0.5 隔离进程，未加载插件、未写库、未读取或清除用户 cookie。用户此前已完成的认证继续留在本机。

| 用例 | 观察 | 能支持的结论 |
| --- | --- | --- |
| 关闭 viewer 后请求先前保存的 PDF 链接 | HTTP 200、text/html、6203 字节，最终为 bar.cnki.net。 | 旧下载链接不能作为长期有效的正文地址；单次失败不能归因于关闭窗口或授权过期。 |
| 重新打开相同论文详情页 | HTTP 200，标题与原样本一致，PDF／CAJ／HTML 控件存在；页面提供的 PDF 地址已变化。 | 页面可重新取得下载候选，不应只重试历史临时链接。 |
| 使用刷新后的 PDF 链接 | 无需再次登录，HTTP 200、application/pdf、649859 字节；离线核验为 6 页、非加密，标题匹配。 | 本次重开页面后仍可利用原会话取得匹配正文。 |
| 对同一个刷新链接做关闭前／后对照 | 关闭前后均为 HTTP 200、application/pdf、649859 字节、PDF 文件头；随后恢复原论文窗口。 | 在本次默认上下文中，关闭 viewer 不会立即清除会话，也不会使该新链接立即失效。不能承诺重启进程后的会话寿命。 |
| 显式新建未认证上下文请求同一论文 PDF 入口 | HTTP 200、text/html、18555 字节，最终为 login.cnki.net，密码框存在，无 PDF 文件头；新上下文随后 dispose。 | 未授权时可能以 200 返回登录 HTML，必须核验正文。它是授权缺失对照，不是真实到期／续期测试。 |

未等待机构会话自然过期，也未登出或删除现有认证来模拟到期。真实会话到期、重新认证后的自动续行仍属后续验收缺口；不得把匿名或新上下文对照写成到期测试通过。

当前样本提供 PDF 和 CAJ 入口，但只下载并校验 PDF。CAJ 文件的真实可得性及 CAJ-only 样本未验证；用户已经将首版范围定为 PDF-only，因此本轮不额外下载 CAJ。

官方 translator 的 URL 候选检测在当前详情地址找到 CNKI，translator ID 为 `5c95b67b-41c5-4f55-b71a-48d5d7183063`，lastUpdated 为 `2023-11-27 05:30:22`。随后采用实际安装包中的 `RemoteTranslate`，对原生 remote browser 执行页面检测：识别出 CNKI、类型为 journalArticle。以 `translate({libraryID:false})` 禁用保存后尝试 metadata 提取，返回空列表，没有可核验条目或附件；未查明空结果的原因，也未做官方 translator 附件写库。因而不能将「页面可识别」写成「官方 translator 已完成可复用的 metadata／全文导入」。

API 证据来自实际安装树的 `app/omni.ja`：`chrome/content/zotero/RemoteTranslate.mjs:55` 绑定 remote browser，`:150` 进行页面检测，`:163` 提供 translate，`:172` 和 `:220` 区分保存与仅返回 JSON，`:256` dispose；本轮明确禁用错误上报并在结束时 dispose。未调用默认保存分支。

两次简化检测不作为站点兼容性结论：XHR document 没有 location，未运行检测；将 viewer HTML 解析为 detached DOM 后检测返回空候选。最终采用上述原生 RemoteTranslate 的实际页面检测结果。

本轮可行性结论限定为「原生认证＋受同一上下文控制的 HTTP.request 能取得匹配 PDF」，足以进入后续产品与接入决策；它不宣称 workflow、官方 translator 完整入库、自动认证完成判定、真实到期后续行或跨版本验收已完成。

## 已确认的首版产品方向与下一步

单篇原生证据支持继续设计。用户在后续讨论中明确选择「打开本机登录窗口，用户登录后自动继续」及「先支持 PDF，CAJ-only 保留缺全文状态」。这两项是产品决定；不表示已批准具体宿主接口或进入生产实现。

用户随后采纳了首版范围与止损方式的两项推荐：继续原生方案，先做 Linux／Zotero 10 试点，以兰州交通大学 CARSI 为首个验收样本；其他机构、入口和平台逐步验证，不据当前单篇证据宣称支持。如果原生方案在后续验收中无法稳定完成「用户登录后自动取得匹配 PDF」，或必须新增外部下载运行时，则延期自动取全文功能，保留现有检索入库流程；本轮不将它改成手动下载后导入的新功能。该延期条件针对功能整体达不到验收标准，单篇无权限或 CAJ-only 仍按缺全文处理。

此决定完成产品取舍，允许继续接入契约设计；尚未批准生产实现，也没有改变插件整体的 Zotero 7／9／10 支持声明。当前实际取文件证据来自 Linux／10.0.5，试点发布前仍需完成其明确支持环境的验收。

接下来的接入设计应依次收敛：

1. 登录与会话的所有权、原生窗口导航和完成判定、关闭／取消／超时／过期后的行为。用户登录期间不能长期占用 Host 写入槽或事务；不通过导出 cookie 向 Agent 交接授权。
2. 授权文件获取到现有附件导入的契约。用户明确要求由运行 literature-search-ingest Skill 的 Agent 直接通过 Host 接口导航／观察原生浏览器、利用本机机构会话取文件并获知最终附件结果。站点策略和调用编排由 Skill／Agent 持有，宿主持有原生会话与受控文件；复用 canonical mutation、prepared-file、审批与幂等。PDF 留本机只限制字节传输，不把获取过程移到 Agent 完成后的 applyResult。
3. PDF 不可得时的结构化结果、已完成元数据的保留、need-fulltext 的投影，以及旧公开 PDF 路线与新授权路线的关系。失败、取消和无权限不应被混作成功下载。
4. 将已选方案落实为 OpenSpec，列明修改范围、回归验证与真实授权验收，再实现。当前 Linux／10.0.5 样本不能外推 Zotero 7/9/10 全部环境。

本阶段没有修改 workflow、Host DTO 或插件实现；只记录决定及接入设计的待决问题。

接入草案已按用户上述纠正改为 Agent 直接调用路径，见 [接入契约草案](./integration-contract-draft.md)。用户进一步同意跨 Zotero 重启保留本机机构登录上下文，任务结束只释放页面／下载资源，机构登录的显式退出单独处理；持久化不等于延长机构授权有效期，失效仍需重新认证。此前提出的「workflow 结束清登录、默认关闭设置、10 分钟上限」未经采纳，不作为决定。当前路径不以 Workflow Host v12 扩展或 hook 并发重构为前提；跨重启保留尚未实测。

用户已同意任务内复用权限：批准本批论文后，Agent 可直接使用已保存的机构登录访问、下载这些论文，不逐次确认导航／下载，也不增加任务首次复用确认；附件写入继续执行既有 Zotero 审批。范围批准当前在 Agent 交互层，后续需将其绑定到可信 Host run 授权，不将跨任务认证持久化误当成跨任务资源操作授权。

用户已同意等待与恢复规则：认证窗口最多等待 10 分钟；关窗、取消或超时后结束等待、不连续重弹；失效下载链接刷新同篇论文页面后重试一次，仍失败则记录原因并继续其他论文；Zotero 重启保留登录配置，由用户重新发起任务，不自动重放下载／写入。这是产品合同，尚未在生产路径验证。

本轮决策已形成可交给 OpenSpec 的接入结论，详见接入契约文档的权限、接口、影响清单与最小验证章节。生产实现及跨重启真实 CARSI／到期恢复验收留待后续阶段。

## 跟踪入口

- [决策地图：评估知网授权全文获取接入 literature-search-ingest](https://github.com/leike0813/zotero-agents/issues/93)
- [静态研究：instsci 与 Zotero 的实际支持](https://github.com/leike0813/zotero-agents/issues/94)

研究文件仅存于当前工作区，未提交，GitHub issue 中的本地路径不能作为公开下载链接。
