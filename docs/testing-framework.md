# 测试框架

本项目有两层阻塞测试：确定性的 Node 回归，以及真实 Zotero 宿主回归。两层不重复承担同一种风险。

## 常用命令

- `npm test`：完整常规套件，串行运行治理检查、Synthesis native stage1、全部常规 Node 分片、三套 Rust 测试以及 Zotero core/UI/workflow full 和离线 System E2E。失败后继续尝试全部阶段与子阶段，最后返回首个非零退出码；用户中断时停止后续执行。控制台只显示进度和状态图表。
- `npm run test:node`：只运行全部常规 Node 分片。
- `npm run test:node:shards:list`：列出分片及文件数；存在未归属或重复归属时失败。
- `npm run test:node:<domain>`：只运行一个所有权域。
- `npm run test:node -- --shard <id>`：重跑单个失败分片。
- `npm run test:lite`：真实 Zotero 的关键宿主守护层。
- `npm run test:full`：`lite` 加低频、长耗时的真实宿主回归。
- `npm run test:zotero:e2e`：真实 Zotero、生产插件与当前源码 sidecar 的项目级 System E2E runner。
- `npm run test:zotero:e2e:stress`：保留的 Citation Graph close/reopen 压测入口。
- `npm run test:zotero:e2e:workflow`：通过同一 E2E runner 只选择完整 WF family，覆盖 20 种非 debug workflow。
- `npm run test:gate:pr`：治理检查、Synthesis native stage1、Node 常规层、Zotero lite 和离线 WF-01，全部阻塞。
- `npm run test:gate:release`：与完整入口相同，治理检查、Synthesis native stage1、Node 常规层、三套 Rust 测试及 Zotero full（含 WF-01），全部阻塞。

完整入口需要 Node 24、Host Bridge Rust 1.88.0、Synthesis nightly-2026-07-25、
已初始化的固定 Skill 子模块、具备 Skill 声明依赖的 Python，以及
`ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 指定的 Zotero。
本机存在共享 uv 项目时沿用该环境；CI 使用准备步骤提供的 `PYTHON`。
常规 gate 固定 offline 并清除继承的 live、gold、resume、grep 和 family 过滤，
不需要模型或 MinerU token。专项压力测试、真实服务取证和发布操作保持独立。

### 完整测试报告

每次 `npm test` 的证据保存在 `artifacts/test-diagnostics/npm-test/<时间戳-pid>/`，
末尾输出报告路径；`latest.json` 指向最近启动的运行。`failures.md` 汇总失败用例、
hook 错误、堆栈、断言值、重跑命令和阶段故障输出；`summary.json` 保存阶段与
分片状态，`results/` 保存结构化证据，`logs/` 保留完整 stdout/stderr。
报告逐阶段更新，历史目录保留，不进入 Git。编译失败或宿主崩溃可能没有逐用例结果，
此时保留阶段日志并显示失败或未完成，不能将缺失证据视为通过。

PR/release gate 和独立 native/Zotero 命令仍遇错即停；`test:node` 独立运行保留
原有分片汇总和失败详情。聚合执行上下文仅由完整入口下发，不改变测试成员或 E2E 清理规则。

CI/PR 将 Linux Zotero 10 的独立 WF 单元设为必需测试，main 和发布使用 Linux
7/9/10 的独立阻塞 WF 单元。GitHub 强制禁止合并还需仓库 ruleset 将该
PR job 设为 required status check；工作流文件不修改仓库设置。已有 Phase 1 兼容单元保持其原身份；Windows
WF 不在本轮晋级。必需单元不自动重试，失败、incomplete 或 cleanup/health
不通过都会阻断门禁，并保留首轮 Run Manifest。

Node 域命令为 `acp`、`assistant`、`dashboard`、`host-bridge`、`runtime`、`skillrunner`、`synthesis`、`tooling`、`ui`、`workflow` 和 `zotero-host`。

Zotero 可按 `core`、`ui`、`workflow`、`e2e` 运行。`test:zotero:full` 依次在独立宿主进程中运行这四个域，避免一个长进程累积资源退化；`test:zotero:e2e` 可单独运行 E2E。

## 文件布局

Node 测试按生产所有权放在同名目录：

```text
tests/{acp,assistant,dashboard,host-bridge,runtime,skillrunner,synthesis,tooling,workflows,zotero-host}
tests/ui
tests/workflow-*
```

真实宿主测试直接放在：

```text
tests/zotero/{core,ui,workflow}/lite
tests/zotero/{core,ui,workflow}/full
tests/zotero/e2e/full
```

scaffold 递归发现这些目录中的测试。没有聚合 suite、文件白名单或标题白名单；目录就是唯一成员事实源。`full` 配置同时加载 `lite` 与 `full` 目录。

System E2E 是行为证据分类，不由目录名决定。真实 Zotero + 生产插件（Synthesis 场景还包括当前源码真实 sidecar）的 public path 才是 System E2E；替换了承载风险的 seam 时属于 Contract Integration。`e2e` 域持有项目级 catalog suite，但其它域的 public-path 测试可继续提供 System E2E 证据。

`tests/zotero/setup.test.ts` 是唯一宿主 setup，统一安装 grep、失败诊断、后台清理、对象清理、泄漏摘要和性能摘要。

## 归属规则

- 依赖 Node、mock、fake DOM 或纯模块接口的测试进入 Node 层。
- 只有必须观察真实 Zotero API、SQLite、XPCOM、窗口/Reader、宿主文件系统或真实嵌套页面的测试才进入 `test:lite`。
- 稳定但明显更慢、需要可选外部进程或只保护低频宿主风险的测试进入 `full`。
- editor、picker、dialog、GitHub 同步和本地安装器等不稳定交互不进入常规 Zotero 层。
- 混合 Node/Zotero 文件应拆开，不在测试体内按运行环境选择不同语义。

## Node 分片

`scripts/run-node-test-shards.ts` 是 Node 发现、所有权和分片的唯一事实源。package scripts 只传 `--domain` 或 `--shard`。

Node 分片的用例默认超时为 10 秒，可在命令末尾传入 Mocha 的 `--timeout` 或 `-t` 覆盖；suite 自己声明的超时继续生效。共享 mock 在 root `beforeAll` 中以 30 秒预算加载后台清理模块，让首次模块加载独立于逐例清理计时。`beforeEach` / `afterEach` 的外层预算为 10 秒，后台清理本身的限时为 5 秒，以便清理卡住时优先报告具体诊断。这些预算用于行为测试，性能验收仍由相应探针负责。

共享 mock 重置会恢复类原型描述符并移除新增成员，避免 toolkit 字段钩子跨测试
累积；隔离合同见 `docs/components/zotero-mock-parity.md`。Index 的 56,000 条来源
目录溢出用例只验证有界扫描和重扫定位，在该用例内将零延时让步调度为 Node
`setImmediate`，保留真实事件循环与非零计时器；取消和结束时清理替身句柄，并在
`finally` 中恢复计时器。生产调度和其它用例继续使用原有计时器。

Synthesis native stage1 由独立 suite 持有，常规 Node 分片不重复执行它。分片输出记录文件数、耗时和失败重跑命令。普通分片在同一基线机器持续超过 120 秒时，应按既有所有权继续拆分；不为耗时阈值增加测试。

Synthesis 包装契约与跨语言 decoder 契约分属独立 segment。跨语言测试在一个进程内复用契约扫描与样本准备入口，worker header 验证及每个生产 Rust decoder driver 分别报告结果和耗时；driver 的具体边界样本仍按各自接收器生成。日志记录样本数、准备耗时和原生执行耗时，失败时保留 Cargo 日志及输入/结果文件的临时目录。用例结束时取消并等待在途原生进程清理，后续用例不与超时工作重叠。调整这些测试时保留全部 driver 和原有证据断言，不以缩减边界样本消除超时。

## 测试价值

测试稳定、可观察的行为或发布/wire 契约。下列内容默认删除：

- 只证明某个文件、import 或源码字符串存在；
- 对 `SKILL.md` 指令措辞做精确断言；
- 依赖完整错误文案、HTML/CSS 细节、字段顺序或内部调用顺序；
- 与已有检查脚本或另一测试重复覆盖同一事实；
- 为 suite、allowlist 或测试文本本身编写的元测试。

可保留的静态读取仅限可解析的公开契约或交付物，例如 JSON Schema、wire corpus、release manifest、checksum、可执行位和发布包文件集合。架构边界由现有 lint/check 脚本负责。

## 实机清理与诊断

真实 Zotero 测试共享进程状态。每个 case 后先记录失败上下文，再停止并 drain 后台工作，最后删除创建的 item、note、attachment 和 collection。直接创建宿主对象的测试仍需显式登记。

尾部变慢时先启用 `ZOTERO_TEST_LEAK_PROBE=1`，仍无结论再启用性能摘要；不要先增加 timeout 或重排测试。诊断默认写入 `artifacts/test-diagnostics/`。`ZOTERO_KEEP_TEST_OBJECTS` 仅用于本地调查。
