# Verification

## 记录范围

2026-10-15 补录。以下源码测试、类型检查和基线比对结果来自本次修复阶段已经执行的命令；本次补录只新增 change 工件，不重新修改源码或重跑整套测试。

修复前 HEAD：`8d2cf77c7c8e6f617f56ee994123d9e2ce1b3360`。交互参照 v0.8.4 commit：`fe273f37f2093c4a34be15f93e7d46a3b3484791`。

## 行为证据

| 行为 | 已通过的测试入口 |
| --- | --- |
| 普通目录项显示默认值，未手选无覆盖，同值点击可固定 | `tests/dashboard/242-dashboard-workflow-options.test.ts`、`250-dashboard-workflow-settings-dialog.test.ts` |
| backend 往返恢复有效选择，失效记录丢弃，通用设置保留 | `tests/ui/35-workflow-settings-execution.test.ts` |
| provider 切换只读缓存并选第一项，缺少 reasoning 不探测 | `35-workflow-settings-execution.test.ts`、`tests/runtime/181-provider-profile-selection.test.ts` |
| 旧 reasoning 缓存可用，跨模型/配置/revision 不混用 | `tests/acp/111-acp-backend-probe.test.ts` |
| 切换后继续改超时、立即确认、描述器乱序不恢复旧模型 | `35-workflow-settings-execution.test.ts`、两个 dashboard 表单测试 |
| 宿主删除 reasoning 不被本地草稿恢复，禁用字段不写空串 | `250-dashboard-workflow-settings-dialog.test.ts` |

## 自动验证结果

合并运行以下八个文件，最终结果 **160 passing，0 failing**：

```powershell
npx --no-install tsx node_modules/mocha/bin/mocha tests/ui/35-workflow-settings-execution.test.ts tests/runtime/181-provider-profile-selection.test.ts tests/acp/111-acp-backend-probe.test.ts tests/shared/customSelect.test.ts tests/ui/50-workflow-settings-dialog-model.test.ts tests/workflows/49-workflow-settings-domain.test.ts tests/dashboard/242-dashboard-workflow-options.test.ts tests/dashboard/250-dashboard-workflow-settings-dialog.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --reporter dot --exit
```

以下检查通过：

```powershell
npx --no-install tsc --noEmit -p tsconfig.json
npx --no-install tsc --noEmit -p tsconfig.dashboard.json
git diff --check
```

对本次修改的八个源码文件和四个测试文件运行 ESLint，通过；对修改的源码、测试、`AGENTS.md`、组件文档及两份主规格运行 Prettier `--check`，通过。

两份主规格分别经 `openspec validate <capability> --type spec` 校验通过。CLI 同时报告既有 Purpose 占位及 requirement 长度 warning；这些 warning 不代表源码测试失败，也没有作为本次自动验收通过的替代证据。

## 较宽 ACP 测试的失败与基线

额外 `test:node:acp` 运行中，ACP runtime 分片报告 396 passing、9 failing。随后在当前工作区与从修复前 HEAD 导出的临时基线各运行以下三文件，两边均为 **48 passing，9 failing**：

```powershell
npx --no-install tsx node_modules/mocha/bin/mocha tests/acp/100-acp-client-connection.test.ts tests/acp/178-acp-runtime-semantic-trace.test.ts tests/acp/249-acp-system-e2e-fixture.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --reporter dot --exit
```

- `100-acp-client-connection.test.ts` 五例：npm 报 `could not determine executable to run`，无法达到预期的冲突重试、鉴权、接收错误及退出码场景。
- `178-acp-runtime-semantic-trace.test.ts` 一例：完整多轮 Chat payload 字节计数为 `438`，断言期望 `384`。
- `249-acp-system-e2e-fixture.test.ts` 三例：fixture 的 `evidence.ndjson` 缺失，报 `ENOENT`。

基线与工作区使用同一现有依赖目录，未切换分支或覆盖未提交文件。相同失败已在修改前源码上复现，本修复没有解决这些问题，不能将较宽 ACP 分片报告为全绿。

## 尚未执行

- 插件 build-preflight、XPI 构建和真实 Zotero 鼠标/交互验收。
- Git 提交、change 归档和发布。

当前证据支持源码及模拟宿主的行为回归验证，不构成真实 Zotero UI 验收结论。

## 本次补录校验

- `openspec validate fix-workflow-cached-backend-selection`：通过。
- `npx --no-install prettier --check openspec/changes/fix-workflow-cached-backend-selection`：通过。
- 两份 delta 的七个 MODIFIED requirement 均保留完整场景并与当前主规格一致；手动刷新 requirement 的旧名称另由 RENAMED 记录。
- 本次只新增 change 目录，保留已有源码及主规格改动；没有执行归档、重复同步或 Git 提交。
