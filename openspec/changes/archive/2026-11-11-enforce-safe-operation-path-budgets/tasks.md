# Tasks

本清单补记已经实施的工作；`[x]` 仅表示有对应实现或执行证据。验证详情与失败记录见 [design.md](design.md#verification-evidence)。未通过和未运行项目不计为完成。

## 1. 共享路径边界

- [x] 1.1 在 runtime persistence 统一完整绝对路径、目录和分量预算；用 Windows 形状路径拒绝、CJK UTF-16 边界及 POSIX 实际文件验证，并更新 `runtime-persistence-governance-ssot.md`。
- [x] 1.2 使用短 sibling 目录和独占创建持有内部文件；用长 basename 原子替换、占用冲突不清理、悬空链接目录移动回归验证，并记录项目路径约束。
- [x] 1.3 删除覆盖失败后的 unlink/retry，预检树移动后代并保护不确定备份；用原生写入失败和 promotion 完成后检查失败回归验证旧数据仍在。

## 2. Workflow 文件与归档

- [x] 2.1 在既有 file API 投影预算错误及可选 exclusive 目录请求，overwrite copy 先暂存；通过 `90-workflow-input-materialization.test.ts` 并更新 `workflow-hook-helpers.md`。
- [x] 2.2 迁移 ZIP 写入/提取暂存并对全部成员目标先预检；通过 `91-workflow-host-api-archive.test.ts` 和真实 store/deflate 提取 smoke，文档记录先校验后提取的边界。

## 3. 附件准备与原生导入

- [x] 3.1 上传、下载及 stored-file preparation 独占暂存，主文件名适配剩余预算且不改显示标题或 companion；通过 prepared-file 和 upload reservation 回归，并更新 `attachment-file-lifecycle.md`。
- [x] 3.2 在原生创建/替换前预测 storage、companion、辅助缓存和备份路径；以 handlers 中预算不足时无创建/移动副作用的用例验证，并记录原生所有权边界。

## 4. 工作流相邻输出

- [x] 4.1 MinerU 使用短独占目录，旧 Markdown 首次移动前检查图片目录及旧图片备份后代，按已确认 effect 回滚；早期失败、碰撞、备份目录/后代超限用例通过，并更新 MinerU README 与生命周期文档。
- [x] 4.2 翻译/深读共用 adjacent-text 事务，独占失败不清理、不确定移动保留恢复材料；共享事务九类 outcome 与完整 literature 分片通过，生命周期文档同步。

## 5. 集成与验收

- [x] 5.1 执行相关五文件 Node 专项（107 passing）、最终 literature 分片（116 passing、18 pending）及 Linux 真实文件系统生产路径 smoke；确认源 PDF 不变、失败回滚正确且无工作流暂存残留。
- [x] 5.2 通过受影响代码 TypeScript、ESLint、Prettier 和两份主规格 strict 校验；命令与结果记录于 design。
- [x] 5.3 补齐本 change 的 proposal/design/delta/tasks，通过 change strict 校验并逐条核对 delta 与已同步主规格一致。
- [x] 5.4 闭合 ACP copy-failure 集成验证：当前技能物化被 surface identity mismatch 阻断；在包身份一致的环境中证明注入失败仍报告 unavailable，不能放宽身份校验代替验证。
- [x] 5.5 闭合 runtime 域验证：调查 `172-export-research-bundle-skill-runtime.test.ts` 的 30 秒超时，取得既有 discovery/CLI 场景完整结果或明确的基线隔离证据，不以增加超时或缩小断言冒充通过。
- [x] 5.6 在可用 Windows Zotero 隔离 profile 中，经既有 E2E/实机入口验证近限路径成功、预算不足前置拒绝、MinerU 旧输出保护及附件原生落盘；记录 OS、Zotero 版本和实际结果。需要构建时先走 build-preflight，不操作用户原库。

## Workflow follow-up

- 主规格已包含本 change 的 delta；归档前复核已同步状态，避免重复追加 ADDED requirements。
- dev 内容包已按用户授权发布为 `0.8.10-dev.23`，构建与 Windows 隔离验收通过；不自动归档或发布插件。
