# Tasks

本清单补录已完成实现；下列测试结果来自本会话的实际执行。

## 1. Managed 写入与导出边界

- [x] 1.1 分离普通内容与图片绑定校验，并复用 managed 预算；`45-workflow-note-import-export.test.ts` 验证带图大摘要提交，以及超限后旧笔记内容和数量保持不变。
- [x] 1.2 收窄私有 transfer DTO，移除公开详情 enrichment；`47-workflow-literature-bundle.test.ts` 验证公开详情仍报 `resource_limited`、私有 payload/provenance 完整且 ZIP 数据与图片可校验。
- [x] 1.3 同步 note payload 文档和项目约束，并补齐 `managed-literature-artifacts` 对应场景；delta 保留两个被修改 requirement 的全部已有场景。

## 2. 文件与清理生命周期

- [x] 2.1 按笔记顺序暂存；`47-workflow-literature-bundle.test.ts` 验证失败后不启动下一笔记的图片 staging，cleanup 后没有兄弟任务继续写入。
- [x] 2.2 保留原始 materialization 错误并独立记录 cleanup 错误；`194-research-bundle-service.test.ts` 验证 cleanup 同时失败时仍返回原错误对象。
- [x] 2.3 将 XPC 读失败和复制取消的结算延后到原生 stop，并关闭源流；`184-runtime-file-transfer-governance.test.ts` 覆盖停止前占用、关闭、启动失败、取消抛错、重复取消和迟到回调，socket 与 delivery-port 测试通过。
- [x] 2.4 解压临时副本设置 owner read/write；Windows E2E 从只读文件导致清理失败转为通过，archive facade 的 13 项测试通过。
- [x] 2.5 同步 attachment lifecycle 文档和 `AGENTS.md`，明确暂存、主错误保留和原生流的结算所有权；格式检查通过。

## 3. 集成验证与变更记录

- [x] 3.1 合并执行下述 Node 测试：主组 263 项、archive facade 13 项，共 276 项通过。
- [x] 3.2 使用已发布 dev 内容包 `0.8.10-dev.14` 与当前源码构建的 sidecar，在隔离 Windows Zotero 10.0.2 执行既有 E2E runner；3 项全部通过，包含大摘要、大 Citation、两轮多图片导出、完整性与立即清理。
- [x] 3.3 完成构建预检、`npm run build`、变更文件 ESLint/Prettier、`git diff --check`、`npm run check:help-docs` 和 XPI sidecar 资产检查；均通过，用户原有两处修改保持不变。
- [x] 3.4 核对 Content Package collector 并运行 `npm run check:content-package-release -- --current-branch`；dev 交付字节与已发布包一致，本次无内容包发布需求。
- [x] 3.5 补齐 proposal/design/spec delta/tasks，执行 `openspec validate fix-literature-managed-note-bundle-regressions --strict`，并检查 delta 与主规格完全匹配。

## Verification evidence

Node 主组命令：

```powershell
npm exec --no -- tsx node_modules/mocha/bin/mocha `
  tests/workflow-literature-workbench-package/45-workflow-note-import-export.test.ts `
  tests/workflow-literature-workbench-package/47-workflow-literature-bundle.test.ts `
  tests/workflow-literature-workbench-package/48-workflow-research-bundle.test.ts `
  tests/tooling/194-research-bundle-service.test.ts `
  tests/zotero-host/102-zotero-host-broker-capability-api.test.ts `
  tests/runtime/184-runtime-file-transfer-governance.test.ts `
  tests/synthesis/182-synthesis-host-export-delivery-port.test.ts `
  tests/host-bridge/182-host-bridge-socket.integration.test.ts `
  --require tests/setup/zotero-mock.ts --timeout 20000 --reporter dot --exit

npm exec --no -- tsx node_modules/mocha/bin/mocha `
  tests/workflows/91-workflow-host-api-archive.test.ts `
  --require tests/setup/zotero-mock.ts --timeout 20000 --reporter dot --exit
```

E2E 使用 `npm run test:zotero:e2e`，grep 为 `System E2E runner foundation|Note image atomic apply E2E`，内容频道为 `dev`、版本为 `0.8.10-dev.14`，宿主为外置的 Windows Zotero 10.0.2 安装树。通过记录见 [run-manifest.json](../../../artifacts/test-diagnostics/system-e2e/d4fb22b7-d906-46ed-a677-a87aee8735ac/run-manifest.json)；该本地诊断工件不随代码提交。

XPI 校验命令为 `npm run check:synthesis-sidecar-runtime-xpi -- --xpi=.scaffold/build/zotero-agents.xpi`，七平台资产均存在。未验证 Zotero 7/9 实机、用户原库或历史文件锁的占用进程。

## Workflow follow-up

- 本次 change 的实现与主规格已经同步；归档时保留完整 delta，核对无待同步差异。
- 本次没有 Content Package 交付变更，不执行 dev bump 或发布。后续确有内容包更新时，按归档、提交、dev patch bump、提交/推送版本变更、从 `dev` 发布并复验的顺序执行。
