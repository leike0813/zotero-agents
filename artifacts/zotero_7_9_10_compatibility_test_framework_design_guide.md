# Zotero 7/9/10 兼容矩阵自动化测试框架设计指南

> 状态：设计草案；日期：2026-08-25；适用项目：Zotero Agents；首期范围：Linux x86-64、Zotero 7/9/10、真实 Zotero 宿主测试；依据：当前测试框架、Pi core Zotero 兼容性 spike、Zotero 官方开发者文档。

## 先说结论

项目不需要另起一套兼容性测试，也不应该把 Zotero 版本判断散落进现有测试。更合适的做法是：保留当前 `lite/full`、`core/ui/workflow` 测试体系，在它的外面增加一层宿主编排。编排层负责取得并校验指定的 Zotero 二进制、为每次运行准备隔离环境、调用现有真实宿主 runner，最后生成可比较的结构化 receipt。

兼容矩阵的事实源应是一份纳入版本控制的版本清单。CI、开发者本地命令、缓存键、下载校验、结果命名和发布门禁全部从这里读取，不允许各自维护版本号。首批代表版本建议固定为：

| 宿主 ID | 固定版本 | 代表含义 | Mozilla 基线 | 初始门禁 |
| --- | --- | --- | --- | --- |
| `zotero-7` | `7.0.32` | Zotero 7 最后一个维护版本 | Firefox 115 ESR | blocking |
| `zotero-9` | `9.0.6` | Zotero 9 最后一个维护版本 | Firefox 140 ESR | blocking |
| `zotero-10` | `10.0.1` | 起草时最新的 Zotero 10 稳定版 | Firefox 140 ESR | 适配完成后 blocking |

这里的“代表”很重要。某个大版本的代表版本通过，只能证明项目在这一个明确的宿主构建中通过了约定测试，不能自动扩张为“所有 7.x/9.x/10.x 都经过验证”。

当前插件仍声明 `strict_max_version: 9.0.*`，项目也有测试锁定这一事实。因此，Zotero 10 在第一阶段只能作为预适配目标；正式门禁必须等 manifest、生产 XPI 和真实宿主行为三者同时对齐后才能转为 blocking。自动化框架不能通过悄悄改测试 manifest 来制造已经兼容 Zotero 10 的假象。

## 为什么需要宿主矩阵，而不只是更多单元测试

项目已经有两类互补测试：Node + mock 用于快速验证逻辑，真实 Zotero 用于验证插件确实能在宿主里启动和运行。现有设计记录在 [`doc/testing-framework.md`](../doc/testing-framework.md) 中，实际入口由以下组件组成：

- [`scripts/run-zotero-test-with-mock.ts`](../scripts/run-zotero-test-with-mock.ts)：启动 Mock SkillRunner，注入测试环境并清理临时数据；
- [`zotero-plugin.config.ts`](../zotero-plugin.config.ts)：按 `lite/full` 和 `core/ui/workflow` 选择真实宿主测试入口；
- `test/zotero/<domain>/<mode>/suite.test.ts`：显式聚合允许进入真实宿主的测试；
- `zotero-plugin-scaffold`：构建测试 runner、启动 Zotero、临时安装插件并回传 Mocha 结果；
- [`scripts/run-zotero-full-suite.ts`](../scripts/run-zotero-full-suite.ts)：把 full 套件拆为三个独立 Zotero 进程，降低长进程尾部退化。

这些组件解决了“怎样在一个 Zotero 中跑测试”，尚未解决“怎样对一组可追溯的 Zotero 版本重复运行同一套测试”。目前的缺口集中在宿主编排：

1. 运行时只接受一个 `ZOTERO_PLUGIN_ZOTERO_BIN_PATH`。
2. scaffold 在未提供二进制时会下载当时的 beta；这对开发方便，却不具备版本可复现性。
3. profile、数据目录和构建缓存没有按宿主版本命名。
4. CI 结果没有记录请求版本、实际版本、下载来源和二进制摘要。
5. 真实宿主测试与正式 XPI 安装兼容性还不是同一件事。
6. 当前 manifest 只覆盖 Zotero 7—9，尚未形成 Zotero 10 的可信发布结论。

所以，兼容矩阵首先是一个证据与编排问题。新增多少测试，要由各版本真实暴露的风险决定。

## Pi spike 给出的直接经验

Pi core spike 固定了 `@earendil-works/pi-agent-core@0.84.3` 和 `@earendil-works/pi-ai@0.84.3`，把同一个自包含 browser bundle 分别放进 Zotero 7.0.32 与 9.0.4 执行。两版都完成了流式文本、工具调用、取消、listener 解除、reset，以及通过宿主注入 `fetch` 解析 OpenAI Responses fixture。

该 spike 的报告位于远端原型提交 [`c073b007`](https://github.com/leike0813/zotero-agents/commit/c073b007)；以下经验应进入正式框架，而临时操作本身不应沿用。

### 已证明可复用的做法

- 通过 `ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 选择明确的 Zotero 二进制是可行的。
- 同一个构建产物可以跨宿主运行，不需要为 Zotero 7 和 9 分别编译业务代码。
- `xvfb-run -a` 足以在 Linux CI 中启动真实 GUI 宿主测试。
- 测试应在日志和 receipt 中同时记录 `Zotero.version`，不能只相信下载参数。
- provider 网络路径可以使用本地 fixture `fetch` 验证，无需真实 API key 或公网请求。
- 测试结果应观察稳定的公开行为，如最终文本、工具参数、取消状态和 listener 清理，而不是 Pi 的内部调用顺序。

### 不应固化的临时做法

- 不应为了加入探针临时修改再恢复 `test/zotero/**/suite.test.ts`。
- 不应从工作区外临时链接 `node_modules` 后，让来源信息消失在最终结果里。
- 不应手工下载一个宿主后只在自然语言里记录其版本。
- 不应把“存在全局 `require`”当作 Node 运行时检测；Zotero 7 和 9 都提供自己的 `require`，但不能加载 `node:fs`。
- 不应让不同大版本复用同一 profile 或数据目录。Zotero 的数据库升级可能使降级变得不安全。
- 不应只保留终端输出。没有结构化 receipt，就很难确认两次运行是否真的使用了相同输入。

### 由 spike 暴露出的框架要求

Pi 探针中的 browser boundary 会拒绝所有可达的 Node builtin，只为一个精确到 importer 和 specifier 的 Bun fallback 设置 guard。兼容矩阵要保留这类“构建期约束 + 真实宿主行为”的双层证据：

```text
build audit
  └─ 证明 bundle 没有未授权 Node builtin

real-host matrix
  └─ 证明同一 bundle 在 Zotero 7/9/10 中表现一致
```

构建审计通过不能替代宿主测试；宿主测试偶然通过也不能证明 bundle 边界干净。

## 官方版本事实与当前项目状态

### Zotero 7

Zotero 7 将 Mozilla 平台升级到 Firefox 115 ESR，并引入新的 restartless 插件架构。官方版本记录显示 7.0.32 发布于 2026-01-14，是 Zotero 7 的最后维护版本。参考：

- [Zotero 7 for Developers](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [Zotero 7 Version History](https://www.zotero.org/support/7.0_changelog)
- [固定版本下载端点：7.0.32 Linux x86-64](https://www.zotero.org/download/client/dl?channel=release&platform=linux-x86_64&version=7.0.32)

### Zotero 9

Zotero 9 使用 Firefox 140 ESR。官方历史页显示 9.0.6 发布于 2026-07-07，是 Zotero 9 的最后维护版本。项目现有 Pi spike 使用的是 9.0.4，因此 9.0.6 属于框架建立后需要重新验证的目标，不能继承 9.0.4 的结果。

- [Zotero 9 for Developers](https://www.zotero.org/support/dev/zotero_9_for_developers)
- [Zotero 9 Version History](https://www.zotero.org/support/9.0_changelog)
- [固定版本下载端点：9.0.6 Linux x86-64](https://www.zotero.org/download/client/dl?channel=release&platform=linux-x86_64&version=9.0.6)

### Zotero 10

Zotero 10.0 于 2026-08-17 发布，10.0.1 于 2026-08-24 发布。它继续使用 Firefox 140 ESR，所以 9 → 10 的主要风险不在 JavaScript 语法目标，而在 Zotero 内部 API 和数据语义。官方开发者指南列出的变化包括：

- collection tree 的单选 getter 改为多选 getter；
- items view 增加 `viewMode` 与多库 header row；
- 高级搜索和 full-text 存储重构；
- 本地 HTTP server 与 Local API 收紧请求校验；
- 数据库启用 WAL，并将全文索引放到单独数据库；
- `Zotero.HTTP.download()` 改为返回 `Response`；
- 部分 Cookie、ItemTree 和本地数据写入接口发生变化。

参考：

- [Zotero 10 for Developers](https://www.zotero.org/support/dev/zotero_10_for_developers)
- [Zotero 10 Version History](https://www.zotero.org/support/changelog)
- [固定版本下载端点：10.0.1 Linux x86-64](https://www.zotero.org/download/client/dl?channel=release&platform=linux-x86_64&version=10.0.1)

当前 [`addon/manifest.json`](../addon/manifest.json) 仍声明：

```json
{
  "strict_min_version": "7.0",
  "strict_max_version": "9.0.*"
}
```

[`test/node/core/130-zotero9-compatibility.test.ts`](../test/node/core/130-zotero9-compatibility.test.ts) 也明确断言这个范围。这是当前状态，不是需要被测试框架绕过的障碍。框架应把它报告出来，并在 Zotero 10 正式适配完成前保留清晰的非阻塞状态。

## 术语与证据等级

兼容性讨论很容易把不同层次混在一起。框架应固定以下术语：

### 声明兼容

生产 manifest 的 `strict_min_version` 和 `strict_max_version` 覆盖目标宿主。它只说明插件允许安装，不说明实际功能可用。

### 构建兼容

生产 bundle 能以约定 target 构建，且没有触达禁止的 Node builtin、平台专用入口或未批准 polyfill。它不证明 Zotero API 调用正确。

### 宿主行为兼容

同一个插件构建在指定 Zotero 二进制中启动并通过约定的真实宿主测试。这是兼容矩阵的主要证据。

### 包安装兼容

正式 XPI 在干净 profile 中由 Zotero AddonManager 接受、启用并执行启动流程，未使用测试专用 manifest override。这是发布兼容声明的必要证据。

### 版本族兼容

对某个大版本给出支持承诺。该承诺必须明确代表版本和测试政策。默认语义是“对固定代表版本进行持续验证”，不是对所有历史补丁构建逐个验证。

一份可信 receipt 至少要能回答：测试了哪个源码、哪个插件产物、哪个 Zotero 二进制、哪组测试、结果如何。

## 目标与非目标

### 首期目标

- 在 Linux x86-64 上自动取得并运行 Zotero 7.0.32、9.0.6、10.0.1。
- 三个宿主复用现有 `lite/full` 与 domain 聚合入口。
- 每个宿主使用独立 profile、数据目录、运行时目录、端口和诊断目录。
- 下载与执行都能生成机器可读证据。
- CI 可以并行运行三个宿主，并在某一项失败后继续收集其它版本结果。
- 本地开发者可以选择单一宿主或运行完整矩阵。
- 发布门禁能区分普通测试 bundle 与正式 XPI 安装。
- 为未来 Pi runtime 建立“同一 browser bundle 跨宿主”的持续回归路径。

### 首期不做

- 不同时覆盖 Linux、Windows、macOS 的完整三版本笛卡尔积。
- 不测试每一个 Zotero 7/9/10 补丁版本。
- 不在兼容测试中调用真实模型服务或使用真实 API key。
- 不把 beta/nightly 的结果计入稳定版兼容声明。
- 不把 Node mock 测试重复搬进真实宿主套件。
- 不为了矩阵新增大量只断言版本字符串的低价值测试。
- 不修改 Zotero 7/9/10 的数据库以构造跨版本升级测试；升级迁移应是单独的、有备份的测试项目。
- 不借兼容框架顺带重写现有测试分类。

## 总体架构

框架位于现有 Zotero runner 外侧，而不是嵌入每个测试文件：

```text
test/zotero/compatibility-matrix.json
              │
              ▼
宿主解析与校验
  ├─ 选择 host ID / suite / domain
  ├─ 下载或恢复缓存
  ├─ 校验 SHA-256 与实际 Zotero.version
  └─ 准备隔离目录
              │
              ▼
现有真实宿主测试入口
  run-zotero-test-with-mock.ts
              │
              ▼
zotero-plugin-scaffold test runner
  ├─ 安装同一个插件构建
  ├─ 安装测试 runner
  └─ 执行 lite/full + domain
              │
              ▼
结构化 receipt + 原始日志 + 诊断附件
```

实现时应尽量只有一个新深层模块承担宿主解析、获取、运行和报告，而不是拆出一堆互相转发参数的小脚本。建议入口为：

```text
scripts/run-zotero-compatibility-matrix.ts
```

它可以导出少量稳定函数供现有测试复用，同时用 CLI guard 提供命令行入口。下载、解压、缓存和 receipt 都属于这个模块内部细节。

## 版本清单：唯一事实源

建议新增：

```text
test/zotero/compatibility-matrix.json
```

最小模型如下：

```json
{
  "schema_id": "zotero-agents.zotero-compatibility-matrix.v1",
  "platforms": {
    "linux-x86_64": {
      "runner": "ubuntu-latest"
    }
  },
  "hosts": [
    {
      "id": "zotero-7",
      "version": "7.0.32",
      "channel": "release",
      "platform": "linux-x86_64",
      "download_url": "https://www.zotero.org/download/client/dl?channel=release&platform=linux-x86_64&version=7.0.32",
      "sha256": "<受控下载后记录的 64 位十六进制摘要>",
      "expected_binary": "Zotero_linux-x86_64/zotero",
      "mozilla_baseline": "firefox115",
      "policy": "blocking"
    }
  ]
}
```

完整清单加入三个 host。字段约束如下：

- `id`：稳定标识，用于 CLI、CI job、缓存键和 receipt；版本升级不改变大版本 ID。
- `version`：必须是精确版本，禁止 `latest`、`9.*` 或空值。
- `channel`：稳定矩阵只能是 `release`；canary 使用独立条目或独立发现流程。
- `platform`：显式包含架构，不能只写 `linux`。
- `download_url`：保存官方入口而非临时 CDN URL。
- `sha256`：下载后必须核对；缺失或不匹配时 blocking 条目不能运行。
- `expected_binary`：解压后的相对路径，必须经过目录穿越检查。
- `mozilla_baseline`：用于解释风险和选择构建审计，不参与运行时猜测。
- `policy`：`blocking`、`preview` 或 `canary`，是门禁策略的唯一来源。

版本更新应作为显式变更进入 PR：更新版本、重定向目标、摘要和官方变更记录，然后跑完整矩阵。CI 不应在每次执行时静默追随“最新稳定版”。

## 宿主获取与供应链约束

### 跟随官方重定向，不猜归档名称

2026-08-25 的实际响应显示：

| 版本 | 官方入口重定向到 |
| --- | --- |
| 7.0.32 | `Zotero-7.0.32_linux-x86_64.tar.bz2` |
| 9.0.6 | `Zotero-9.0.6_linux-x86_64.tar.xz` |
| 10.0.1 | `Zotero-10.0.1_linux-x86_64.tar.xz` |

下载器必须让 HTTP 客户端跟随重定向，并记录最终 URL、响应长度和 SHA-256。不要根据大版本拼接 `.tar.bz2` 或 `.tar.xz`。

### 校验顺序

1. 读取并验证版本清单。
2. 以临时文件下载归档。
3. 计算 SHA-256，与清单对比。
4. 在解压前检查归档条目，拒绝绝对路径、`..`、设备文件和越界软链接。
5. 解压到新建的临时目录。
6. 确认 `expected_binary` 是普通可执行文件。
7. 启动测试后，从真实宿主读取 `Zotero.version` 和 app build ID。
8. 请求版本与观测版本不一致时立即失败，不进入测试结果比较。

### 缓存语义

Zotero 归档和解压结果可以缓存，但缓存只是加速手段，不能成为唯一副本。缓存键至少包含：

```text
zotero-host/<platform>/<version>/<sha256>/<extract-recipe-version>
```

缓存命中后仍要复核归档或已解压目录的摘要与关键文件。发现污染就丢弃该条缓存并重新下载，不能降级为“继续使用但给 warning”。

GitHub 官方明确区分 cache 与 artifact：cache 用于可重新获取的依赖，artifact 用于保留某次运行的结果；恢复的 cache 也应视为不可信输入。[GitHub Actions dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)

### 更新发现

可以增加定时的版本发现任务，但它只负责报告：

- 当前固定版本；
- 官方 release 当前版本；
- 重定向目标是否变化；
- 是否需要人工更新矩阵。

发现任务不能直接改矩阵、覆盖摘要或改变 blocking 版本。更新由常规 PR 完成。

## 构建一次，测试同一产物

宿主矩阵最容易出现的一类误差，是每个 job 各自构建一次，最后无法确认差异来自 Zotero 还是构建结果。正式设计应采用：

1. 一个 build job 生成插件目录与 XPI；
2. 记录源码 commit、dirty 状态、构建命令、XPI SHA-256 和主要 bundle SHA-256；
3. 上传 build artifact；
4. 三个宿主 job 下载同一个 artifact；
5. 每个 job 只生成与测试 runner 有关的临时 bundle，不重建生产插件。

现有 `zotero-plugin test` 会自行执行部分构建流程，因此落地时需要先确认 scaffold 是否能接收预构建 addon 目录。如果不能，应在项目 wrapper 中增加一个窄适配层，或向 scaffold 上游补充该能力。不能为了赶进度而默认“三次构建大概率一样”。

开发阶段的普通 `npm run test:zotero:*` 可以继续按现状构建。只有兼容矩阵和发布门禁要求严格的单产物复用。

## 测试运行隔离

### 每次运行独占的目录

每个 `host × suite × domain × attempt` 必须拥有：

- Zotero profile；
- Zotero data directory；
- Zotero Agents runtime root；
- scaffold test resource/output；
- 诊断输出目录；
- 本地 HTTP reporter 端口；
- Mock SkillRunner 端口；
- 临时 HOME 类配置根，如宿主确实读取它。

推荐目录结构：

```text
<temp>/zotero-agents-compat/<run-id>/
  host/
  profile/
  data/
  runtime/
  scaffold/
  diagnostics/
  receipt.json
```

这些目录都必须在操作前解析为绝对路径，并确认位于本次创建的临时根下。清理只能针对该根执行。

### 绝不跨大版本复用 profile

官方 beta 文档明确提醒，预发布版可能升级数据库，使降级必须依赖备份或新数据目录。[Zotero Beta Builds](https://www.zotero.org/support/beta_builds)

即使稳定版之间偶尔可以复用，测试框架也不应依赖这种偶然性。Zotero 10 启用 WAL 并改变全文索引存储后，这条规则更有必要。

### 当前 scaffold 的限制

`zotero-plugin-scaffold@0.8.2` 的 test runner 默认使用 `.scaffold/test/profile` 和 `.scaffold/test/data`。CI 的三个矩阵 job 天然位于不同 runner，彼此不会碰撞；本地串行矩阵却会复用路径。

正式落地应优先让 scaffold 支持显式的 per-run profile/data root。如果短期无法做到，本地 orchestrator 必须在每个宿主运行前后清理经过严格校验的 `.scaffold/test`，且发生异常时保留失败现场到 diagnostics，而不是继续用旧 profile 跑下一个版本。

### 端口

现有 Mock SkillRunner 已默认申请 OS 随机端口，应继续保留。scaffold reporter、Zotero Local API 和调试端口也必须避免固定冲突。receipt 记录实际分配端口即可，不能把它们作为测试比较字段。

## 复用现有 suite，而不是复制测试

矩阵只改变宿主，不改变测试含义：

```text
host = zotero-7 | zotero-9 | zotero-10
mode = lite | full
domain = all | core | ui | workflow
```

现有 suite entry 继续是唯一的测试成员事实源。不要创建：

```text
test/zotero7/**
test/zotero9/**
test/zotero10/**
```

这种目录很快会复制相同用例，并让修复只发生在某一版。

如果某项行为确实只存在于 Zotero 10，应把它放在对应业务域的现有测试文件中，并使用明确的宿主能力条件。条件必须读取真实 `Zotero.version` 或可观察 capability，不允许依赖 CI job 名。

### 版本条件的使用边界

可以使用版本条件的情形：

- 官方 API 只存在于某个大版本；
- 测试在验证产品 compatibility adapter 的两个合法分支；
- 某个宿主明确不存在被测用户功能。

不应使用版本条件的情形：

- 某个版本当前失败，先 `skip` 让矩阵变绿；
- 测试 setup 不稳定；
- 完整错误文案不同；
- 内部 DOM 或私有字段不同，但用户行为相同。

对于共同的用户行为，测试断言应保持一致。差异由产品兼容层吸收。

## 建议的测试矩阵与门禁

### PR 门禁

| Host | Suite | Domain | 策略 |
| --- | --- | --- | --- |
| Zotero 7.0.32 | `lite` | `all` | blocking |
| Zotero 9.0.6 | `lite` | `all` | blocking |
| Zotero 10.0.1 | `lite` | `all` | preview，完成正式适配后 blocking |

PR 矩阵用于快速暴露启动失败、bundle 语法问题、核心 API 漂移和资源清理问题。Zotero 10 转为 blocking 的条件见后文。

### `main` 门禁

三个宿主分别运行 `full`。每个 host job 内仍按现有设计顺序启动 `core/full`、`ui/full`、`workflow/full` 三个 Zotero 进程。宿主之间并行，domain 之间顺序执行，既能缩短总时间，也不会把三个 domain 塞进一个超长进程。

矩阵建议设置 `fail-fast: false`。某个版本失败后仍收集其它版本证据，更有利于判断是通用回归还是单宿主漂移。GitHub Actions 的 matrix 和 `fail-fast` 语义见[官方 workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。

### 发布门禁

发布门禁包含两个部分：

1. 三宿主 `full` 行为矩阵；
2. 同一个正式 XPI 的三宿主包安装 smoke。

包安装 smoke 至少验证：

- AddonManager 接受 XPI；
- 插件没有因版本范围而 `appDisabled`；
- 插件状态为 active；
- 启动标记在超时内出现；
- 禁用或关闭后执行清理；
- 加载的是目标 XPI SHA-256，不是 `.scaffold/build/addon` 中的临时目录。

只有这两部分都通过，才能将该宿主写入发布兼容声明。

### Canary

下一版 beta 或开发构建单独运行：

- 定时触发；
- `continue-on-error: true`；
- 不覆盖稳定矩阵 receipt；
- 失败会生成 issue/通知，但不改变当前发布结论；
- 版本必须从真实宿主读取并记录，因为 beta 会滚动更新。

稳定版矩阵与 canary 不能共用同一个 host ID。

## 避免矩阵爆炸

兼容性有多个潜在维度：Zotero 版本、操作系统、CPU 架构、suite、domain、插件配置和后端。全部相乘既昂贵，也让失败难以定位。

首期采用正交覆盖：

- 宿主版本：Linux x86-64 上覆盖 7/9/10；
- 操作系统：先在当前稳定 Zotero 上补 Windows/macOS smoke；
- 原生二进制：继续由已有七平台 Host Bridge 构建身份门禁负责；
- 后端：真实宿主矩阵使用本地 mock 或 deterministic fixture；
- 模型 provider：每个 provider 单独做 bundle audit 和 fixture fetch，不导入 `providers/all`；
- 长链路工作流：进入 full，不进入每次 PR 的额外配置组合。

当线上缺陷证明某个组合有独立风险时，再把那个组合加入矩阵。不要凭想象提前乘出几十个 job。

## 各宿主应关注什么

框架负责运行，测试内容仍应根据项目实际调用的 API 决定。下面是审查方向，不是要求一次性添加全部用例。

### Zotero 7：Firefox 115 与旧宿主基线

- 生产 bundle 保持 `firefox115` target；
- 无 Node builtin 或仅在新 Firefox 可用的未转译语法；
- 启动、菜单、首选项、item pane、Reader 和 window 生命周期；
- `IOUtils`、Subprocess、路径和文件 API 的兼容 helper；
- 宿主关闭、插件禁用和多窗口卸载时的清理；
- Pi runtime 的 stream、tool、abort、reset 与 custom fetch。

Zotero 7 是当前最低支持版本，因此它更接近“兼容下限”门禁。

### Zotero 9：Firefox 140 迁移后的稳定基线

- Firefox 140 中 ESM、worker、fetch 和流式 API 行为；
- Zotero 8/9 期间发生变化的 Mozilla 与内部 API；
- 文件 I/O、runtime persistence 和 Host Bridge；
- Assistant Workspace 的真实宿主渲染与生命周期；
- 与 Zotero 7 结果的结构化行为对比。

Pi spike 已在 9.0.4 通过，正式矩阵需要在 9.0.6 重跑后才能形成新证据。

### Zotero 10：内部 API 与数据语义

只在项目确实触达相关功能时新增回归：

- collection tree 多选与 plural getter；
- items view 的 `viewMode`、header row 和 object row 过滤；
- 搜索条件组、`resultLevel` 与 full-text API；
- Local API 的 `Host`、`Zotero-Allowed-Request` 和 `Zotero-Server-ID`；
- WAL、独立 `ftindex` 与测试数据库复制策略；
- `Zotero.HTTP.download()` 返回 `Response` 后的调用方行为；
- Cookie context、ItemTree 类拆分和本地化注册；
- 正式 XPI manifest 的 `10.0.*` 声明。

当前项目如果没有调用某个受影响 API，不应为了“清单完整”写一个不会保护真实行为的测试。

## Zotero 10 的可信启用流程

Zotero 10 不应从 preview 直接改为 blocking。建议按以下证据推进：

1. 在不改生产 manifest 的情况下，运行独立 compatibility probe，确认 runner 本身能在 Zotero 10 启动。
2. 审查项目实际触达的 Zotero 10 变更点，修复 compatibility adapter。
3. 用明确标记的测试专用 manifest overlay 运行行为矩阵。receipt 必须记录 overlay 内容，并把结果标为 `preview`。
4. 更新生产 `strict_max_version` 为 `10.0.*`，同时更新现有 manifest 契约测试。
5. 使用未修改的生产 addon 目录通过 Zotero 10 full suite。
6. 使用正式 XPI 通过 Zotero 10 包安装 smoke。
7. 删除测试专用 overlay 路径，或把它限制为未来大版本预适配工具。
8. 将矩阵中的 Zotero 10 policy 改为 `blocking`。

第三步只是开发手段。任何 overlay 运行都不得用于发布兼容声明。

## 结构化 receipt

每个矩阵单元输出一份 JSON，Markdown 摘要从 JSON 派生。JSON 是唯一事实源。

建议结构：

```json
{
  "schema_id": "zotero-agents.zotero-compatibility-receipt.v1",
  "run_id": "2026-08-25T12-34-56Z-zotero-9-full",
  "source": {
    "commit": "<git-sha>",
    "dirty": false
  },
  "plugin": {
    "version": "<package-version>",
    "xpi_sha256": "<sha256>",
    "manifest_min": "7.0",
    "manifest_max": "9.0.*",
    "manifest_overlay": null
  },
  "host": {
    "id": "zotero-9",
    "requested_version": "9.0.6",
    "observed_version": "9.0.6",
    "app_build_id": "<build-id>",
    "platform": "linux-x86_64",
    "download_url": "<official-entry-url>",
    "effective_url": "<redirect-target>",
    "archive_sha256": "<sha256>"
  },
  "suite": {
    "mode": "full",
    "domain": "all",
    "entry_signature": "<sha256>"
  },
  "result": {
    "status": "passed",
    "passed": 123,
    "failed": 0,
    "pending": 4,
    "exit_code": 0
  },
  "timing": {
    "started_at": "<iso-time>",
    "finished_at": "<iso-time>",
    "duration_ms": 123456
  },
  "diagnostics": []
}
```

### receipt 硬约束

- 请求版本和观测版本必须同时存在；
- 源码 dirty 状态不能省略；
- 测试专用 manifest overlay 必须逐字记录或记录摘要与来源；
- 失败、超时、signal 终止也必须写 receipt；
- 最终状态只能由结构化测试结果和进程退出状态共同得出；
- 日志缺失不能被解释为通过；
- receipt 不得包含 API key、token、完整 HOME 路径中的用户名或文献库敏感内容；
- 同一 run ID 不得覆盖已有 receipt。

矩阵汇总只聚合 receipt，不重新解析人类日志来猜状态。

## 日志与失败现场

每个矩阵单元保留：

```text
receipt.json
summary.md
runner.stdout.log
runner.stderr.log
zotero-debug.log
test-events.jsonl
diagnostics/
```

上传 artifact 时使用 `if: always()`，否则最需要诊断信息的失败 job 反而不会上传。GitHub Actions 支持为 artifact 设置独立 retention period，详见[官方文档](https://docs.github.com/en/actions/tutorials/store-and-share-data)。

建议保留策略：

- PR 成功：7 天；
- PR 失败：14 天；
- `main` full：30 天；
- release gate：与发布审计周期一致；
- canary：14 天。

日志应在生成时脱敏，不要指望上传前再做一次容易漏项的批量替换。

## 超时、退出与残留进程

真实 GUI 宿主最常见的失败不是断言失败，而是没有进入测试、没有退出或残留后台循环。框架要区分：

| 阶段 | 典型失败 | 结果代码示例 |
| --- | --- | --- |
| download | URL/摘要错误 | `host_acquisition_failed` |
| extract | 归档不安全或 binary 缺失 | `host_extract_failed` |
| startup | Zotero 未启动或插件未初始化 | `host_startup_timeout` |
| test | Mocha 失败 | `test_failed` |
| settlement | reporter 未收到 end | `test_settlement_timeout` |
| shutdown | Zotero/child process 未退出 | `host_shutdown_timeout` |
| cleanup | 临时目录或端口残留 | `cleanup_incomplete` |

不能把所有情况压成 exit code 1。结构化 code 决定后续是修测试、修产品、刷新宿主缓存还是检查 runner。

进程清理顺序建议为：

1. 请求测试 runner 正常结束；
2. 请求 Zotero 正常关闭；
3. 等待有限宽限期；
4. 向本次启动的进程组发送 `SIGTERM`；
5. 再等待有限宽限期；
6. 只对已记录 PID/进程组做最后终止；
7. 记录是否使用了强制终止。

不要用进程名全局杀死所有 Zotero，也不要影响开发者正在使用的 Zotero 实例。

## CI 拓扑

建议在现有 `.github/workflows/ci.yml` 中扩展，而不是先新增一个功能重叠的 workflow。概念拓扑如下：

```yaml
jobs:
  build-test-artifact:
    # 构建一次，记录摘要并上传

  zotero-lite-matrix:
    needs: build-test-artifact
    strategy:
      fail-fast: false
      matrix:
        host: [zotero-7, zotero-9, zotero-10]
    # 下载同一插件产物
    # 获取并校验 matrix.host
    # 运行 lite/all
    # always() 上传 receipt 与日志

  zotero-full-matrix:
    if: push-to-main-or-release
    needs: build-test-artifact
    strategy:
      fail-fast: false
      matrix:
        host: [zotero-7, zotero-9, zotero-10]
    # 每个 host 内顺序运行 core/ui/workflow full
```

矩阵值最好由 `compatibility-matrix.json` 生成，而不是在 YAML 再写一遍版本号。YAML 只消费 host ID 和 policy。

### 并发与资源

- 三个 host job 可并行；
- 同一 job 内的 full domain 保持顺序；
- 每个 job 只启动一个 Zotero GUI；
- `max-parallel` 可根据 CI 配额调整，不影响语义；
- Xvfb display 由 `xvfb-run -a` 自动分配；
- 下载 cache 不能包含 profile、数据目录或测试结果。

## 本地开发命令设计

建议增加少量命令，不暴露下载器内部参数：

```bash
npm run test:zotero:compat -- --host zotero-7 --mode lite
npm run test:zotero:compat -- --host zotero-10 --mode full --domain core
npm run test:zotero:compat:matrix -- --mode lite
npm run test:zotero:compat:verify-hosts
```

约束：

- `--host` 只接受清单中的 ID；
- `--version` 不作为普通入口，防止绕过矩阵；
- 本地已有二进制可以用显式 `--binary` 覆盖，但 receipt 仍要读取真实版本和计算 binary identity；
- 覆盖运行默认标记为 `local-override`，不能生成 release-grade receipt；
- 命令打印所选 host、版本、suite、domain、临时根和 artifact 目录后再启动。

现有 `npm run test:zotero:*` 保持不变，继续服务于当前配置的单宿主快速开发。

## 与现有测试治理的衔接

矩阵不新增 tier。现有规则继续生效：

- `lite` 是高信号、稳定、适合 PR 的集合；
- `full` 是 `lite` 的严格超集；
- `zotero-unsafe` 测试不进入常规真实宿主；
- editor、picker、dialog 和多 realm 脆弱 override 仍需排除；
- 测试稳定的用户或调用方可观察行为，不锁定完整文案、DOM 细节和内部顺序。

兼容矩阵会放大一个 flaky test 的成本。因此，把测试加入 `lite` 前还应多问一个问题：它在三个宿主中失败时，是否能明确指出一个需要阻断 PR 的兼容性回归？如果答案是否定的，就不应进入三宿主 PR 矩阵。

## TDD 落地顺序

测试框架本身也需要测试，但只保护稳定契约，不对脚本文案或 YAML 排版做静态断言。

### 阶段 1：版本清单与选择

先扩展现有 [`test/node/core/91-zotero-test-infrastructure.test.ts`](../test/node/core/91-zotero-test-infrastructure.test.ts)，覆盖：

- 拒绝重复 host ID；
- 拒绝非精确版本；
- 拒绝 blocking host 缺少 SHA-256；
- 按 host ID 选择唯一条目；
- 拒绝不支持的平台；
- 规范化后不丢失 policy。

实现最小的 matrix loader。不要为错误文案写精确断言，断言结构化错误码。

### 阶段 2：下载、摘要与安全解压

使用本地 HTTP fixture 和小型归档测试：

- 跟随重定向并记录 effective URL；
- 摘要匹配后才解压；
- 摘要不匹配立即失败；
- 拒绝绝对路径和 `../`；
- 缓存命中仍做完整性复核；
- `.tar.bz2` 与 `.tar.xz` 走同一抽象入口。

单元测试不得下载真实 Zotero。真实下载属于显式 integration 验证。

### 阶段 3：运行参数与隔离

继续扩展现有基础设施测试：

- host ID、binary、profile、data、runtime 和 diagnostics 正确传递；
- 每个 run ID 产生不同目录；
- 清理目标必须位于受管临时根；
- signal 与 child exit 被映射为结构化状态；
- 调用现有 wrapper 时不丢失 `mode/domain/grep`。

### 阶段 4：receipt

用表格驱动测试覆盖 passed、assertion failure、startup timeout、shutdown timeout。测试结构化字段和状态码，不锁定 Markdown 摘要全文。

### 阶段 5：真实宿主 MVP

先让 Zotero 7.0.32 和现有验收宿主通过 lite，再加入 9.0.6，最后接入 Zotero 10 preview。每加入一个版本都保存首份 receipt，避免一次引入三个宿主后难以定位 runner 问题。

### 阶段 6：CI 与正式 XPI

接入 PR matrix，稳定后再接 full matrix。正式 XPI 安装 smoke 最后加入，因为它需要明确 AddonManager 安装方式、manifest 语义和同一产物复用。

## 建议的实施文件清单

这不是本次文档任务要立即创建的文件，只是后续实现范围：

| 文件 | 动作 | 责任 |
| --- | --- | --- |
| `test/zotero/compatibility-matrix.json` | 新增 | 宿主版本、来源、摘要与 policy 的 SSOT |
| `scripts/run-zotero-compatibility-matrix.ts` | 新增 | 选择、获取、校验、隔离、运行、receipt 的深层模块 |
| `scripts/run-zotero-test-with-mock.ts` | 修改 | 接受已解析的隔离目录与宿主身份，不复制启动逻辑 |
| `zotero-plugin.config.ts` | 修改 | 如有必要，接收预构建 addon/test root；保持默认行为不变 |
| `package.json` | 修改 | 提供少量稳定命令入口 |
| `.github/workflows/ci.yml` | 修改 | 消费 host matrix，复用单一 build artifact |
| `test/node/core/91-zotero-test-infrastructure.test.ts` | 修改 | 复用现有基础设施测试覆盖稳定 runner 契约 |
| `doc/testing-framework.md` | 修改 | 框架落地后更新 current-state 文档 |

只有当 `run-zotero-compatibility-matrix.ts` 变得难以理解且出现真正独立的下载领域时，才考虑拆分模块。不要一开始新增 resolver、downloader、cache、runner、reporter 五个浅层文件。

## MVP 验收标准

MVP 完成时应能证明：

- 矩阵清单是版本号、URL、摘要和 policy 的唯一事实源；
- 同一命令可选择 Zotero 7、9 或 10；
- 三个宿主均使用独立运行目录；
- 请求版本与 `Zotero.version` 一致；
- 同一个测试用插件产物被三个宿主使用；
- 三个宿主都能运行现有 lite suite；
- Zotero 10 的 preview/blocking 状态不会被日志措辞混淆；
- 每个运行无论成功失败都生成 receipt；
- 失败 job 会上传日志与诊断；
- 所有受管子进程在超时后被有界清理；
- 开发者已有 `test:zotero:*` 命令不受影响；
- 没有真实 API key、文献库或用户 profile 进入 CI artifact；
- 文档、CLI help 和 CI 使用相同 host ID。

正式支持 Zotero 10 还需额外满足：

- 生产 manifest 声明 `10.0.*`；
- 现有 manifest 契约测试已更新；
- Zotero 10 full suite 通过；
- 正式 XPI 安装 smoke 通过；
- Zotero 10 相关 compatibility adapter 已有针对实际使用行为的回归测试；
- preview overlay 不参与最终证据。

## 风险与处理

### scaffold 行为漂移

`zotero-plugin-scaffold` 当前以 caret 版本安装，升级可能改变下载、profile、测试 runner 或临时插件安装方式。矩阵 receipt 应记录 scaffold 精确版本；lockfile 更新后必须重跑基础设施测试和至少一个真实宿主 smoke。

### 旧版宿主下载消失

官方固定版本入口目前可用，但历史资产并非由本项目控制。清单保留 effective URL 与 SHA-256；如果官方入口失效，应先决定可信镜像政策，不能临时从第三方下载并继续标为官方来源。

### 临时插件安装绕过正式兼容语义

scaffold 的行为测试适合验证代码，但不能替代 XPI 安装。release gate 必须包含未修改正式 manifest 的独立包安装 smoke。

### 三版本 full 成本过高

先测量每个 host/domain 的真实耗时，再决定 `main` 与 nightly 分配。不能通过删掉高价值测试来压缩矩阵；可以调整触发频率、并发和 cache。

### 版本专用 skip 增长

把 skip 数量写进 receipt，并按 host 比较。新增版本专用 skip 必须说明用户功能为何不存在。skip 突然增加应视为矩阵退化。

### Zotero 自动更新污染固定版本

测试 profile 必须关闭应用自动更新。运行后仍读取 `Zotero.version`；只设置 pref 而不验证实际版本不够。

### 诊断中泄露本地数据

矩阵只使用空白或受控 fixture library。日志输出前统一脱敏路径、token、Authorization header 和用户文献内容。缓存中不放 profile、数据库或凭据。

## 后续扩展顺序

MVP 稳定后，建议按风险而非功能数量扩展：

1. Zotero 10 从 preview 转为 blocking。
2. 下一版本 beta canary。
3. 当前稳定 Zotero 的 Windows x64 启动与包安装 smoke。
4. 当前稳定 Zotero 的 macOS 启动与包安装 smoke。
5. 真正受平台影响的 Host Bridge/sidecar 行为测试。
6. 插件跨版本升级测试：旧插件状态 → 新插件状态。
7. 只有在用户仍大量使用更早补丁版且出现真实差异时，加入第二个代表版本。

不要把“支持三个 Zotero 大版本”与“每个平台都跑所有 full workflow”绑定成同一期目标。

## 最终设计判断

兼容矩阵应是现有测试框架的宿主编排层。它不拥有业务测试，也不拥有第二套 suite 分类；它拥有版本、二进制、隔离、执行证据和门禁策略。

Pi spike 已经证明最关键的技术路径：同一个 Firefox 115 browser bundle 可以在 Zotero 7 和 Zotero 9 中运行完整的 Agent core 行为，且不需要 Node 运行时。接下来真正缺的是持续、可追溯、不会污染 profile 的自动化执行。把版本清单、单产物复用和 receipt 做扎实，未来 Pi 版本升级、Zotero 10 适配以及更多 provider 的验证都能复用这一框架。

## 参考资料

### 项目内部

- [`doc/testing-framework.md`](../doc/testing-framework.md)
- [`scripts/run-zotero-test-with-mock.ts`](../scripts/run-zotero-test-with-mock.ts)
- [`scripts/run-zotero-full-suite.ts`](../scripts/run-zotero-full-suite.ts)
- [`zotero-plugin.config.ts`](../zotero-plugin.config.ts)
- [`addon/manifest.json`](../addon/manifest.json)
- [`test/node/core/91-zotero-test-infrastructure.test.ts`](../test/node/core/91-zotero-test-infrastructure.test.ts)
- [`test/node/core/130-zotero9-compatibility.test.ts`](../test/node/core/130-zotero9-compatibility.test.ts)
- [Pi core Zotero 兼容性 spike 提交 `c073b007`](https://github.com/leike0813/zotero-agents/commit/c073b007)

### Zotero 官方

- [Zotero 7 for Developers](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [Zotero 7 Version History](https://www.zotero.org/support/7.0_changelog)
- [Zotero 9 for Developers](https://www.zotero.org/support/dev/zotero_9_for_developers)
- [Zotero 9 Version History](https://www.zotero.org/support/9.0_changelog)
- [Zotero 10 for Developers](https://www.zotero.org/support/dev/zotero_10_for_developers)
- [Zotero 10 Version History](https://www.zotero.org/support/changelog)
- [Zotero Beta Builds](https://www.zotero.org/support/beta_builds)

### GitHub Actions 官方

- [Workflow syntax and matrix strategy](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)
- [Store and share data with workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
