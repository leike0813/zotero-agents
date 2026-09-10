# 测试框架

本项目有两层阻塞测试：确定性的 Node 回归，以及真实 Zotero 宿主回归。两层不重复承担同一种风险。

## 常用命令

- `npm test` / `npm run test:node`：全部常规 Node 分片。
- `npm run test:node:shards:list`：列出分片及文件数；存在未归属或重复归属时失败。
- `npm run test:node:<domain>`：只运行一个所有权域。
- `npm run test:node -- --shard <id>`：重跑单个失败分片。
- `npm run test:lite`：真实 Zotero 的关键宿主守护层。
- `npm run test:full`：`lite` 加低频、长耗时的真实宿主回归。
- `npm run test:gate:pr`：治理检查、Synthesis native stage1、Node 常规层、Zotero lite，全部阻塞。
- `npm run test:gate:release`：与 PR gate 相同，但 Zotero 使用 full。

Node 域命令为 `acp`、`assistant`、`dashboard`、`host-bridge`、`runtime`、`skillrunner`、`synthesis`、`tooling`、`ui`、`workflow` 和 `zotero-host`。

Zotero 仍可按 `core`、`ui`、`workflow` 运行。`test:zotero:full` 顺序启动三个独立宿主进程，避免一个长进程累积资源退化。

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
```

scaffold 递归发现这些目录中的测试。没有聚合 suite、文件白名单或标题白名单；目录就是唯一成员事实源。`full` 配置同时加载 `lite` 与 `full` 目录。

`tests/zotero/setup.test.ts` 是唯一宿主 setup，统一安装 grep、失败诊断、后台清理、对象清理、泄漏摘要和性能摘要。

## 归属规则

- 依赖 Node、mock、fake DOM 或纯模块接口的测试进入 Node 层。
- 只有必须观察真实 Zotero API、SQLite、XPCOM、窗口/Reader、宿主文件系统或真实嵌套页面的测试才进入 `test:lite`。
- 稳定但明显更慢、需要可选外部进程或只保护低频宿主风险的测试进入 `full`。
- editor、picker、dialog、GitHub 同步和本地安装器等不稳定交互不进入常规 Zotero 层。
- 混合 Node/Zotero 文件应拆开，不在测试体内按运行环境选择不同语义。

## Node 分片

`scripts/run-node-test-shards.ts` 是 Node 发现、所有权和分片的唯一事实源。package scripts 只传 `--domain` 或 `--shard`。

Synthesis native stage1 由独立 suite 持有，常规 Node 分片不重复执行它。分片输出记录文件数、耗时和失败重跑命令。普通分片在同一基线机器持续超过 120 秒时，应按既有所有权继续拆分；不为耗时阈值增加测试。

## 测试价值

测试稳定、可观察的行为或发布/wire 契约。下列内容默认删除：

- 只证明某个文件、import 或源码字符串存在；
- 对 `SKILL.md` 指令措辞做精确断言；
- 依赖完整错误文案、HTML/CSS 细节、字段顺序或内部调用顺序；
- 与已有检查脚本或另一测试重复覆盖同一事实；
- 为 suite、allowlist 或测试文本本身编写的元测试。

可保留的静态读取仅限可解析的公开契约或交付物，例如 JSON Schema、wire corpus、release manifest、checksum、可执行位和发布包文件集合。架构边界由现有 lint/check 脚本负责。

本轮治理测试本身，不采用 TDD，也不增加“测试的测试”。验证依靠 runner 列举、分域执行、完整 Node 执行和真实 Zotero 执行。

## 实机清理与诊断

真实 Zotero 测试共享进程状态。每个 case 后先记录失败上下文，再停止并 drain 后台工作，最后删除创建的 item、note、attachment 和 collection。直接创建宿主对象的测试仍需显式登记。

尾部变慢时先启用 `ZOTERO_TEST_LEAK_PROBE=1`，仍无结论再启用性能摘要；不要先增加 timeout 或重排测试。诊断默认写入 `artifacts/test-diagnostics/`。`ZOTERO_KEEP_TEST_OBJECTS` 仅用于本地调查。
