# Zotero E2E 测试

E2E 测试复用现有 `zotero-plugin-scaffold`、Mock SkillRunner 和 Zotero 测试报告器。`npm run test:zotero:full` 依次运行 core、UI、workflow 与 E2E；普通 PR 的 lite 门禁不运行 E2E。

## 测试层级

- Node 测试覆盖纯逻辑、契约和进程级 sidecar 路由。
- Zotero core/UI/workflow 测试覆盖宿主 API、页面交互与工作流集成。
- `tests/zotero/e2e/full` 覆盖完整插件构建、本地 Rust sidecar、真实 Host reverse-RPC 与跨页面业务流程。
- `npm run test:zotero:e2e:stress` 专门重复 Citation Graph 打开、关闭和重开，默认 100 轮。

E2E 构建会把当前源码编译出的 Synthesis sidecar 放入测试插件，不使用仓库中既有的发布二进制。

## LiSongTao 金例

金例只提交去标识化结构契约：`tests/fixtures/zotero-e2e/lisongtao-v1.json`。标题、作者、路径和正文不会进入仓库。运行时把指定库与 profile 复制到 `.scaffold/test`，不会修改来源目录；副本中的 machine-bound canonical identity、sidecar executable/runtime 与旧日志会被清除并由测试实例重建。

运行前关闭使用该库的 Zotero 进程，保证 SQLite、WAL 和附件快照一致。PowerShell 示例：

```powershell
$env:ZOTERO_E2E_GOLD_DATA_DIR = "<Zotero data directory>"
$env:ZOTERO_E2E_GOLD_PROFILE_DIR = "<Zotero profile directory>"
npm run test:zotero:e2e
```

刷新与 Citation Graph 压测：

```powershell
$env:ZOTERO_E2E_GOLD_DATA_DIR = "<Zotero data directory>"
$env:ZOTERO_E2E_GOLD_PROFILE_DIR = "<Zotero profile directory>"
npm run test:zotero:e2e:stress
```

`ZOTERO_SYNTHESIS_CLOSE_CYCLES` 可覆盖压测轮数。只要设置了金例 data 目录，runner 就会选择真实库路径；未设置时使用 scaffold 的隔离空库。

## 诊断产物

debug 构建会持续写入 `runtime/logs/citation-graph-crash-journal.json`。日志只保存生命周期阶段、布尔资源状态和计数；异常退出后的 active session 会在下次启动标记为 `interrupted`。压测结束时还会把日志复制到 `artifacts/test-diagnostics/citation-graph-crash-journal.json`。

生产构建通过 release-elision 门禁替换整个监听模块；Host 与 Synthesis 页面 bundle 均不包含 schema、消息名、文件名或持久化实现。

新增 E2E 用例时只断言用户可观察的终态、持久化结果和宿主存活性。不要断言内部调用顺序，也不要直接对金例来源目录执行写入。
