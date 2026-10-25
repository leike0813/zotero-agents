# 实施与验证记录

日期：2026-10-25。分支：`dev`。固定起点：`0948c967e5ee49c54155e134bb6ca4f5fe5e36dd`。实施前工作区干净；本次没有提交、切分支、发布或访问真实 profile。

## 已实现

| 范围 | 文件与行为 |
| --- | --- |
| 私有读取 | `zoteroManagedNotes.ts`、`zoteroNotePayloadResolver.ts`、`zoteroHostCapabilityBroker.ts`：独立于公开 detail 投影；逐附件、逐笔记身份捕获；恢复唯一有效主/辅助 payload 的锚点；无效主数据仅进入恢复材料；源笔记不变 |
| 物化与资源 | `types.ts`、`workflowHostErrorContract.ts`、`workflowHostOwners.ts`、`researchBundleService.ts`、`hostBridgeWorkflowResources.ts`：严格默认、显式局部继续、sourceOnly 排除笔记、按已处理数推进进度、保留成功资源并清理失败副本 |
| 工作流打包 | `literatureBundle.mjs`、`researchBundle.mjs`、研究包 apply hook：按身份关联元数据，报告与恢复材料纳入完整性清单，全无基本数据时拒绝空包；跳过内容返回 partial，仅恢复锚点仍 completed |
| 完成反馈 | `applyDiagnostics.ts`、`applySeam.ts`、`feedbackSeam.ts`、`messageFormatter.ts`、`workflowExecuteMessage.ts`、11 种语言 FTL：显示部分完成数量和包内报告位置，反馈异常不改变执行结算 |
| 文档与规格 | managed-literature-artifacts 主规格及本变更 delta、note-payload-codec、Broker SSOT、英文/中文两类导出帮助、AGENTS 导出约束 |

损坏辅助 payload 的锚点从导出副本移除，原始附件保存在 recovery；损坏主 payload 的 recovery HTML 保持原始字节对应的正文，不冒充普通或有效受管导入内容。

## 定向测试

```powershell
node node_modules/tsx/dist/cli.mjs node_modules/mocha/bin/mocha tests/workflow-literature-workbench-package/47-workflow-literature-bundle.test.ts tests/workflow-literature-workbench-package/48-workflow-research-bundle.test.ts tests/workflow-literature-workbench-package/50-workflow-literature-export-partial-recovery.test.ts tests/tooling/194-research-bundle-service.test.ts tests/tooling/102-note-payload-codec.test.ts tests/workflows/24-workflow-execute-message.test.ts tests/workflows/91-workflow-host-api-archive.test.ts tests/host-bridge/138-host-bridge-file-downloads.test.ts --require tests/setup/zotero-mock.ts --timeout 20000 --reporter dot --exit
```

结果：**152 passing**。覆盖好—坏—好文献、元数据身份、缺失/失效/无 marker 主 payload、辅助 payload 冲突及损坏、主 payload 损坏后健康笔记保留、坏图片后继续、源文件专用读取、笔记正文读取失败隔离、恢复报告与文件清单、完整恢复的 completed、部分完成反馈、取消及全局错误、旧 ZIP 保留、复制中断的临时文件清理。

已先复现再修复的父级回归包括：中间文献异常中止批次、复制失败遗留未登记文件、缺失 Markdown 图片却返回 completed。原有严格调用及归档原子写入测试继续通过。

## 类型、样式与治理

| 检查 | 结果 |
| --- | --- |
| `tsc -p tsconfig.json --noEmit` | 通过 |
| `tsc -p tsconfig.sidebar.json --noEmit` | 通过 |
| `tsc -p tsconfig.dashboard.json --noEmit` | 通过 |
| `tsc -p tsconfig.synthesis.json --noEmit` | 通过 |
| 改动的 18 个 TypeScript 文件 ESLint / Prettier | 通过；经 apply_patch 应用格式调整 |
| `git diff --check` | 通过 |
| `openspec validate literature-export-partial-recovery --strict` | 通过 |
| `npm run check:builtin-workflow-manifest` | 通过，165 个文件 |
| `npm run test:node:shards:list` | 通过，新 50 测试由既有 workbench 分片 glob 收录 |

未通过的额外检查保留如下，不作为本次验证通过的证据：

- `npm run check:localization-governance`：本次 partial 提示键已覆盖全部 11 个 locale；旧 `synthesis-action-audit-concept-aliases` 和 `synthesis-operation-auditConceptAliases` 在其余九种语言缺失。固定起点已有该差异。
- `187-workflow-host-contract-governance.test.ts`：16 个治理用例通过，1 个失败；失败指向未修改的 `lib/translatorArtifacts.mjs` 和 `mineru/hooks/applyResult.mjs`。与 archive 组合运行共 35 passing、1 failing；未扩大范围修改这两个文件。
- 未运行全仓 suite。

## 构建输入身份与阻塞

插件源码版本 `0.9.0`；Content Package stable `0.8.9`，dev `0.8.10-dev.15`，content API `3.0.0`。

| 预检 | 结果 |
| --- | --- |
| Synthesis sidecar freshness | fresh；七平台，fingerprint `91770200720072c85aca5ba0daf754e3ebe0beb1ed9747e671c9f32f4847eba4` |
| Host Bridge CLI freshness | fresh；`0.5.8`，七平台，fingerprint `005fa80b5707779a5dd845cb189b320b682e7ee188026a3f41693284c3d13406` |
| ACP Windows bridge freshness | fresh；fingerprint `9650b9ecc7dded2b283c1f5a8a8154769e046d6829187a461db786591eaca059` |
| Host Bridge content/doc-sync | 通过；既有深度 advisory 保留，无本次 surface 语义修改 |
| builtin skills | 通过；五包字节一致，外部三个 gitlink 均在 index 固定版本 |
| canonical validators / workflow manifest | 通过 |
| `npm run check:content-package-release -- --current-branch` | **stale**：dev GitHub feed 与本地生成包语义不一致 |

最后一次内容检查在仓库外临时目录构包：426 文件、5,045,373 字节，ZIP SHA-256 `3ceb816db4783ead5b7e492e8ad6cccfede443532cf10cf2c2edfafb3a1792ed`。该检查不是发布或候选插件构建。

依据 `.agents/skills/zotero-agents-build-preflight/SKILL.md` 第 7 节：仍有 stale 输入时“报告阻塞并停止插件 build”。本次未运行插件 build，未产生当前代码的 XPI。

## 实机验收状态与恢复前提

`306-note-image-apply.zotero.test.ts` 已扩展：缺失主锚点且无 marker、损坏 Score、恢复 HTML、完整性验证、源 HTML 不变，以及健康内容重新导入。未运行 `npm run test:zotero:e2e`，不能把 Node mock 结果称为真实 Zotero 验收。

继续条件：按单独授权的内容发布流程对齐 dev 插件与 Content Package 身份，然后重新执行 preflight；全部 fresh 后构建候选，并在隔离 profile 安装准确版本内容包，使用现有 E2E runner 运行 note-image-apply 场景。不得通过手工改 fingerprint、覆盖同名资产或安装旧包绕过检查。

恢复材料只保证保留仍可读取的内容，不保证自动重建损坏数据的结构化语义。此变更保留为活动 OpenSpec，构建与实机任务未勾选，未归档。
