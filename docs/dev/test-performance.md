# 完整测试性能调查

调查基线：`c017caf6f06a5bb330c70a2b13801427407d484c`，Linux x86_64，Node 24.12.0，
Intel Xeon E5-2697A v4，64 个可用逻辑 CPU、约 126 GiB 内存。测量保留既有编译缓存，
不把冷编译与热缓存结果混为同覆盖加速。完整路径相对于仓库根目录；未带完整目录的
诊断文件或目录均位于 `artifacts/test-diagnostics/test-optimization/`。

## 基线与证据

最近一次历史完整成功运行位于
`artifacts/test-diagnostics/npm-test/2026-10-31T15-24-44-954Z-2046900/`。

| 阶段                    |    历史耗时 |
| ----------------------- | ----------: |
| 完整入口                | 69 分 46 秒 |
| Synthesis native stage1 | 28 分 34 秒 |
| 全量 Node               |  23 分 9 秒 |
| Zotero full，含 E2E     |  17 分 8 秒 |
| 三套 Rust               |       45 秒 |

本轮在 `/tmp/zotero-test-profile-baseline-c017caf6` 隔离 checkout 中重跑原 native
stage1，仅替换 Mocha reporter 以采集逐例和 hook 时间。结果保存在
`artifacts/test-diagnostics/test-optimization/baseline/`，全部通过：824 passing、9 pending。
各子阶段累计 31 分 46 秒，其中 native Mocha 25 分 42 秒、最后的跨语言压力检查
4 分 35 秒、构建 56 秒、worker parity 32 秒。Mocha 内部 production 855 秒，
跨语言 decoder 518 秒，workflow producers 139 秒。
该基线部分时间与首轮 Node 集成验证重叠；当时内存占用约 109 GiB、swap 已满。
因此 native 前后比例包含负载差异，不能与后面的同代码 Node 并发校准视为同等严格的对照。

最终 Node 并发校准按 1/2/4/8 顺序运行同一实现和清单，本任务没有同时运行其它重测。
各轮保留已有缓存，不将历史 23 分 9 秒当作这次并发度的对照基线。

| Worker 数 |      整轮 wall time | 相对本轮串行减少 |
| --------: | ------------------: | ---------------: |
|         1 | 1534.29 秒（25:34） |                — |
|         2 |  759.08 秒（12:39） |            50.5% |
|         4 |   387.35 秒（6:27） |            74.8% |
|         8 |   218.04 秒（3:38） |            85.8% |

四轮均为 28 个分片、4,612 passing、39 pending，退出码 0，计时文件完整。
按文件路径、完整标题及出现次数对比历史逐例清单，没有旧用例缺失，新增 20 个行为
回归用例。原始目录、逐文件耗时、清单差异和资源数据见
`artifacts/test-diagnostics/test-optimization/calibration-analysis.json`；各轮完整结果位于
该文件 `report` 指向的 `artifacts/test-diagnostics/node/` 子目录。

本地默认上限据此选择 8，CI 保持 2。各轮最重 worker 的峰值 RSS 为 1.59–1.64 GiB，
不是整棵进程树内存；内存较少的机器应使用 `--jobs 2` 等较低并发度重新测量。
串行轮累计加载 351 秒、hook 288 秒、测试正文 883 秒；8-worker 轮分别为
340、247、849 秒累计工作量。主要收益来自并发，不能声称 CPU 工作量减少了 85.8%。

8-worker 轮的最长分片是 Deep-reading（217 秒），几乎决定整轮耗时；其次为
runtime provider products（157 秒）、SkillRunner runtime（133 秒）和 Workflow engine
（129 秒）。Deep-reading 测试正文累计约 210 秒，export-research 正文约 132 秒；
Workflow single-result integration 的 hook 约 43 秒，高于其正文约 36 秒。

首轮优化 native stage1 保留完整压力探针，结果位于
`artifacts/test-diagnostics/test-optimization/native-optimized/2026-11-01T02-31-35-065Z-1680713/`。
总耗时 848.52 秒，830 passing、9 pending；原 Mocha 用例没有缺失，新增 6 个行为测试。
其中 native Mocha 572.51 秒，相比原 1542 秒减少约 63%；完整 stage1 表观减少约 55%。
此轮采用逐文件进程，且开头与旧版压力检查短暂重叠；旧版还包含约 56 秒构建耗时，
这些差异均不归因于运行时优化。

分批版本独立复验位于
`artifacts/test-diagnostics/test-optimization/native-batched/2026-11-01T02-45-44-188Z-1745934/`：
完整 stage1 850.10 秒，830 passing、9 pending，全部通过。前后压力检查均覆盖
20 个 schema、146 个 capability、1,226 个正例、453 个负例、15,083 个结构检查用例，
未截断且无错误。分批降低了 CPU 工作量；wall time 仍由跨语言准备与 producer 链决定。

最终自动选择 8 workers 的常规 native stage1 复验位于
`artifacts/test-diagnostics/test-optimization/native-default/2026-11-01T03-58-18-876Z-2280428/`：
616.24 秒（10 分 16 秒），831 passing、9 pending，全部通过。相对前一轮没有遗漏用例，
新增 1 个分层回归用例；清单差异见 `native-final-inventory.json`。
native Mocha 为 556.65 秒（9 分 17 秒），构建 0.28 秒、worker parity 3.89 秒，
常规 cross-language 检查 54.79 秒。常规层覆盖 14,818/14,818 项结构义务，
另有 265 项预算外探针明确列为 `deferredToDeep`，没有错误或未解释的覆盖缺口。

随后使用该轮证据执行完整 `--stress`，273.10 秒通过：15,083/15,083 项结构义务全部
覆盖，deferred 清单为空。20 个 schema、146 个 capability、1,226 个正例和 453 个
负例与原基线一致，结构探针无截断、无错误；逐项对照见 `tier-comparison.json`。
该步骤与常规检查相差 218.31 秒（3 分 38 秒），这是压力分层的节省，单独列出，
不计入同覆盖加速。这里的数字只描述独立压力检查；完整 deep gate 验收见末节。

## 已处理的成本

- Node 分片从串行改为有界并发，各 worker 拥有独立临时目录和 mock 数据目录。
  以既有耗时记录优先派发长分片；无记录时按文件数估计。失败结果按原清单顺序汇总。
- Native protocol 身份原先在大量请求路径中反复遍历源码、读取 sidecar 二进制。
  现在在测试进程作用域内复用，结束时重新校验；只有通过重验的 worker 新证据能汇入
  后续 producer 检查。源码或二进制漂移仍使本次运行失败。
- Native production 按 worker 数分批。逐文件进程实验显示，部分文件的正文不到
  100 毫秒，但全局 mock 初始化约 9 秒、身份起止校验约 2 秒；分批避免重复支付这些成本。
  同一 production 清单由 29 个进程归并为 4 批后，Mocha 进程自身 CPU 时间总和由
  542.98 秒降至 228.15 秒；该指标不包含 Rust 子进程，也不是并发 wall time。
- Skill registry 重扫时反复编译相同 JSON Schema。缓存仅保存成功编译的内容身份，
  上限 128 项，仅缓存长度不超过 65,536 的序列化键；内容变化重新校验，错误仍实时生成。
- 纯 Node 的 `runtime-provider-products` 和 `tooling-deep-reading` 不加载 Zotero mock。
  Export-research 的共同准备链减少 33 次无数据用途的 gate 重读，并保留完整流程代表
  用例。Deep-reading 的默认只读 ZIP 字节复用，减少 14 次 Python ZIP 构建，各用例仍
  写自己的 ZIP、工作目录和输出。
- Zotero 每轮完整调用复用成功准备的插件与当前源码 sidecar 构建；各宿主/profile
  仍独立、串行。等待插件 initialized 代替固定 30 秒空等，保留 40 秒就绪预算。
  E2E 健康检查等待 sidecar manifest 安装与进程就绪共用原有 60 秒预算，避免
  initialized 先于后台 owner 安装完成时直接读取不存在的文件。

同覆盖的一个逐例对照：native 的增量 Graph 刷新及 Related Items effects 用例由
88.351 秒降至 6.276 秒；所属文件的 42 个用例全部通过。跨语言 decoder 的剩余主要
成本是边界样本准备，原生执行通常仅数百毫秒；所有 driver 和边界样本继续保留。

## Rust 与工具链验证

常规 Cargo 命令全部通过：Synthesis 592 个、Host Bridge 162 个、ACP bridge 8 个，
分别约 37.54、6.64、0.25 秒。日志为
`artifacts/test-diagnostics/test-optimization/final-test-*-rust*.log`。
修正后的独立进程采样覆盖同一批 762 个用例，全部通过且无不完整计时文件；结果位于
`artifacts/test-diagnostics/test-optimization/rust-profile-final/`。

首次补充采样曾把 7 个成功的生命周期用例误报为失败：子进程日志插入了 libtest 的
单例结果行。现以最终 libtest 汇总和退出码判定，要求恰好一个 passed 或 ignored，
零用例、多用例、不完整结果及非零退出仍失败。原始失败证据保留在
`rust-profile-current/`。常规跨语言检查还暴露了“去掉 `--stress` 仍要求全部压力义务”
的问题，现使用显式分层及预算来源记录；这些修复没有把缺失证据当作成功。

全量复验还暴露了 ACP probe 测试清理竞态：`clearRuntimeLogs()` 返回的异步落盘
未被等待，恢复 runtime root 并删除临时目录时仍有写入，触发 `ENOTEMPTY`。
现等待原 root 的日志清理完成后再恢复环境与删除目录；25 个 probe 用例和完整
ACP runtime 分片通过，未增加删除重试或改变产品日志行为。

并发校准后针对上述两处边界追加了两个回归用例；最终定向联合验证为 69 passing，
包括 47 个结构覆盖用例及 7 个 Rust 采样用例，日志为 `final-runner-tests.log`。
本地化治理、SSOT 检查通过，记录见 `remaining-validation.json`。
Zotero 测试基础设施、构建准备复用和事件/性能报告的 Node 联合验证为
95 passing、3 pending，日志为 `final-zotero-infrastructure.log`，不代表真实 Zotero
已启动。`npx tsc --noEmit`、修改文件的 ESLint、Prettier 检查和 `git diff --check`
通过，日志分别为 `typecheck-final.log`、`eslint-final.log`、`prettier-final.log`。

## 压力分层与测量方法

`npm test` 保留全部常规功能、Node、Rust、真实 Zotero full/E2E。唯一移出的工作是
native 最后 cross-language 步骤的超大 `--stress` 探针。`npm run test:deep` 保留这些
探针，PR/release 和独立 native stage1 的压力强度不变。压力分层带来的节省应单列，
不能归入同覆盖加速。常规层以 `deferredToDeep` 明确列出预算外探针，只有深测才能
把它们计作已覆盖；缺少种子、普通覆盖缺口和遍历/验证预算耗尽仍会失败。

```sh
npm test -- --profile
npm run test:deep -- --profile
npm run test:node -- --profile --jobs 1
```

每轮的 `profile.json` 保存完整 span 与 Mocha 清单，`profile.md` 给出各类热点；
`profile-metadata.json` 保存环境。测试正文、hook、加载、子进程、Zotero 准备和事件
分别记录。并发和嵌套跨度不能求和当作 wall time，CPU/RSS 仅代表记录进程自身。
`regular-suite` span 明确排除 Rust 补充采样；Rust 逐例独立进程采样是额外诊断工作，
不会进入未启用 `--profile` 的日常测试路径。当前 Rust doctest 清单为空。

诊断汇总以 `summary.json` 和 `failures.md` 为准。缺失/截断报告、hook 失败、源码
漂移和用户中断均不得视为通过。首轮 native 分片曾因长 TMPDIR 超过 Unix socket
路径限制而未能启动，失败证据仍保留；现使用短随机 worker 临时目录。

## 验收边界

真实 Zotero 构建准备发现 dev 内容发布一致性检查失败：
`npm run check:content-package-release -- --current-branch` 报告
`dev GitHub content feed does not match local generated package semantics`。
其它构建准备检查的日志保存在 `artifacts/test-diagnostics/test-optimization/check-*.log`。
用户随后明确授权本次隔离 profiling/测试豁免该远端一致性检查，记录见
`authorized-host-validation.json`。其它本地构建输入检查通过后，使用 `/usr/bin/zotero`
（9.0.4）及当前源码构建运行，profile/data 位于 `.scaffold/test/`，不使用个人库。
本轮没有发布、修改版本或提交代码；该授权不代表已验证发布频道内容。

最终常规全量通过，报告目录为
`artifacts/test-diagnostics/npm-test/2026-11-01T08-40-46-481Z-3957031/`。
`regular-suite` 实测 1,706.38 秒（28 分 26 秒），相对历史 69 分 46 秒减少约 59.2%；
这包括压力分层收益，不能全部归因于同覆盖优化。额外 Rust 逐例采样约 90 秒，
762 个用例全部通过，不计入上述常规耗时。

| 最终常规阶段 | 耗时 | 结果 |
| --- | ---: | --- |
| native stage1 | 10 分 32 秒 | 831 passing、9 pending |
| Node | 3 分 40 秒 | 4,614 passing、39 pending |
| Rust 三套 | 44 秒 | 762 passing |
| Zotero full | 13 分 20 秒 | core 25、UI 3、workflow 1、E2E 42 全通过 |

逐文件、完整标题及重复次数与历史清单比较无旧用例缺失，新增 29 个 Mocha 行为
回归用例。E2E Manifest
`artifacts/test-diagnostics/system-e2e/dca5e7ab-4a28-416d-bb38-e8c100af90f0/run-manifest.json`
为 complete，42/42 逻辑场景与基线逐项一致；33 条 family 的清理、健康检查通过。
仍包含 HB-03、AC-05、SR-02 三次恢复，真实插件与当前源码 sidecar 各准备一次。
逐项比对与热点数据保存在 `full-gate-comparison.json`。

宿主剩余热点为 WF-01 全部生产工作流（306.78 秒）、Citation Graph 30 次关闭重开
及延迟观察（41.29 秒）、大笔记和多图片连续导出（25.85 秒）。全部宿主 hook
累计 4.21 秒，测试正文累计 539.56 秒。E2E 正文累计 468.54 秒，域 wall time
638.83 秒；差额包含启动、恢复和准备，不能把它全部视为可删除的等待。
真实插件构建 4.56 秒、当前源码 sidecar 准备 4.12 秒，各只发生一次；分析这些
构建时只取 `scope: zotero-*`，不把工具链回归用例内部的模拟构建当成真实构建。

两轮中间失败证据完整保留：`2026-11-01T07-51-56-420Z-3561231` 在修改过程中
加载了尚未修复的 manifest readiness 回归用例，其余阶段及完整 E2E 通过；
`2026-11-01T08-23-12-745Z-3819107` 暴露 ACP probe 清理竞态，定位后主动中止。
它们不计为成功，也未用于最终端到端时间结论。

完整 `test:deep -- --profile` 同样通过，报告目录为
`artifacts/test-diagnostics/npm-test/2026-11-01T09-10-42-971Z-4164414/`。
`regular-suite` 实测 1,935.64 秒（32 分 16 秒），保留完整压力覆盖，相对历史
69 分 46 秒减少约 53.8%；额外 Rust 采样约 90 秒，762 个用例全部通过。
native stage1 为 14 分 15 秒、Node 3 分 40 秒、Zotero full 13 分 26 秒。
Node/native 清单、pending 数与最终常规轮一致，没有旧用例缺失或不完整计时记录。
E2E Manifest
`artifacts/test-diagnostics/system-e2e/550ee349-157f-44ca-bd8f-0c2d271a5ca6/run-manifest.json`
为 complete，42/42 场景、33 条 family 的清理与健康检查均通过，三次恢复与基线一致。

两轮完整 gate 的结构检查使用同一 fingerprint，均为 20 个 schema、146 个
capability、1,226 个正例和 453 个负例；常规 14,818 项加明确延后的 265 项等于
deep 的 15,083 项。deep 无 deferred、截断或错误，原始对照保存在
`final-tier-comparison.json`。本轮总耗时来自完整 gate 实测，不是分阶段实验之和；
历史对照仍受机器负载和既有缓存影响，不等同于严格受控的前后实验。

最终 `npx tsc --noEmit`、全部修改文件的 ESLint/Prettier 和 `git diff --check`
通过；日志为 `typecheck-validated.log`、`eslint-validated.log` 和
`prettier-validated.log`。两轮入口退出码及包含补充采样的总时间另见
`validated-gate-acceptance.json`。

Windows 和 CI 主机未进行实机复跑；本报告的时间结论只针对上述 Linux 环境。
