# ChatGPT 登录宿主能力原型

这是可丢弃的能力实验，用来判断 Zotero 原生 XPCOM socket、系统浏览器跳转和 WebCrypto 能否支撑已批准的 ChatGPT 登录路线。它不实现生产登录，不联系 OpenAI，不读取现存凭据，不持久化真实 token，也不依赖 Host Bridge 的认证或 server owner。

原型由 `probe.ts` 和公开/合成 `fixtures.json` 组成，通过现有 `tests/zotero/core/lite/290-siwc-host-prototype.zotero.test.ts` 执行。普通测试运行时跳过，必须显式设置原型标志。它验证原生宿主能力，不能用浏览器页面或 Node 测试结果代替。

## 执行

在项目根目录运行；指定已核实版本的本地 Zotero 安装树。现有 runner 构建当前源码，并使用 `.scaffold/test/profile` 和 `.scaffold/test/data` 隔离运行，不使用真实库/profile。系统默认浏览器会打开一个仅含合成数据的本地回调页面。

```sh
ZOTERO_PLUGIN_ZOTERO_BIN_PATH="$HOME/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/10.0.2/Zotero_linux-x86_64/zotero" \
ZOTERO_TEST_HEADLESS=1 \
ZOTERO_SIWC_HOST_PROTOTYPE=1 \
ZOTERO_TEST_GREP='^Wayfinder69 prototype ' \
npm run test:zotero:case -- lite core
```

这台机器上述目录标签是 `10.0.2`，但 `app/application.ini` 与实际宿主均报告 **10.0.3**，BuildID `20260917164854`。本次只能记录为 10.0.3 证据；不得认证矩阵里的 10.0.1 或宣称测试了 10.0.2。没有修改安装树、矩阵或公开支持声明。

runner 的一个 Mocha case 聚合 34 项能力检查。临时回执位于 `.scaffold/test/data/siwc-host-prototype.json`；此目录会被下次测试重建。保存的去敏结果见 `result-linux.json`，其中记录实测宿主、源码基线与原型/实际构建文件身份。结果不包含请求头、回调 URL、state、verifier、code 或 JWT。

## 观察结果

Linux Zotero 10.0.3、Gecko 140.15.0 上通过全部 34 项检查：

- 宿主随机数、PKCE S256、公开 RFC 7515 RS256 正/反签名向量、合成 JWT 的签名/issuer/audience/expiry/nonce/algorithm 拒绝、受控 JWKS 缓存、未知 kid 单次刷新与换 key。
- 独立 loopback listener、端口占用回退、正确回调仅一次提交、错误与旧 state 拒绝、重复回调拒绝、同一尝试保持 callback URI。
- 在受控的延迟完成期间取消、窗口真实关闭、超时及 shutdown 信号阻止迟到提交；关闭监听后重新连接被拒绝。
- `Zotero.launchURL` 交给系统默认浏览器后，实际收到合成回调并完成；半截 HTTP 请求对应的已接受连接，在停止后由客户端观察到关闭通知，且清理在 500 ms 内完成。

这些结果支持继续采用 **原生 XPCOM + WebCrypto** 的路线，目前没有需要新增 JOSE 库的能力证据。`probe.ts` 没有实现完整生产 JWT/JWKS 输入校验、刷新/撤销、凭据存储、用户登录 UI 或生产生命周期接线，不应直接搬入生产。

## 尚未证明

Windows、macOS 和其它指定宿主版本未运行；完整 Linux/Windows 六个 blocking 单元格、macOS nonblocking 目标仍需候选验收。目录名与实际版本漂移也须在正式验收前核实。

JWT/JWKS 使用受控输入与固定测试时钟。原型中的 timeout/shutdown 是对原型 owner 的真实停止操作，未验证生产插件 shutdown 钩子；窗口关闭使用实际 Zotero chrome window 的 unload。未知 kid 的刷新次数证明这条受控路径，不证明生产网络、JWKS 缓存并发、请求上限或证书策略。

没有取得真实 OAuth、OpenAI JWKS 网络、授权范围、账户准入、token 刷新/撤销或 Responses 推理证据。这些按已经批准的认证/推理合同另行验收。最小原型不认证 Pi 1.0.0 或完成 C20。

## 向量来源

RS256 公开向量取自 [RFC 7515 Appendix A.2](https://www.rfc-editor.org/rfc/rfc7515#appendix-A.2)，PKCE 已知输入取自 [RFC 7636 Appendix B](https://www.rfc-editor.org/rfc/rfc7636#appendix-B)。其它 JWT 由临时 RSA 测试 key 签名；只保存公开 JWK 与合成签名数据，私钥未写盘。这些向量不是 OpenAI ID token，签名检查与身份字段检查分别记录。

用户已审阅并采纳原生路线与列明的验收缺口；定稿见[宿主能力原型决议](https://github.com/leike0813/zotero-agents/issues/69#issuecomment-5967192022)。本工件尚未提交。用户未授权创建研究分支、提交代码或修改生产实现，因此不执行 Prototype 技能的分支/提交建议。
