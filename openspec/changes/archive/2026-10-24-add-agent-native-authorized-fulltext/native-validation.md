# 原生验证记录

日期：2026-10-23。记录只包含去标识化事实，不保存账号、cookie、临时签名链接、论文题名或正文。所有动作发生于此前建立的隔离 Zotero profile／data；用户真实库和默认桌面 profile 未参与。

## 当前结果

| 检查 | 结果 | 证据边界 |
| --- | --- | --- |
| 隔离进程和调试入口 | 通过 | 进程内同时核对 profile 与 data；实际 Linux／Zotero 10.0.5，原生 PageData 和调试 console 可用 |
| 命名原生上下文创建 | 通过 | ContextualIdentityService 创建独立身份；viewer 的 origin context 与创建身份一致；原生 containers 文件已生成 |
| 同进程合成认证隔离 | 通过 | 本机合成网站在指定上下文授权为 true，默认上下文为 false；没有读取或导出用户 cookie 值 |
| 合成原生文件下载 | 通过 | Downloads.createDownload 带 source.userContextId；经过 302 后取得 596 字节 PDF；离线验证 1 页、可读、合成文本匹配 |
| 合成原生下载取消 | 通过 | 下载收到部分字节后取消，原生结果 canceled=true，执行本次下载资源清理 |
| 合成较大文件及无授权对照 | 通过 | 原生文件路径传输 8,389,204 字节，JS 仅读取五字节文件头；离线核对 1 页可读且合成文本匹配。无合成授权的默认上下文返回非 PDF |
| 命名上下文跨正常重启 | 通过合成对照 | 原进程经原生 quit 正常退出，新进程读取同一 profile；命名身份恢复，合成网站在该上下文仍有授权，默认上下文仍无授权；没有重新设置 cookie |
| 命名上下文真实 CARSI | 重启前通过 | 用户完成独立登录及论文页访问验证后，取得真实匹配 PDF；此证据属于新命名上下文 |
| 真实 PDF 原生有界下载 | 通过重启前样本 | Downloads.createDownload 使用命名上下文及 referrerInfo，直接写入原生文件目标；649859 字节、application/pdf，离线核对 6 页、可读、正文标题匹配。JS 仅读取五字节文件头和文件元数据 |
| 重启后真实 PDF 获取 | 通过 | 用户完成访问验证、未重新登录，同一命名上下文取得同篇 PDF；649859 字节、application/pdf，离线核对 6 页、可读、正文标题匹配 |
| 真实显式退出 | 通过，存在控件恢复限制 | 仅清理所属 userContextId，回调失败标志为 0、命名身份保留，另一合成上下文授权前后均为 true，默认上下文仍为 false。用户完成退出后的访问验证，再从同篇论文的新目标下载：返回 18555 字节 text/html，无 PDF 文件头，存在登录提示和密码输入框 |

## 已定位的原生路径

- 原生命名身份由 ContextualIdentityService 保存到当前 profile；常规资源释放不调用身份删除。不能用 HTTP.newCookieContext 的临时 ID 当成持久身份。
- 平台 DownloadCore 在发起 channel 时设置 source.userContextId 的 origin attributes，并支持 referrerInfo、原生文件目标和取消。合成验证使用 Downloads.createDownload，数据在原生文件传输路径中处理，JS 只读取五字节文件头和文件元数据。
- 本轮临时探针复用既有 RDP evaluate 入口；它是原生可行性验证，不是生产 Agent 接口，也不是新增的 System E2E runner。正式集成测试仍使用仓库统一 runner。
- 正常退出使用隔离进程内的原生应用 quit；重新启动只使用同一隔离 profile／data 和原有调试端口。真实重启前必须确认用户已结束登录操作及当前下载已收敛。

## 本机恢复入口

私有探针环境位于既有 `.scaffold/test/cnki-native-8eLXyY`，RDP 端口为 60895。临时 evaluate 脚本位于 `/tmp/cnki-native-spike-dNxoji/evaluate.ts`；通过 `node_modules/.bin/tsx` 调用，输入 JS 文件或 `/dev/stdin`。脚本复用既有 RDP 协议，仅用于隔离实例，不属于生产授权通道。

新建真实认证上下文名为 `Zotero Agents CARSI validation`，合成上下文名为 `Zotero Agents synthetic persistence`。只按这两个测试自有名称恢复，不读取、复制或修改其他身份。进程内 `Zotero.__authorizedFulltextProbe` 保存新 viewer 和私有 context 绑定；跨重启从平台身份服务重建，不能依赖该进程内对象仍在。

合成状态记录在隔离根的 `authorized-fulltext-proof-state.json`；其中仅含合成身份和本机测试端口，不含用户认证数据。临时 loopback peer 只接收合成请求。重新启动隔离 Zotero 前应在进程内关闭自动更新偏好，再通过原生 quit 正常退出，确认准确 PID 已退出后用原安装树和相同 profile／data 参数恢复。不得终止其他 Zotero 实例或更改兼容性矩阵版本。

本轮合成传输结束后已关闭临时 loopback peer；其端口记录不代表服务仍在线。用户确认登录后，重新启动了只读合成 check endpoint：同一身份仍有授权，默认上下文无授权；没有重新设置 cookie。跨重启验证时需重新启动同一合成网站，并仅通过该网站查询合成授权是否恢复。

用户已确认新上下文登录并完成第一次访问验证。`managed-observe.js` 确认同篇论文标题和 PDF 控件，`managed-download.js` 得到重启前 PDF，离线验证通过后执行了正常退出及重启。`managed-restore.js` 只读取既有命名身份，没有新建身份或注入认证状态；它确认了命名身份及合成网站授权恢复。三个临时脚本均通过 Node 语法检查。

重启验证使用临时 `synthetic-persistence-peer.cjs` 的只读 `/check` endpoint；该脚本不含 set-cookie 路径，避免重启验证意外重建授权。重启后论文页再次要求知网访问验证，已请求用户完成验证并先不重新登录，以保留“原机构登录是否仍有效”的检验条件。没有自动处理验证控件，也没有开始后续生产实现。

用户随后反馈看不到窗口。检查发现第一次重启继承了测试终端的 `DISPLAY=:99`（Xvfb），页面实际位于不可见的虚拟显示器。已正常退出该隔离实例，在真实桌面 `DISPLAY=:0` 使用同一 profile／data 重新启动；命名身份和合成授权再次恢复，viewer 已取得焦点，屏幕宽度为 1920。没有重建登录状态。后续需要用户交互的启动必须显式选择真实桌面，不能继承测试终端的显示器设置。

用户在可见窗口完成访问验证后，`managed-observe.js` 确认同篇论文及新的 PDF 目标，`managed-download.js` 取得重启后 PDF，离线 PyMuPDF 核对可读性、页数及正文标题均通过。期间未再次登录。

显式退出使用 `Services.clearData.deleteDataFromOriginAttributesPattern({userContextId}, callback)`，等待 `onDataDeleted` 完成；平台实现仅运行支持指定 origin attributes 的 cleaner，不回退到全局清理。测试保留命名身份，关闭旧 viewer 并丢弃其目标，再重新打开同篇论文；未沿用旧签名目标作为负对照。新页面进入知网访问验证，已请用户完成验证但不要登录，后续再检查新目标的下载结果。

退出后的验证弹窗出现空白内容，用户无法操作。只读截图和页面结构确认验证内容未加载；绕过缓存重新加载时脚本及样式请求均为 200，content process 的 PageError 指向验证控件脚本并报告 `NS_ERROR_FAILURE`。关闭／重开 viewer 和强制刷新均未恢复；正常退出隔离 Zotero 并在 `DISPLAY=:0` 用同一 profile／data 重启后，用户确认控件正常并完成验证。没有再次登录、恢复 cookie 或自动执行验证。

随后确认同篇论文，取得新的 PDF 控件目标并使用原生下载：18555 字节、text/html、无 PDF 签名；本机解析确认登录提示及密码输入框。这补齐了退出后无法继续使用原机构授权下载的负对照。控件异常的根因尚未定位，不能直接归因为知网或平台；生产适配须等待所属页面实际关闭再清理状态，并验证同进程重新认证体验，不把重启要求作为正常产品行为。探针另发现 `openInViewer` 会复用尚在关闭中的同 URI/context 窗口，因此关闭后立即重开不能作为新窗口已经建立的证据。临时网络观察器在退出前已注销，诊断原始工件仅保留于隔离测试目录。

## 生产适配的本机机制验证

内容进程无法加载工作区或系统临时目录中的 actor 模块，主进程能 import 不能证明内容进程可用。将当前 `AcquisitionPageChild.sys.mjs` 打包到隔离 profile/extensions 下的 ZIP，并注册 chrome URI 后，真实知网页面观察返回 1632 字符、67 个目标，题名匹配，未输出 URL 或正文。类名与 `ZoteroAgentsAcquisitionPage` actor 注册名一致。没有关闭平台内容沙箱。

PDF.js 的 range/fake-worker 方案仍会分配整文件大小缓冲，且同线程解析不能可靠终止。用户明确接受解析阶段的有上限缓冲，下载继续走原生文件通道。生产适配选用 Zotero 自带 `resource://zotero/document-worker/worker.js` 的独立 Worker，最多读取 64 MiB 文件、提取前两页、解析 deadline 30 秒、结果文本限 128000 字符；取消或超时终止 Worker，不创建临时 Zotero attachment 来解析。

真实本机 PDF 的原生 Worker 与当前包装 Worker 两次验证均完成：6 页、提取前两页、题名匹配；包装 Worker 返回文本符合上限。该证据验证解析机制，不代替生产 Host 接口和 workflow 验收。并发下载／解析还由 owner 限制为最多两项；解析器内部解压内存不等于源文件字节上限。

## 完成判据

2026-10-24 将当前 acquisition owner、原生适配及 authority 从源码打包，在同一隔离实例以临时 chrome 包加载当前 actor、PDF 包装 Worker 和文件 range Worker，使用纯合成本机网页／PDF 验证完整适配组合。首次运行发现默认 contextual identity 可只有 l10nId 而没有 name；已修正列表过滤并增加回归测试。随后 open → observe → download → get_download 返回 ready：847 字节、1 页、可读、题名匹配。显式 signOutProfile 等待页面关闭和下载清理，观察得到 page=released、download=canceled。该合成验证未使用机构账号，也未写入文献条目；canonical 附件导入与真实 CARSI 仍需对应集成验收。

任务 1.1–1.4 的原生可行性证据已齐备。

## 真实生产 workflow 验收

2026-10-24，在相同隔离 Linux/Zotero 10.0.5 实例，MiniMax Code ACP 主 Agent 经生产 workflow submit 与任务授权，完成机构 PDF 下载、身份校验和 canonical 附件提交。实际取得 649859 字节、6 页、可读且题名匹配的 PDF；本机检查确认 stored attachment 文件存在，父条目只有一个 PDF，need-fulltext 已清除。主 Agent 的 ledger 明确记录 ready/attached，workflow 终态 succeeded。详细 run、receipt、修复及测试证据见 [verification.md](verification.md) 的真实主 Agent 成功记录。

用户在独立原生窗口先行完成同一生产认证配置的登录；之后 Agent 自行打开的任务页面复用该身份。期间插件重载后的任务恢复也保留了认证状态，但不能等同于 Zotero 进程正常重启。

后续已完成生产接口的正常进程重启复用：原生正常退出并确认旧 PID 消失，使用同一隔离 profile/data 启动新进程。新任务 `run-mvm6rf4f-a6yojtot` / `acp-skill-mvm6rf4k-rl2fkm` 的真实 MiniMax 主 Agent 以新 grant/page/download 获取新的匹配 PDF，649859 字节、6 页，readable/identityMatched 均为 true；期间没有重新登录或验证码交互。任务 release 后 succeeded，原有 PDF 附件仍为一份。此次为明确授权的重复下载验收，不附加重复文件，也不改变普通 workflow 已有 PDF 跳过策略。

显式退出后同进程再认证也已通过：从插件原生偏好面板选择唯一机构配置退出，确认 Signed out；不重启宿主，由用户在同一上下文重新登录。新真实 Agent 任务 `run-mvm7up04-0kn4xp5y` / `acp-skill-mvm7up08-6qmvjv` 的生产下载得到 ready、649859 字节、6 页、readable/identityMatched 均为 true，最终 workflow succeeded，未新增附件。先前探针的验证控件异常未在本轮复现。自然到期仍待实际站点证据，不用显式退出替代。
