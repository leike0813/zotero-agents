# Tasks

本清单补记本次已完成的实现；以下代码验证结果来自此前执行阶段，本次补文档不重复运行完整测试。

## 1. Digest 共享读取

- [x] 1.1 扩展既有 Host read port 测试，覆盖规范 digest 经扫描、定位读取后的正文和内容变化的 hash 保护；`178-synthesis-host-read-ports.test.ts` 与 `121-synthesis-reference-sidecar-index.test.ts` 合计 25 项通过。
- [x] 1.2 在 `libraryAdapter.ts` 投影规范 payload 的 `markdown` 字段，保留错误和身份语义；以以上测试及 TypeScript 检查验证，并同步 Summary 主规格场景。

## 2. Topic 与深读子图

- [x] 2.1 修正 topic 查询为 `paper_refs`，扩展既有 runtime 测试覆盖真实契约、有关联、无关联、多候选和空 timeline；相关用例通过，并同步 Skill 模板与主规格。
- [x] 2.2 深读显式请求 `allowStale: true`，只嵌入当前节点与有效坐标的交集及闭合边，空集省略；既有 tooling/runtime 用例与最终 HTML 浏览器验证覆盖此行为。
- [x] 2.3 同步内置 Skill 包；隔离源码快照双次生成的 23 个文件确定且与内置包逐字节一致，原地生成测试的 Windows 文件映射限制记录于下方。

## 3. Native layout read

- [x] 3.1 同步 TS 类型、JSON schema 和 Rust 请求解析的可选 `allowStale` 字段；跨语言验证通过（19 schemas、959 definitions、19 项 runtime parity、12 项 citation graph surface parity）。
- [x] 3.2 扩展 Rust application/repository 的有界读取以接受已有有效坐标，保留当前 basis 校验和默认严格行为；7 项 graph 测试及 bounded layout window、legacy stale metadata、read-view basis/cursor isolation 测试通过。
- [x] 3.3 扩展生产 RPC 回归验证完整、部分、stale、无坐标及无效坐标布局，并保留既有 Reference/Graph 流程；`229-synthesis-production-client-rust-route.test.ts` 中 2 项通过，同步 native surface 主规格与 `AGENTS.md`。

## 4. 集成与变更记录

- [x] 4.1 验证深读工作流及 HTML：workflow 158 的 13 项通过；tooling 157 的 27 项通过、1 项因 Windows 已映射生成文件无法覆盖而失败；已用隔离生成校验和已安装 Chrome 完成对应验证。
- [x] 4.2 验证本地 debug sidecar 构建、Rust fmt、相关 crates 的 clippy `--all-targets -- -D warnings`、`tsc --noEmit`、定向 ESLint/Prettier 与 `git diff --check`，均通过。
- [x] 4.3 补齐 proposal、design、两份完整 MODIFIED requirement delta 和本清单；`openspec validate fix-deep-reading-summary-and-subgraph-embedding --strict`、Markdown 格式检查通过，4 个修改后的 requirement 块与主规格一致。

## Validation boundaries

- 既有 tooling 全套未全绿：1 项原地覆盖测试受 Windows 已映射的 `citation-graph-synthesis-app.js` 阻塞；隔离生成验证通过不抹去这项失败。
- Playwright 所需 `chromium_headless_shell-1223` 未安装；最终 HTML 使用临时 preload 选择已安装 Chrome 验证，未修改仓库配置或安装依赖。
- 未执行插件/XPI 构建、Zotero 实机验收或发布。后续插件构建必须先完成项目 build preflight。
- 主规格已同步；已有损坏 HTML 需要重新生成。无存储迁移；未提交代码或归档 change。
