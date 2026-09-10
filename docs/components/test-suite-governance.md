# Test Suite Governance

## 门禁

PR 和 release 都必须通过确定性 Node 层与真实 Zotero 层：

- PR：治理检查 + Synthesis native stage1 + `npm test` + `test:lite`。
- release：同上，但最后运行 `test:full`。

`full` 是 `lite` 与 `tests/zotero/*/full` 额外成员的并集。三个 Zotero domain 顺序运行，任一失败即门禁失败。

## 成员事实源

- Node：`scripts/run-node-test-shards.ts`。
- Zotero：`tests/zotero/{core,ui,workflow}/{lite,full}` 的实际文件。

禁止恢复聚合 import suite、文件 allowlist、标题前缀 allowlist或按测试标题裁剪 case。成员变化通过移动文件表达。

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

这是对测试资产的维护，不要求 red-green-refactor，也不给 runner、目录或测试文本增加元测试。完成判断来自 inventory、实际分域运行、完整 Node 门禁和 Zotero 7/9/10 的实机结果。
