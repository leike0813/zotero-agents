# Pi Runtime 候选验收

C20 的验收依据是 [#26](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5551922404)。矩阵目标只读取 `tests/zotero/compatibility-matrix.json`。当前工作树中的开发运行可定位问题；正式证据必须绑定 clean commit、正式 XPI SHA-256、宿主和测试配置。

## Pi SDK 升级阶段

`upgrade-builtin-pi-runtime` 固定 core/ai 为 1.0.0。Runtime 的每次 `prepareRequest` 返回完整归一化消息与执行工具，`finishTurn` 按项目等待、未知效果和取消状态结束循环；估算器使用 Pi AI 的完整指令、工具声明与消息。执行版本从根依赖声明读取，历史冻结选择不改写。模型目录独立更新、ChatGPT 登录和搜索迁移由后续 change 承担。

本阶段使用 dirty 工作树获得开发证据。具体命令、版本、失败尝试及待补矩阵见 `openspec/changes/upgrade-builtin-pi-runtime/verification.md`，不得据此完成 C20。

定向 core 用例可经现有 `ZOTERO_TEST_ENTRY` 覆盖入口组合：276 Runtime、278 Provider configuration、280 Provider execution、281 Preparation。临时入口放在非隐藏目录，使用这些现有文件的绝对 import；worker 自动附加 compatibility probe。检查日志确实执行 Pi 用例，不能把只有 host-facts 的通过当成 SDK 验证。某个未提交原型依赖临时工作区未映射的目录时，保留原型与失败尝试，使用入口覆盖隔离本次用例。完整 owner 行为仍使用现有 `tests/zotero/e2e/full` 和 compatibility worker，并先 prepare 当前源码编译的 Synthesis sidecar。

## 固定升级基线

用户指定当前 dev HEAD `9218f30899e47d6e9b852dec978be81b1f802c2f` 为 v0.9.0 基线。从该 commit 导出到临时目录，使用既有构建工具运行 `zotero-plugin build`，保留 v0.9.0 XPI、摘要和构建身份。禁止以历史 GitHub artifact 或当前 Pi 分支生成的 v0.9.0 文件替代。

本次基线工件是 `.scaffold/pi-acceptance/baseline-v0.9.0.xpi`，身份文件 `.scaffold/pi-acceptance/baseline.json`。该文件为本地证据，不能证明 v0.9.0 已发布。升级流程先安装基线并经旧版插件创建受控 ACP/SkillRunner 配置和历史，之后安装较高版本候选并核对保留结果。每日 profile 只能作为只读复制来源。

## 运行顺序

1. 运行 `npm run test:node`、`npm run lint:check` 和 `npm run build`。运行已有 Workspace identity、安全、持久化、未知效果和 Windows stdio canary 用例，记录对应结果。
2. 运行 `npm run test:zotero:compatibility:plan -- --gate=release --json` 检查当前矩阵。formal XPI 和完整行为使用现有 matrix/worker；Pi 行为位于 `tests/zotero/e2e/full`，只通过 `npm run test:zotero:e2e` 执行。保持 profile、进程、清理和 suite health 证据。
3. 同一 source/lock/settings 进行 Pi 开启和测量排除控制构建。控制只排除 Pi 入口/注册，保留 Broker/shared。记录实际 raw/gzip/XPI 差值和浏览器导入检查。大小预算为 raw 20 MiB、gzip 1.5 MiB、XPI 2 MiB；超过任一上限须提供候选绑定的维护者批准。预算统一读取 `src/config/piRuntimeBuild.ts`。
4. 用构建期容量 4、6、8、12 分别在 Windows/Linux Zotero 10 运行混合负载。固定 60 秒预热、60 秒 idle baseline、900 秒混合负载、120 秒 settle；不使用真实服务延迟或强制 GC。选两平台共同通过的最高容量，后台上限总量减二，候选默认值需与选择一致。
5. 用固定默认容量构建 clean 最终 XPI，重新运行 mandatory automated 验收并在两平台执行 final workload。exploration 只能支撑容量选择，不能认证最终候选。
6. 逐项采集人工 receipt，聚合 JSON/Markdown；任何 required missing/failed/not_applicable 都阻止验收。发布是独立授权步骤。

matrix worker 复用 `build-root` 中已构建的插件。修改生产模块后先运行生产 `npm run build`，再运行 `npm run test:zotero:compatibility:prepare -- --gate=main --build-root=.scaffold/build`，使本地行为测试加载新插件与当前源码的本机 sidecar。正式 XPI 按下方安装候选命令准备。

## 收集命令

构建对照使用独立输出目录，测量期间保持源码和测试定义不变。构建控制只用于这对工件。

```shell
npm run measure:pi-runtime-bundle -- \
  --out .scaffold/pi-acceptance/bundle \
  --bundle .scaffold/pi-acceptance/bundle-record.json \
  --artifact .scaffold/pi-acceptance/bundle.json

npm run test:zotero:compatibility:run -- \
  --gate=acceptance --target=zotero-10-linux-x64 \
  --mode=behavior --suite=full --domain=e2e --families=PI --install-candidate-xpi

npm run test:zotero:compatibility:run -- \
  --gate=main --target=zotero-10-linux-x64 --mode=xpi-smoke \
  --suite=full --previous-xpi .scaffold/pi-acceptance/baseline-v0.9.0.xpi
```

`--families=PI` 只筛 compatibility worker 的 Phase 1 family，不限制 full E2E 中的其他 test suites。开发行为定向运行使用 `ZOTERO_TEST_GREP='System E2E (runner foundation|Phase 3 builtin Pi runtime)'`，保留 foundation 的实际宿主身份。安装链还须在 grep 中保留 `formal XPI compatibility smoke`。`release` gate 只接受 tag 候选；开发行为使用 main gate，安装完整候选使用 acceptance gate，不伪造 tag。XPI smoke 的升级路径使用 main gate，基线先于候选安装。

同一源码副本中的宿主运行须串行：wrapper 使用该副本的 `.scaffold/zotero-stderr-drain.sh`，并行运行会覆盖重启入口，导致版本串用。容量测量期间也不得并行运行其它宿主或构建负载。

Windows wrapper 只终止待重启的 Zotero owner，并观察其退出；sidecar 自行处理父输入关闭。重启快照保留数据库和宿主 profile，排除 Mozilla 进程锁与独立的 `chrome_debugger_profile`。包体对照构建须与会加载构建配置的 Node/宿主测试串行，避免生成类型变化使 `sameInputs` 失效。根 TypeScript 配置默认 `noEmit`，检查命令不得生成与 TS 并存的 JS。

容量探索每轮约 19 分钟。逐轮将 `PI_RUNTIME_CAPACITY` 设为 4、6、8、12，构建后读取该 XPI 的 SHA-256。安装候选中的 Synthesis bundle 必须与当前源码及已暂存 bundle 匹配；所有七平台 manifest 的身份也须一致。当前开发 E2E 使用本地编译 sidecar，正式 XPI smoke 使用候选自带资产，两类证据不能混用。容量 probe 不会安装 XPI，必须由现有 compatibility worker 先执行安装链。

```shell
PI_RUNTIME_CAPACITY=4 ZOTERO_BUILD_DEBUG=0 npm run build
ZOTERO_COMPAT_LANE=acceptance npm run test:zotero:compatibility:prepare -- \
  --build-root="$PWD/.scaffold/build" --install-candidate-xpi

ZOTERO_PI_CAPACITY_PROBE=1 ZOTERO_PI_CAPACITY_STAGE=exploration \
ZOTERO_TEST_PERF_PROBE=1 \
ZOTERO_TEST_PERF_PROBE_OUT="$PWD/.scaffold/pi-acceptance/capacity-4-performance.json" \
ZOTERO_PI_CAPACITY_COMMIT=<source-commit> \
ZOTERO_PI_CAPACITY_XPI_SHA256=<built-xpi-sha256> \
ZOTERO_TEST_GREP='formal XPI compatibility smoke|Pi installed XPI capacity workload' \
npm run test:zotero:compatibility:run -- \
  --gate=acceptance --target=zotero-10-linux-x64 --mode=behavior \
  --suite=full --domain=e2e --families=PI --install-candidate-xpi --timeout-ms=1500000
```

每个容量值都须重新构建、prepare/install，使用同一容量 XPI。此 grep 仅收集安装链和容量记录；matrix 会因未运行 Pi 行为组而返回 `pi_behavior_missing`，须分别检查容量记录和安装链，不能把这个定向 receipt 当作完整矩阵通过。完整 Pi 行为及完整 E2E family 验收仍须另跑。

Conversation 和 Interactive Skill Run 使用 foreground lane；Auto Skill Run（含显式继续）及启动时的安全 Skill Run 续跑使用 background lane。两槽前台预留由生产生命周期执行，容量驱动通过实际 `queue.capacity` 观察验证 lane、物理占用与准入等待，不能用测试标签代替准入证据。4/6/8/12 探索与共同容量选择以实际记录为准。

最终容量确定且源码已提交后才设置 `ZOTERO_PI_CAPACITY_STAGE=final`。开发工作树中的探索记录始终保留开发状态。

此前 C05 的真实账号测试 profile 可作为只读来源。LLM Provider 账号与 Zotero 文献金例是不同输入；文献金例本身不保证存在可用 Provider 授权。以下定向 smoke 仅读取副本中的 Codex 授权，执行官方模型发现，并使用 `gpt-6-luna`、`low` 调用生产 Conversation 模块。此前 Linux Zotero 10.0.2 的 Codex `gpt-6-luna/low` 与 MiniMax 中国区 `MiniMax-M3.1-Flash-Preview/low` test-bundle smoke 各记录 1 pass，但宿主重启后 `/tmp` 原始日志与 C05 临时来源已丢失；保留的脱敏观察不能替代重新运行、正式安装 XPI 或人工 receipt：

```shell
ZOTERO_E2E_GOLD_DATA_DIR=<read-only-data-source> \
ZOTERO_E2E_GOLD_PROFILE_DIR=<read-only-profile-source> \
ZOTERO_PI_LIVE_SMOKE=codex ZOTERO_TEST_GREP='Pi live Codex smoke' \
npm run test:zotero:e2e
```

MiniMax token plan（中国区）通过宿主环境变量 `MINIMAX_CN_API_KEY` 读取密钥；测试只在 profile 副本内保存加密凭据，密钥不写入环境 fixture、日志或工件。中国区 OpenAI 兼容端点为 `https://api.minimax.cn/v1`，模型为 `MiniMax-M3.1-Flash-Preview`；使用 `low`，协议字段为 `reasoning_effort`，省略时官方默认为 `max`，见 [官方 Text Generation 指南](https://platform.minimax.cn/docs/guides/text-generation)。目录中缺少模型时，测试经生产 refresh 通道加载受控 overlay，声明 1M 上下文、128K 输出预算和思考档位；这些属于测试配置，不是在线模型发现。smoke 断言冻结选择与流式持久化，线格式由 Provider 接口测试验证。其自动观察可供 `manual:api-key` 的人工验收参考，仍需候选绑定和 confirmer：

```shell
ZOTERO_E2E_GOLD_DATA_DIR=<read-only-data-source> \
ZOTERO_E2E_GOLD_PROFILE_DIR=<read-only-profile-source> \
ZOTERO_PI_LIVE_SMOKE=minimax-cn ZOTERO_TEST_GREP='Pi live MiniMax smoke' \
npm run test:zotero:e2e
```

登录、退出、清除后不可用和重连须分别观察并确认；旧 change 的通过记录不能自动认证当前候选。

## 证据聚合

新增证据数组的每项保存 `id`、`candidate`、`status`、`recordedAt`、`environment`、相对 `artifact`。candidate 包含 `sourceCommit`、`dirty`、`xpiSha256`、`version`、`capacity`。字段合同见 `scripts/check-pi-runtime-acceptance.ts`。正式兼容证据直接读取既有 v1 receipt，性能记录直接读取现有 performance probe。

```shell
npm run check:pi-runtime-acceptance -- \
  --xpi .scaffold/build/zotero-agents.xpi \
  --evidence .scaffold/pi-acceptance/evidence.json \
  --bundle .scaffold/pi-acceptance/bundle-record.json \
  --receipt relative/path/to/receipt.json \
  --performance relative/path/to/performance.json \
  --out .scaffold/pi-acceptance/summary
```

可重复提供 `--receipt`、`--bundle` 和 `--performance`；缺失必需项返回 2，输入失败返回 1。输入只有手工确认时才填写 `confirmer`，脚本不会自动生成人工通过。JSON 保存全部尝试，Markdown 列出 blocking/status/attempt count。不能删除失败再把重跑描述为首次通过。

现有 coordinator 使用 `--pi-acceptance .scaffold/pi-acceptance/summary.json --pi-xpi .scaffold/build/zotero-agents.xpi`。它重新计算 summary gates，并核对当前 HEAD 和实际 XPI 字节；Node full/lint、Host Bridge 和 content gates 仍独立生效。不得用一个 `--passed` 开关替代这些证据。

## 人工 inventory

固定 Zotero 10 测试环境；每条 receipt 绑定候选和 confirmer，`manual.zoteroMajor` 记录实际宿主主版本（必须为 10），`manual.observed` 保存已观察的稳定行为，`manual.sourceEvidence` 只引用脱敏的相对工件。

| ID                                | 必须观察                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `manual:api-key`                  | `streaming`                                                                                |
| `manual:codex-lifecycle`          | `login`, `streaming`, `refresh-or-reuse`, `logout`, `unavailable-after-clear`, `reconnect` |
| `manual:exa`                      | `search-results`，默认来源                                                                 |
| `manual:byok-brave-or-perplexity` | `search-results`，直接 BYOK 来源                                                           |
| `manual:openai-web-api-key`       | `search-results`                                                                           |
| `manual:openai-web-codex`         | `search-results`                                                                           |
| `manual:anthropic-search`         | `search-results`，采用已确认的 Anthropic 来源                                              |
| `manual:anonymous-fetch`          | `public-content`                                                                           |

搜索证据保留实际来源与相关结果语义，HTTP 成功不能单独满足条件。工件不含密钥、OAuth token、原始响应、私有文献内容或用户绝对路径；外部服务不可用时记录 missing/failed，推迟验收。

源码或测试定义变化后重跑 mandatory 验收，不沿用旧人工/性能通过。纯文档或归档复用须明确记录 XPI 字节和测试定义不变的依据。C20 只有全部 mandatory evidence 通过才允许完成验证、同步与归档；不得因基础设施已实现而勾选真实宿主或账号任务。
