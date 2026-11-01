# Test Suite Governance

## 门禁

PR 和 release 都必须通过确定性 Node 层与真实 Zotero 层：

- `npm test`：治理检查 + 常规 Synthesis native stage1 + `test:node` + Synthesis/Host Bridge/ACP bridge Rust 测试 + `test:zotero:full`。常规 native stage1 仅对 cross-language 步骤略过 `--stress` 超大探针。
- `npm run test:deep`：阶段成员与 `npm test` 相同，恢复 cross-language 的 `--stress` 超大探针与完整压力覆盖。

常规 cross-language checker 使用 `--routine`，明确记录预算外探针为
`structureExecution.deferredToDeep`，不计作已覆盖。缺少种子、遍历截断、验证预算
耗尽和普通覆盖缺失仍然失败，deep 与 PR/release 继续要求完整结构覆盖。

- PR：治理检查 + 完整强度 Synthesis native stage1 + `test:node` + `test:lite` + 离线 WF-01。
- release：治理检查 + 完整强度 Synthesis native stage1 + `test:node` + 三套 Rust 测试 + `test:zotero:full`，其中包含 WF-01。

`full` 是 `lite` 与 `tests/zotero/*/full` 额外成员的并集。`test:zotero:full` 的四个
域各自使用独立宿主进程和 profile 并顺序运行；外层调用复用一次成功准备的插件与
当前源码 sidecar 构建，每个宿主等待插件 `initialized` readiness。任一域失败即门禁失败。

`npm test` 遇到失败仍尝试所有后续阶段、native 子步骤和 Zotero 域，末尾统一汇总；
`npm run test:deep` 采用同一失败策略。PR/release gate 和独立 `test:synthesis-native:stage1`
保留遇错即停。完整入口的控制台只显示进度与状态，失败证据写入
`artifacts/test-diagnostics/npm-test/`；独立 `test:node` 写入
`artifacts/test-diagnostics/node/`。两者都保留 `summary.json`、`failures.md`、
`results/`、`logs/` 和指向最近运行的 `latest.json`，格式与排错入口见
`docs/testing-framework.md`。

Node 分片默认并行度为 `min(可用并行度, 8)`，CI 为 `min(可用并行度, 2)`；
`--jobs N` 或 `ZOTERO_TEST_JOBS` 可覆盖，仍受可用并行度限制。

`npm test -- --profile [--jobs N]`、`npm run test:deep -- --profile` 和
`npm run test:node -- --profile --jobs 1` 启用性能剖析。报告目录中的 `profile.json`、
`profile.md` 和 `profile-metadata.json` 记录 Mocha 逐用例、hook、加载、父进程阶段及
Zotero 事件和准备耗时。CPU/RSS 只表示记录进程自身，不能当作进程树总量；full/deep
结束后的 Rust isolated-process 采样标记为 supplemental，应单独计时，不计入常规
`npm test` 耗时。

Native stage1 按 worker 数把生产测试文件分批，在隔离进程中有界并发；workflow producer 在汇总
验证证据之后串行执行。身份缓存只限当前进程作用域，作用域结束时重新校验。

## 成员事实源

- Node：`scripts/run-node-test-shards.ts`。
- Zotero：`tests/zotero/{core,ui,workflow}/{lite,full}` 与项目级 `tests/zotero/e2e/full` 的实际文件。

禁止恢复聚合 import suite、文件 allowlist、标题前缀 allowlist或按测试标题裁剪 case。成员变化通过移动文件表达。

System E2E 的 risk/catalog/ownership/quarantine/promotion 语义由 OpenSpec `system-e2e-strategy` 持有；它不复制目录成员关系。WF-01 通过独立兼容单元进入 PR Linux 10、main/release Linux 7/9/10 阻塞门禁，保留已有单元身份及其晋级证据。必需单元仅运行一次并保存 Manifest；失败、未完成或清理/健康检查失败均阻断交付。

## 价值审查

保留测试前回答三个问题：

1. 失败是否表示用户、调用方或发布消费者能观察到的稳定行为被破坏？
2. 这一风险是否已由更低成本的测试、类型系统、lint 或现有检查脚本覆盖？
3. 断言是否能容忍等价重构、文案调整和内部结构变化？

任一答案不成立时，优先删除、合并或改写。相似边界用表格驱动，只保留根因与风险边界。安全脱敏、并发、取消/重启、数据完整性、wire/schema 和不可变发布物可保留更严格断言。

Skill 测试只覆盖内置脚本行为、frontmatter/schema 和生成产物结构；禁止断言指令正文。架构 import 边界复用现有 ESLint 与 `check:*`，不再造通用测试扫描器。

## Runtime affinity

- `node-only`：模块行为、mock、fake DOM、脚本和可解析产物。
- `zotero-lite`：必须依赖真实 Zotero API 且稳定、无交互弹窗的关键风险。
- `zotero-full`：lite 加长耗时或低频真实宿主风险。
- 非常规：editor/picker/dialog、网络发布、安装器和其他不稳定外部链路。

真实宿主文件不应再使用 `isFullTestMode` 或 Node/Zotero 分支来选择 case；需要不同层级时拆文件。

## 清理

`tests/zotero/setup.test.ts` 统一负责每个 case 的诊断与清理。后台 owner 使用 stop-and-drain；宿主对象按 child note、attachment、其他 child、parent、collection 顺序删除。调查尾部退化时先收集 leak/performance digest，不以增加 timeout 掩盖泄漏。

## 治理方式

这是对测试资产的维护，不要求 red-green-refactor，也不给 runner、目录或测试文本增加元测试。完成判断来自 inventory、实际分域运行、完整 Node 门禁和 Zotero 7/9/10 的实机结果。性能测量及实机验收边界见 [完整测试性能调查](../dev/test-performance.md)。
