# Change B 验证记录

2026-10-03，依据 #58 及其已关闭的来源、元数据、更新和维护决策实现。源码基线为 `c71acbc4`，Pi core/ai 保持 `1.0.0`。这是未提交工作树的开发验证，没有提交、归档或发布，也不认证 C20 的正式候选。

## 完成范围

14/14 实现任务完成；proposal、design、tasks 和七份 delta spec 齐备，`openspec validate decouple-builtin-pi-model-catalog --strict` 通过。

| 规格边界 | 实现与验证依据 |
| --- | --- |
| Provider configuration / catalog | `piModelCatalog.ts` 持有来源、恢复、代际、串行提交和调度；`piModelCatalogData.ts` / `shared/piModelMetadata.ts` 统一解释官方、overlay 和 canonical 元数据。242/243 验证绑定、未知能力、退休、恢复、ETag、持久化失败、共享取消、旧缓存和账户身份。 |
| Provider execution | `piProviderExecution.ts` 只映射冻结且适用的声明，约束实际请求字节和图片，保留实际 usage。246 验证请求行为、凭据隔离、元数据、输入上限与失败用量。 |
| Turn preparation | `piTurnPreparation.ts` 记录安全选择引用；247 验证调用前 preparation、冻结约束、未知上限和压缩；276/281 既有 Zotero wrapper 复用 Runtime/Preparation 用例。 |
| Owner persistence | `shared/piUsageContract.ts` 提供安全 canonical 选择与唯一费用计算规则；240/241 验证完整、未知、阶梯、长缓存写入、失败调用用量、历史重建与去重。 |
| Conversation | `piConversation.ts` 以最后实际选择锚定新 turn，title/compaction 各调用单独持久化选择和 usage；256/257 验证继续、费率变化、辅助模型归属和历史。 |
| Skill Run | `piSkillRun.ts` 保持原模式、资源、批次及未知效果门槛，继续时重验选择；270 和已有 lifecycle/effect 测试验证这些边界。 |
| Backend Manager | 原 wire/controller/Preact region 增加来源状态和关联动作；251、Workspace chrome/identity 和既有 Zotero UI wrapper 验证草稿、关联结果和区域身份。11 种语言增加目录控件与压缩用量标签。 |

目录不再运行时导入 OMP；固定的原目录迁移输入仅为已有配置保留原始目标与能力。官方 seed 为 1529 个 chat 模型、41 个 provider，revision 为 `sha256-d28b6de6985826060b6e2ccf589d16800d9fdbc40681ae4c698421c92d2ff86f`，最低 Pi 版本 `0.80.7`。缺失费用和未报告用量保持 unknown，不用今日目录补写旧记录。

## Node、静态检查与构建

以下命令和关联分片最终通过，合计 120 个 Node 测试文件。Runtime 首轮失败与后续修复记录均保留；只有 registry 分片需要重跑，其余四个 Runtime 分片首轮通过。

```shell
npm run test:node:runtime
npm run test:node -- --shard runtime-provider-registry
npm run test:node:assistant
npm run test:node:dashboard
npm run test:node:ui
npm run test:node:tooling
npm run lint:check
npm run build
npm run check:pi-mcp-browser-bundle
npm run check:pi-model-catalog-seed
```

`build` 包含四个 Synthesis workspace 检查及根/sidebar/dashboard/synthesis TypeScript 检查。浏览器检查确认未引入 Node MCP SDK，Pi MCP 测量包为 1,778,436 字节。普通构建和 seed 校验保持离线。未运行所有无关 Node 域，也未运行完整 installed-XPI E2E。

维护工具的 10 个定向用例随 tooling 域通过。此前显式联网检查 `1.0.0`、`0.80.7` 均 compatible，返回上述 revision；`0.80.6` 为 HTTP 404 / incompatible。固定输入准备工件保留原始字节。每日 workflow 已实现，但没有在 GitHub dispatch、创建 issue 或发送消息。

## 真实 Zotero

沿现有 `npm run test:zotero:case -- lite core` 使用临时 `ZOTERO_TEST_ENTRY` 组合已有 276、278、280、281 core wrapper、278 UI wrapper 和 compatibility probe，设置 `ZOTERO_PI_CATALOG_HTTP=1` 显式启用官方 HTTP。

- 最终 115 pass，探针报告 Zotero `10.0.3`，appBuildId `20260917164854`。覆盖实际宿主无 Node 的 Runtime/Preparation、生产 Provider 请求、官方 HTTP、固定 Runtime 的目录 A→B、冻结选择和未保存表单保留。
- 较早 core 运行 18 pass；其默认安装树为 9.0.4，该次没有独立 host-facts probe，因此只作早期开发观察。
- 中间加入 probe 的 core/UI 运行 25 pass，实际宿主同为 10.0.3。
- 路径名称中的 10.0.2 不代表实际宿主版本；不修改矩阵，也不以这次运行代替固定 10.0.1 的正式验收。

这些运行加载源码测试包和 temporary addon。最终生产开发 XPI 摘要为 `0623cc71f2b8875ce09cc6851dc02c317bf81c42e1f5aae968edeba65692600e`；摘要只标识本次未提交工作树构建，不把 temporary-addon 行为提升为正式安装证据。

## 修复与证据边界

保留的失败尝试包括：入口名称漏收导致零用例；较早 UI 未等目录 ready、无关导航用例等待后人工结束该运行；旧 overlay 的未知零上限无法作为声明加载；账户返回空目录后仍可回退到绑定描述；采样参数使用错误字段名且拒绝负惩罚值；新测试缺少续期 CAS revision、错误期待 HTTP 503 的项目错误码，以及零毫秒等待未能证明请求已经发出。对应实现或测试已修复，重跑通过。历史精确 selectionId 编码断言改为验证有稳定身份，保留目标、凭据与冻结语义断言。

所有相关分片、最终 host、构建、lint、seed 和浏览器日志，以及失败尝试和本地 XPI 身份保存在忽略目录 `.scaffold/pi-change-b-evidence/`；用户 home 和仓库绝对前缀已替换。原始 `/tmp` 日志不作为唯一留存。

`gpt-6-luna` 对全部规划文档和五个重点生产模块作只读审阅，未发现额外严重偏差。来源交错提交的任意完成顺序和 30 秒超时的完整墙钟边界本轮依据生产路径审查；未声称每个规格场景都有独立自动用例。真实账号登录/退出、正式安装升级、六宿主矩阵和容量/人工 receipts 未在此轮执行。

## C20 交接

`verify-builtin-pi-runtime-release/tasks.md` 新增未勾选 2.4，把 Change B 目录、冻结元数据和分用途用量纳入同一个正式候选。C20 仍须 clean commit、候选 XPI identity、现有 full E2E/compatibility runner、固定矩阵、当前源码 sidecar 和人工 receipts。Change C 的 SIWC 迁移不在本变更内。未同步主 specs，也未归档任何 change。
