# C20 开发验证记录

2026-10-03 继续 Windows 本地验证。C20 未完成，以下开发证据不认证正式候选。当前 HEAD 为 `da5ae640ff7dfb70870b3f7e32316dcfa48a77bb`；升级基线固定为 `dev@9218f30899e47d6e9b852dec978be81b1f802c2f`。本机重新导出并构建的 v0.9.0 XPI SHA-256 为 `b0750bfe57f794352b0a18de90c8a7da31d5c64cf1e7d1d6f4ae4736b945c527`，身份见 `baseline.json`。下文 Linux 记录是此前会话的历史结果；对应原始工件在本机不存在，不能认证当前源码。

本轮日志与 receipt 保存于 `.scaffold/pi-acceptance/`，不依赖 `/tmp`。旧临时日志已随宿主重启丢失，不能继续用来证明通过。失败、重跑及弃用尝试均保留，未修改原始 receipt。

## 大小规格修订

用户决定修订原先过严的大小规格，并选择 raw 上限 20 MiB，gzip/XPI 保持 1.5/2 MiB。完整模型目录保留；测量脚本和验收器复用 `src/config/piRuntimeBuild.ts` 的唯一预算定义。现有开发测量 raw `16,331,020`、gzip `929,256`、XPI `966,908` bytes 均低于新预算，最终候选实测仍在预算内时无需大小例外。

复用既有 acceptance 用例，覆盖当前 raw 数值、三项预算的等值/超一字节边界，以及超限时匹配/不匹配的人工批准。修改预算前该用例以 raw `16,331,020` 被拒失败（`c20-size-budget-red.log`）；修改后 acceptance/bundle 两文件 18 passing（`c20-size-budget-green.log`）。旧 8 MiB 规则下的测量、失败记录和开发聚合报告原样保留；dirty 状态仍阻止正式验收，clean 最终候选须按新预算重新测量。

本次修改的 TypeScript、ESLint、格式、OpenSpec strict 和 `git diff --check` 均通过，日志为 `c20-size-budget-types.log`、`c20-size-budget-lint.log`、`c20-size-budget-format.log`、`c20-size-budget-openspec.log`。验证使用既有过滤源码副本，预算常量与 acceptance 测试同步到副本；本次未重新构建 XPI 或改写任何原始验收工件。

## 本地验证与改动

- `npm run test:node` 首轮 27/28 分片通过。唯一失败为隔离源码副本遗漏 `.agents` 技能目录引起的 ENOENT；补齐链接后，`host-bridge-surface-release` 单独重跑通过。28 个分片均有通过记录，但不是一次全量通过。输出为 `c20-resume-node-full.log`、`c20-resume-node-host-bridge-r2.log`，结构汇总为 `resume-node-result.json`；runner 已清理临时逐分片目录。
- 根与 dashboard/sidebar/synthesis 三份 `tsc --noEmit`、隔离副本的 `npm run lint:check`、生产 `ZOTERO_BUILD_DEBUG=0 npm run build`、`npm run check:pi-mcp-browser-bundle` 均通过。聚合/fixture/browser 定向测试 87 passing、1 pending；既有 Auto interrupt/reply 用例通过。
- 用户随后批准 Auto 进入 background，Conversation/Interactive 保持 foreground，安全启动续跑继续 background。统一准入点复用固定 mode，Auto 显式继续也使用 background。新增既有 owner/lifecycle 参数化测试先复现 Auto 绕过后台上限，再通过；三个相关测试文件共 48 passing，受影响 `runtime-provider-execution` 分片 18 文件重跑通过。结果为 `c20-auto-lane-red.log`、`c20-auto-lane-green.log`、`c20-auto-lane-integration.log`、`c20-auto-lane-node-execution.log`。
- 新策略的生产 build、根 TypeScript 与 OpenSpec strict 通过，日志为 `c20-auto-lane-build.log`、`c20-auto-lane-types.log`、`c20-auto-lane-openspec.log`。新增 lifecycle delta 已写入本 change；主规格尚未同步。
- 修复恢复边界后的完整 Node 首轮为 27/28（`c20-r4-node-full.log`）。唯一失败是 archive 的 Gecko hash mock 精确断言普通 Array；改为接收 ArrayLike 并核对相同字节，digest 断言保留，8 文件 `workflow-host` 重跑通过（`c20-r4-node-workflow-host-r2.log`）。完整 Node 第二轮一次通过 28/28（`c20-r4-node-full-r2.log`、`r4-node-full-r2.json`），首轮失败仍保留。根 `tsc --noEmit`、完整 lint/browser guard 通过；修改后的测试文件另通过格式与 ESLint 检查。
- 收尾根类型、格式、OpenSpec strict 与 `git diff --check` 均通过，日志为 `c20-r4-final-types.log`、`c20-r4-final-format.log`、`c20-r4-final-openspec.log`。八个当前源码/测试边界与过滤副本逐字节一致；末次实际 XPI SHA-256 与测量、九份 Linux 通过 receipt 一致。收尾修改仅为验证/交接文本，没有重建或改写候选字节。

宿主测试/驱动修复：PI-04 在本 request 首个 transcript 更新时发起 interrupt；PI-05-safe 在首个模型 dispatch 前的有效 checkpoint 立即重启，并检查首次 dispatch 属于恢复后的 turn。installed UI driver 检查 Sidebar 的活动 target 后才调用公共 toggle，避免重复打开关闭现有窗口；容量身份读取使用 Zotero 10 resource channel，避免 XPI URI 中 `@` 的 HTTP username 解析失败。先前 handoff 的 `piSkillRun.loadPaused` 和 mock wire shape 修复仍保留。

## Linux 宿主尝试

旧 lane 策略的串行 Pi 行为使用同一容量 12 XPI SHA-256 `288b4f515dc1d55a29dcd23125b1ecd66a7d586f7c5cb3f408479717c2b0d1b8`，全部通过。每轮运行 PI-01–PI-04、PI-05 unknown hold/no replay 与 PI-05-safe checkpoint resume，包含两次实际宿主重启。生产策略变更后须重新验证，不能把此轮认证为新候选。

| 宿主 | Pi 行为 | receipt（相对 `.scaffold/pi-acceptance/`） |
| --- | --- | --- |
| Linux Zotero 7.0.32 | PASS | `serial-runs/zotero-7-linux-x64-988bc0cc/receipt.json` |
| Linux Zotero 9.0.6 | PASS | `serial-runs/zotero-9-linux-x64-e41c721c/receipt.json` |
| Linux Zotero 10.0.1 | PASS | `serial-runs/zotero-10-linux-x64-cd5403c2/receipt.json` |

同轮 XPI smoke 的 Zotero 9/10 fresh 与固定基线 upgrade 通过；Zotero 7 在 installed chains 阶段超时，receipt 为 `serial-runs/zotero-7-linux-x64-ef1e04e3/receipt.json`。该失败不证明基线字节错误：升级 preservation 尚未输出，matrix 因缺少 upgrade 事实报告 `pi_upgrade_baseline_mismatch`。驱动修复后将按新候选重跑，不放宽基线校验或超时。

更早 `resume-runs/` 中三个版本 fresh/upgrade 曾通过固定基线和 legacy preservation，候选 SHA 不同，保留为旧尝试。一次并行 Pi 运行出现 `host_version_mismatch`：同一副本的共享启动脚本被其它版本覆盖。该轮三个 receipt 全部弃作版本证据，原因与 run ID 保存于 `resume-parallel-discard.json`；后续严格串行。完整 core/UI/workflow 队列因 lane 变更在启动前停止，需用新候选运行；不得从 Pi 定向通过推断完整矩阵。

新候选 `338a1695dfa22c7ee81fec920f7b03718ee13b13502798fd5132ac443f03b9cc` 的 Zotero 10 首轮 full receipt `r4-matrix-runs/zotero-10-linux-x64-d783781d/receipt.json` 在 core 处失败：236 passed、1 failed。Conversation 测试归档自己的 owner 后错误地断言全局活动列表为空；该 suite 的共享 metadata index 已有其它 owner。既有断言改为只要求本次 owner 不在活动列表，生产 Conversation 无改动。三个 Linux 版本的完整 core 中均已验证修正，237 passed；UI 均为 9 passed、workflow 均为 5 passed。Zotero 10 全域重跑通过，首轮失败与 cleanup complete 保留。

修复后候选的 Linux 串行矩阵如下，表内 ID 均位于 `r4-matrix-runs/<ID>/receipt.json`。每个版本的 Pi 五组行为、两次真实重启、XPI fresh/upgrade 和 core/UI/workflow 全部通过；九份通过 receipt 的 XPI SHA-256 均为上述摘要，观察版本符合矩阵，cleanup complete。XPI upgrade 均使用固定 v0.9.0 基线并通过 legacy preservation。

| 宿主 | Pi 行为 receipt ID | XPI fresh/upgrade receipt ID | 完整矩阵 receipt ID |
| --- | --- | --- | --- |
| Linux Zotero 7.0.32 | `zotero-7-linux-x64-db5a90a6` | `zotero-7-linux-x64-3235287c` | `zotero-7-linux-x64-c539a6b3` |
| Linux Zotero 9.0.6 | `zotero-9-linux-x64-29452655` | `zotero-9-linux-x64-0f6505bc` | `zotero-9-linux-x64-5d31aaf1` |
| Linux Zotero 10.0.1 | `zotero-10-linux-x64-32fbc8d7` | `zotero-10-linux-x64-c41ff7ba` | `zotero-10-linux-x64-7f7812f2` |

## 大小与容量

`resume-bundle.json`/`resume-bundle-record.json`：raw 增量 `16,330,996` bytes，gzip `929,254` bytes，XPI `966,906` bytes；同输入、浏览器 guard 与完整排除控制通过。raw 超过 8 MiB。测量候选 SHA 为 `57d93099f4baab8bb9c2e967c9250ac4c102cb54088f0dc471223ddfaa7d379c`，与上述宿主候选不同且 dirty，不能认证当前或最终候选。

修订规格前，用户曾选择保留完整模型目录并在 clean 候选形成后签署大小例外；当时并无例外 receipt。当前预算与后续测量要求以上方“大小规格修订”为准。

恢复边界修复后的 `r4-bundle.json`/`r4-bundle-record.json` 使用容量 12，candidate XPI SHA-256 为 `338a1695dfa22c7ee81fec920f7b03718ee13b13502798fd5132ac443f03b9cc`：raw 增量 `16,331,020` bytes、gzip `929,256` bytes、XPI `966,908` bytes；sameInputs、browser guard、完整排除控制均通过。测量脚本返回 2，`discarded` 为 `dirty-worktree`，原 8 MiB 预算下 raw 超限；这份原始记录仍保留失败状态。后续开发矩阵使用这份 XPI，不把测量退出码改成通过。该轮生产 `npm run build`（含四份 TypeScript 配置）、格式检查与 OpenSpec strict 已通过，日志为 `c20-r4-build.log`、`c20-r4-format.log`、`c20-r4-openspec.log`。

容量 4 的前两次尝试分别暴露 XPI resource 读取和重复打开 Sidebar 问题。第二轮已通过 installed Conversation/Auto 工具链，但容量执行未形成有效 performance record；`capacity-runs/` 保存原始失败与清理 receipt。新 lane 的首轮 `zotero-10-linux-x64-0c963db8` 实际进入 foreground/background，随后被原生重复任务确认阻塞；宿主调试端口只读观察到 `Duplicate running job detected` 窗口。该轮无有效性能结论，停止测试宿主后 cleanup complete，原因保存于 `auto-lane-capacity-4-discard.json`。驱动在菜单提交前启动确认处理，仅接受受控 `Pi Capacity Auto` 的重复输入，不绕过生产重复检测。

容量 4 第二轮 `zotero-10-linux-x64-31f4de09` 完整运行但失败，实际观察最大活动数 3，门禁报告 `lag_stall_exceeded` 和 `unexplained_failure`。保留 owner 中有 164 个成功与 4 个 `skill_run_preparation_failed`；并发单次 driver 恢复全局 `skillDir` 与其它任务准备发生竞争，现改为由容量用例统一持有整批设置并在结算后恢复，单次安装 smoke 仍独立恢复。此前收集命令遗漏 `ZOTERO_TEST_PERF_PROBE`，内存门禁数值未落盘；缺失不能补成推算值，原因记录于 `auto-lane-capacity-4-r2-failure.json`。runbook 与 collector 已补齐启用开关和持久输出路径，容量 4 第三轮先验证修复。

容量 4 第三轮 `zotero-10-linux-x64-ecac1ce2` 已形成完整数值记录 `auto-lane-capacity-4-r3-performance.json`：336 次 dispatch 全部结算，无未知失败、丢失、饥饿或超容量；前台最大准入等待 0.223 ms，峰值 RSS 增量 355,135,488 bytes、settled 增量 62,578,688 bytes 均通过。event-loop 880 个样本的 p95 为 114 ms、最大 1,358 ms，超过 100/1,000 ms 门槛，容量结论仍失败。

`zotero-10-linux-x64-b5890d21` 是提前停止的 Gecko profiler 诊断，cleanup complete；弃用原因保存在 `auto-lane-capacity-4-diagnostic-discard.json`，不作为容量通过证据。主线程样本中目录 checksum 约 29%、同步数据库写入约 20%、schema 编译约 16%，仅为诊断样本占比。shared SHA-256 accumulator 现直接向 Mozilla hash 传递 Uint8Array，去掉每块 Array.from 复制，与 [Zotero 自身 hash 用法](https://raw.githubusercontent.com/zotero/zotero/10.0.1/chrome/content/zotero/xpcom/utilities_internal.js)一致；既有 gateway/Skill registry 用例 75 passing（`c20-hash-focused.log`）。

容量 4 第四轮 `zotero-10-linux-x64-370e702f` 全部门槛通过，candidate SHA-256 `a084d205075b055a7ddac54b65e4635da09716d9d116e283b92190ae036a3a7e`。记录 `auto-lane-capacity-4-r4-performance.json`：p95 58 ms、最大 187 ms；411/411 结算，零未知失败/丢失/饥饿/超容量；前台最大等待 0.251 ms；RSS peak 增量 320,471,040 bytes、settled 增量 78,630,912 bytes。四阶段时长均达标，未强制 GC，installed XPI fresh 工具链通过。定向 runner 的 receipt 仍因 Pi 行为组未运行而失败，不能当作完整矩阵通过。

容量 6 `zotero-10-linux-x64-7241758d` 也全门槛通过，candidate SHA-256 `88a6e3cb5fa57ab25b4784e87aadc4bee37df330c0b490dd385eefeca9b9077c`；记录 `auto-lane-capacity-6-r4-performance.json`：p95 63 ms、最大 220 ms，431/431 结算；前台最大等待 0.277 ms，RSS peak 增量 325,586,944 bytes、settled 增量 70,983,680 bytes，零未知失败/丢失/饥饿/超容量。

容量 8 `zotero-10-linux-x64-56c8f9fe` 全门槛通过，candidate SHA-256 `5f4079b208e74c0a925808f44ddcd0eb25daf0b8f1a3320c56ae1e9401cf8074`；记录 `auto-lane-capacity-8-r4-performance.json`：p95 59 ms、最大 370 ms，435/435 结算；前台最大等待 0.223 ms，RSS peak 增量 361,046,016 bytes、settled 增量 80,769,024 bytes，零未知失败/丢失/饥饿/超容量。

容量 12 `zotero-10-linux-x64-29616a72` 全门槛通过，candidate SHA-256 `b07c22de79c8387c068f1a5f401ac23b2b0ee424672652d7a5cd143d6eb8b009`；记录 `auto-lane-capacity-12-r4-performance.json`：p95 60 ms、最大 111 ms，447/447 结算；前台最大等待 0.243 ms，RSS peak 增量 344,940,544 bytes、settled 增量 73,658,368 bytes，零未知失败/丢失/饥饿/超容量。Linux 四个容量均有通过的开发探索记录，尚未形成双平台共同选择。

只读复核发现 owner 的 `recovered` 标记会将安全启动续跑后的 Interactive 用户继续也放入后台。既有安全恢复用例扩展到 Interactive，后台满时先复现 dispatch 仍为 1（`c20-recovery-lane-red.log`），修复后为 2。恢复准入改为单次 `start` 参数，删除 owner 标记；Auto 仍按固定模式后台准入。270/275/278 三文件 49 passing（`c20-recovery-lane-green.log`）。这项生产/测试定义变更发生在四轮容量探索之后，旧记录保留原 XPI 绑定，不能认证新候选；完整 Linux 矩阵和大小按修复后源码重收，clean final 容量认证仍需重测。

聚合器现在直接接收现有 performance digest 的 `piCapacity` envelope 和裸容量记录。既有平台映射用例扩展后先以 `pi_performance_record_invalid` 失败，再通过；acceptance/probe 两文件 24 passing（`c20-probe-envelope-red.log`、`c20-probe-envelope-green.log`）。实际 digest 经 CLI 生成 `r4-envelope-cli-smoke-r2.json`/`.md`，返回 2（未验收通过）：保留 p95 63 ms，拒绝 dirty、容量和 XPI 不匹配的旧记录。首个 CLI 尝试因下一轮构建已将容量 6 artifact 替换为容量 8 而返回输入失败，原日志保留（`c20-probe-envelope-cli.log`）。所有数值与 verdict 继续由同一 probe validator 校验。任务 3.2 的实现、实际准入/结算观察及门槛检测已完成；3.3/3.4 的双平台探索、选择和 final certification 仍未完成。

Linux 4/6/8/12 探索以实际记录为准，记录于 `auto-lane-capacity-runs/` 和逐容量 `auto-lane-capacity-*.json`。配置上限和观察占用分别保留，不推断未观察到的满载；最低容量失败时先修复再推进。共同容量选择及 final workload 尚未完成，生产默认 12 未被伪造为实测选择。

## 尚缺证据

`r4-development-summary.json`/`.md` 已实际生成，CLI 返回 2、`accepted: false`。报告保留 46 个条目和 66 个尝试；没有有效的正式候选尝试，因为来源 dirty，旧记录另有 XPI/容量不匹配，性能记录均为 exploration。`r4-attempt-index.json` 保存输入 receipt、performance 和弃用原因引用；旧失败、重跑及 dirty 状态没有改写。Node 第二轮与最新 Linux 矩阵的通过属于开发验证，不能消除 clean 最终候选、共同容量选择及 final workload 要求。

Windows 矩阵、process canary、容量与真实账号人工 inventory 仍按用户决定延期。此前 Codex/MiniMax test-bundle smoke 原始日志和 C05 临时 profile 已丢失；脱敏观察不替代新运行、安装 XPI 或带 confirmer 的 manual receipt。

此前 592 个 emitted JS 在当前 HEAD 已被跟踪。用户授权核实后移除：逐项确认同名 TS、均为 `76d308399..HEAD` 新增且真实路径位于工作区后，使用内置 patch 删除；清单为 `windows-emitted-js-inventory.json`。根 `tsconfig.json` 默认 `noEmit` 防止再次生成，未删除手写 JS。原工作区完整 lint 已通过（`windows-cleaned-lint.log`），默认 `tsc` 通过且无新 JS（`windows-noemit-default.log`）。任务 2.2–2.3、3.3–3.4、4.1–4.3 保持待办。

## Windows 本地接续

用户仅授权本地开发验证，不授权远程七平台预构建。七平台 Synthesis source fingerprint 首轮期望 `3756740d8b915e08d8c9415b2121b3807cc97746581b6950be58f64e229185b0`；最终复核期望 `e6395bdd86d61ce597ea4f49007e6c76c884656c6f936624f3f009d6c5f8e7cd`，现有资产为 `74fc56c1bf04d0dcfd571ba42abbc8fb042d8119a6c0cd88a178e652b88a4f18`，freshness 均失败（`windows-sidecar-freshness.log`、`windows-sidecar-freshness-r2.log`）。已从当前源码本地构建 Windows sidecar 并通过现有 prepare 暂存，供临时 add-on 行为测试。未将其作为七平台正式 XPI；没有 dispatch、同步远程资产、提交或发布。

Windows Zotero 10 使用矩阵固定的 10.0.1 官方归档，经现有 acquire 校验。首次原工作树运行因 TS/JS 输出冲突失败；过滤副本运行在 `taskkill` 处失败。改用 Node 原生精确 PID kill 并保留退出观察，mock Windows 清理也使用原生 kill；POSIX mock 进程组清理保持原路径。真实重启随后暴露 profile 的 `parent.lock` EBUSY、debugger 遥测临时文件 ENOENT。共享快照函数排除 Mozilla 锁与独立 `chrome_debugger_profile`，保留宿主 profile 和 data；沿用现有用例记录 red/green，最终重启定向 5 passing，格式与 ESLint 通过。

Windows Zotero 10 的修复后 receipt `zotero-10-windows-x64-04c44bb3`、Zotero 7 receipt `zotero-7-windows-x64-9b2ca5a1`、Zotero 9 receipt `zotero-9-windows-x64-ab4170df` 均通过 Pi 五组、unknown no-replay 和安全 checkpoint 的两次真实重启，cleanup complete。原始 receipt 在本机 `zc` run root，输出日志分别为 `windows-10-pi-behavior-r5.log`、`windows-zotero-7-windows-x64-pi-r1.log`、`windows-zotero-9-windows-x64-pi-r1.log`。这些是 dirty 开发 add-on 行为证据，XPI 摘要不能证明暂存的本地 sidecar 已装入该包。

失败尝试完整保留：`c513563b`（输出冲突）、`e7df104e`（taskkill）、`c4c859f7`（Interactive 定向通过但旧 cleanup 失败）、`d3eb0858`（锁文件）、`2ee7bf16`（debugger 临时文件）。不把定向 Interactive 或任一首轮失败改成全组通过。

Windows 完整 Node 首轮 24/28，清理后第二轮 25/28（`windows-node-full-r2.log`）；失败为 workflow-engine、workbench 的默认 2 秒超时，以及 background cleanup 测试。workbench 分片重跑通过；workflow-engine 重跑出现另一条 10 秒交互续跑超时，该用例定向 1 passing（`windows-workflow-interactive-focused.log`）。全量通过仍未成立。Assistant Workspace identity、Pi 执行、安全/故障和 acceptance tooling 分片在第二轮通过。

workflow-engine 第四轮分片通过（`windows-node-workflow-engine-r4.log`）。background cleanup 的微任务忙等改为等待现有 stub 的开始信号，消除异步 import 尚未完成时的错误判断；随后真实进程树截止用例单独复现默认 2 秒超时。该测试现允许 10 秒执行，产品的 500 ms 截止与 500 ms graceful 参数保持原值，定向 1 passing（`windows-deadline-focused-green.log`）；zotero-host 第四轮 17 文件分片通过（`windows-node-zotero-host-r4.log`）。

Windows Node 第三轮全量一次 28/28 分片通过（`windows-node-full-r3.log`、exit 0）。该轮启动早于最后的 XPC stream 关闭改动；改动后共享文件/persistence 两文件 38 passing（`windows-native-files-node.log`），measurement/acceptance 两文件 18 passing（`windows-final-measure-tooling.log`）。生产 `windows-native-stream-build.log` 含四份 TypeScript 与 workspace 检查通过，完整 lint 与 OpenSpec strict 通过（`windows-final-lint.log`、`windows-final-openspec.log`），测量路径修复的格式/ESLint 通过。生成的 `typings/i10n.d.ts` 和 help manifest 时间戳已恢复到原始内容。

Windows 10 完整 core 首轮 `zotero-10-windows-x64-18589521` 为 231 passed、6 failed，UI/workflow 未执行。只读文件导致递归删除失败：复用 platform services 的真实宿主用例先记录红测 `cc36d901`；首个重跑 `b01f89bd` 仍使用旧插件，重建后的 `64edd748` 证明单独设置 `retryReadonly` 也不足。Gecko 的 [RemoveSync](https://github.com/mozilla/gecko-dev/blob/master/xpcom/ioutils/IOUtils.cpp) 仅重试根路径的 readonly 属性，目录非空提前返回。共享 `removeRuntimePath` 现用原生 readonly retry，并在 Windows 目录删除失败时先核实路径身份，再逐项删除子路径，保留原有 5 秒重试窗口。真实宿主 `b5923a90` 为 1 passing（`windows-readonly-cleanup-green-r3.log`）。

该修复后的完整 core 重跑，Windows 10 `c5c05877` 和 Windows 9 `34da5ab0` 均为 233 passed、4 failed，完整失败 receipt 保留。剩余错误是生成产物晋升和审计导出临时文件的 `NS_ERROR_FILE_IS_LOCKED`，并使注释导出失败。共享 XPC 读取器的完成回调现显式关闭底层文件流，沿用现有 Trusted Native、Native catalog 与 Audit 用例验证；移动与摘要校验顺序保持原契约。最终重建后的结果另行记录。

Windows 7 `ef639dce` 在同轮完整 core/UI/workflow 通过（237/9/5，cleanup complete）。最终 stream 修复后的 Windows 10 定向 receipt `2833bf86` 为 21 passing，覆盖生成产物晋升、注释导出、审计导出与只读清理，cleanup complete。主开发 XPI SHA-256 为 `20f365559fc6fe0cdd8acce4e649711186c446b74c515ebea8106b48db2a696a`；prepare 暂存的本地 Windows sidecar 与正式包内七平台工件仍须区分。

Windows 10 最终完整 core/UI/workflow receipt `1b5ba72a` 通过（237/9/5，cleanup complete）。随后 `9f9b3592` 的 Pi 重收遗漏 runbook 指定的 grep，实际进入 Phase 2 套件：SR-03 出现重复 `run.terminal_client_error` 事件，运行在 ACP owner restart 阶段中断。原始 receipt 仍为 `running`、无最终 cleanup，保持原样；原始日志和中断原因见 `windows-expanded-e2e-interrupted.json`。该记录不能证明完整 E2E 或 Pi 五组通过。后续定向重跑使用已有 `System E2E (runner foundation|Phase 3 builtin Pi runtime)` grep，完整 E2E 的 Phase 2 失败单独保留。

Windows 10 定向 Pi receipt `c1d49c98` 的 Conversation、interrupt、Auto 与 restart 通过，Interactive 在提交时返回 `interaction_not_collecting`，cleanup complete。测试只等待了 batch collecting，早于 owner 发布 `waiting_user`；现有 PI-04 用例改为同时等待两个公开就绪状态，生产 CAS 与时限不变。修改后的三版 Windows Pi 五组及两次实际重启全部通过，完整 core/UI/workflow 均为 237/9/5 passed，所有最终 receipt 均 cleanup complete：

| 宿主 | 完整 core/UI/workflow receipt | Pi 定向 receipt |
| --- | --- | --- |
| Windows Zotero 7.0.32 | `f26a17b0` | `94b9900f` |
| Windows Zotero 9.0.6 | `5c53918b` | `49c6de9f` |
| Windows Zotero 10.0.1 | `1b5ba72a` | `29a7e8c7` |

根类型和受影响文件 ESLint 通过（`windows-final-types-r2.log`、`windows-final-eslint-r2.log`），测试格式通过（`windows-pi-ready-format.log`）。以上是开发 add-on 的 core/UI/workflow 与 Pi 定向证据，不是正式安装 XPI 或完整 E2E 通过。

SR-03 的只读定位确认是产品重复发布：`skillRunnerTaskReconciler` 与仍在执行的 job 轮询均观察到 404，经 `settleSkillRunnerRunAsFailed` 发布 `run.terminal_client_error`。`skillRunnerRunStore` 仅吸收状态退回，重复 failed→failed 仍各追加独立 event ID。现有 SR-03/SR-02 断言一次终态收敛；Node reducer 与 reconciler 用例尚未覆盖两个观察者的事件去重。修复应在共享终态事件归约处处理，并扩展既有 reducer 用例；本次 Pi 本地验证没有扩大修改 SkillRunner 产品行为，完整 E2E 仍未通过。

生产 build、四份类型配置和 browser guard 已通过。第一次 Windows 包体对照 raw/gzip/XPI 增量为 `16,311,526` / `928,552` / `966,161` bytes，三项在预算内，guard 和完整排除通过，但 `sameInputs:false` 与 dirty 使 CLI 返回 2（`windows-bundle.json`）；保留该失败，待生成类型和测试源稳定后串行重测。

串行包体第二轮仍 `sameInputs:false`（`windows-bundle-r2.json`）：Windows 输出目录使用反斜杠，scaffold 的 glob 未发现 locale，生成类型变空；两份包中的 FTL 也未完成 namespace 转换。测量器在传递输出目录时转换为正斜杠，复用既有 scaffold 构建。恢复原类型后第三轮 raw/gzip/XPI 增量为 `16,306,697` / `927,397` / `965,112` bytes；`sameInputs:true`、browser guard、完整排除与三项预算全部通过。CLI 返回 2，仅保留 `dirty-worktree`（`windows-bundle-r3.json`/`windows-bundle-r3-record.json`）。测量候选 XPI SHA-256 为 `616641f1b5d11df849e9bf2f3ea1f8c00d6208b40dec76bf0f835588c0647cd3`，与主开发 XPI 不同，不能合并认证；首两轮 candidate/control XPI 另保存在 `windows-bundle-r1-artifacts/`、`windows-bundle-r2-artifacts/`。

本机 WSL Ubuntu 缺少 Linux Node、Rust 与显示测试工具，旧 Linux receipt/容量原始工件也未迁入本机。正式安装/升级、双平台容量共同选择、clean 最终候选与 final workload、人工 inventory 仍缺失；不能据此完成 C20、同步规格或归档。

最终开发聚合已执行 `npx tsx .scaffold/pi-acceptance/collect-windows-development.mts`，返回 2：`accepted:false`、46 项、41 次证据尝试、25 份宿主 receipt（`windows-development-collect.log`）。JSON/Markdown 为 `windows-development-summary.json`/`windows-development-summary.md`，原始副本和索引为 `windows-receipts/`/`windows-attempt-index.json`。dirty 开发尝试保留在 attempts 中，不能满足正式 gate；包体对照候选与主开发 XPI 摘要不同，也不能合并认证。Windows stdio canary 的 7 次开发证据来自真实宿主 stdout 的三项通过，未用 Node mock 替代。中断的 `9f9b3592` 原 receipt 与保存副本逐字节一致，仍为 running/cleanup incomplete。最终生成类型与 help manifest 无差异，文档格式、OpenSpec strict 与 `git diff --check` 通过。C20 保持 6/13。

本轮一次进程环境查询意外将含凭据字段展开到工具输出。未将这些值写入验收工件，已停止这种读取；后续只提取所需非凭据字段，建议轮换受影响的环境凭据。
