# 验证记录

日期：2026-10-16。当前分支：dev。未提交、推送或发布。

## 自动验证

```powershell
node --import tsx node_modules/mocha/bin/mocha tests/tooling/164-content-package-subscription.test.ts tests/tooling/165-content-package-release-scripts.test.ts tests/tooling/168-release-coordinator-gate.test.ts --require tests/setup/zotero-mock.ts --timeout 20000 --exit
```

结果：82 passing。新增场景先观察失败，再实施对应改动：dev bump 隔离、无效版本不落盘、真实 builder 三频道版本、分支范围、各频道独立发布身份、缺失资产 URL 失败，以及新增版本模块触发发布 gate。真实 builder fixture 也证明同版本内容改动会失败，无关 HEAD 不影响交付字节比较。

- `node node_modules/typescript/bin/tsc --noEmit --composite false --incremental false`：通过。
- 用 TypeScript API 载入仓库 tsconfig，在内存中增加本次 7 个工具脚本和 2 个 tooling 测试为 roots，并加入 Node/Mocha 类型；全 Program 诊断为 0。没有写入 tsconfig 或 buildinfo。
- 对本次所有 TS 脚本与测试运行 `node node_modules/eslint/bin/eslint.js <files>`：通过。
- 对本次代码、workflow、descriptor、技能、文档和 change 运行 `node node_modules/prettier/bin/prettier.cjs --check <files>`：通过。
- `openspec validate separate-content-package-dev-versioning --strict`：通过。
- `git diff --check`：通过。

已有 Git fixture 的精确换行比较在 Windows Git autocrlf 下失败，已改为只断言该用例关心的 feed/README 内容；不依赖平台换行。

## 真实远端 freshness

```powershell
npm run check:content-package-release -- --current-branch
```

检查正确选择 dev，退出 1：`dev remote feed version 0.8.9 does not match 0.8.10-dev.0`。
这证明新版本尚未发布，不能声明构建准备完成。stable/beta 线上读取为 0.7.4，本地正式 descriptor 保留 0.8.9，未擅自重置已有版本。

普通 build 不授权提交、推送或发布。需在明确授权下发布 dev 的独立版本后重新检查，再在实机测试 profile 安装/更新对应 dev 内容。此次未运行插件 build、实机测试或任何远端写操作；未运行全仓完整测试和全仓 lint。

## 文档审查

- build-preflight 的内容检查位于内置生成物同步后、插件 build 前，覆盖 stale、unknown、failed 及复验。
- main 检查 stable/beta，dev 前缀分支检查 dev；发布权限仍限 main/dev。
- 发布协调技能及 playbook 明确独立 dev bump、显式频道派发、选定范围校验和显式 dev 镜像版本。
- 镜像同步沿用单 release inventory 和显式 `--content-version`；其预发布版本解析及 dev 资产清单测试通过，无需修改镜像脚本。
