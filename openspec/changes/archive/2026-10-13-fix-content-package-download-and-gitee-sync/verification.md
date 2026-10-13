# 验收记录

日期：2026-10-12。本次修复下载器并同步已发布内容包，未提交代码、发布插件或重建内容包。

## 本地验证

```sh
node_modules/.bin/tsx node_modules/mocha/bin/mocha \
  tests/tooling/164-content-package-subscription.test.ts \
  tests/tooling/165-content-package-release-scripts.test.ts \
  tests/ui/40-gui-preferences-menu-scan.test.ts \
  --require tests/setup/zotero-mock.ts --timeout 10000 --exit
node_modules/.bin/tsc --noEmit
openspec validate fix-content-package-download-and-gitee-sync --strict
```

相关测试 109 通过，2 项原有 pending。TypeScript、改动文件 ESLint / Prettier 检查及 strict OpenSpec 校验通过。覆盖主源立即选择、feed 正文超时、ZIP 响应头/正文/总预算、镜像回退、流式字节进度节流、完整性失败与旧安装保留，以及进度投影、异步刷新、失败重试和启动/菜单异常反馈。

## Gitee 同步

执行 `npm run sync:gitee-release -- --content-only --content-version 0.8.8`，退出码 0。

- 发布标签：`official-workflows-v0.8.8`，GitHub/Gitee 均为 `b41e2dede4484eff443dcfb95d50db431e932733`。
- `content-feed`：Gitee 从 `b41e2dede4484eff443dcfb95d50db431e932733` 普通快进到 GitHub 的 `72b637629e880162e7f5ede5c5e1a526c2fe909d`。
- 本次发布只有 dev：`zotero-agents-official-workflows-0.8.8-dev.zip` 和 `.zip.sha256`，均复制原始 GitHub 字节。
- ZIP 大小：4,959,209 字节；SHA-256：`37da63e4bc9b2046020d02d2bd15b2059d200fb088d0a85e250b78c7fda8ee8d`。
- 上传后资产读回、匿名 ZIP/校验文件下载通过；随后推进 feed，并确认公开 dev feed 与固定 GitHub 源提交一致。
- 公开地址：https://gitee.com/leike0813/zotero-agents-workflows/releases/download/official-workflows-v0.8.8/zotero-agents-official-workflows-0.8.8-dev.zip

## 验证范围与限制

下载器修复需要安装包含此次源码的 XPI；只更新内容包不会更新插件下载器。未执行 Windows/Zotero 实机验收或全仓测试，也未发布 stable/beta 的 v0.8.8。

辅助代理额外扫描 UI/Tooling 域时报告 tests50、tests157 失败：tests50 在旧 UI 实现下也失败，tests157 的复查未完成。这些扫描不属于上述 109 项通过证据，未据此宣称全仓通过。

辅助代理曾临时 stash 四个 UI 文件以验证旧代码，违反编辑约束并干扰并行验收。改动已恢复，stash 为空；代理已停止，最后验收在恢复及收尾后由主代理执行。工作区中其他任务的文献工作台模板改动未被覆盖。
