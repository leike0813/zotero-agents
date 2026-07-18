# 2026-07-18 发布复盘：将 Gitee 从正式发布主线剥离

## 结论

本次发布的耗时由两部分叠加：Host Bridge 工作流在进入正式发布前连续暴露编排缺陷，随后 Gitee 上传、超时状态确认和两套镜像路径又延长了收尾时间。正式发布完成条件既不应受非主托管平台可用性影响，也不应因为修复发布脚本而反复改变 CLI 身份并重建七个平台。

发布流程现以 GitHub 为唯一事实源：插件、content package 和 Host Bridge 都先在 GitHub 完成发布与验证。Gitee 仅保留为事后、可恢复、可重复执行的同步目标，通过一个本地阻塞命令单独完成。

## 本次发布暴露的问题

1. Gitee 工作混入正式发布工作流。慢上传或 API 不稳定会延长工作流，并让 Agent 持续轮询，即使 GitHub 产物已经可用。
2. Gitee 步骤使用容错执行时，工作流可能整体成功，但镜像并不完整；结果需要额外人工审计才能解释。
3. 插件镜像与 content package 镜像由不同入口处理，恢复时需要记忆多条命令和不同的状态模型。
4. content package ZIP 包含生成时间。若时间取执行时钟，同一提交的再次构建也会产生不同字节，使同版本恢复变成覆盖远端资产，而不是复用已发布产物。
5. 失败后的修复容易误入“改版本、补提交、重跑主线”的路径。这会扩大变更面，并不能解决镜像端本身的延迟或超时。
6. release plan 的 JSON 通过 npm stdout 重定向，npm banner 使第一次工作流无法解析 JSON。
7. workflow、校验器和治理脚本被算入 CLI build fingerprint；每次修复流程本身都会产生新的 fingerprint、release set 刷新和七平台重建。
8. 构建矩阵同时描述宿主与目标，却没有统一校验模式，Linux ARM 交叉产物被直接执行，随后原始字节校验又被错误用于可原生执行的 macOS 产物。
9. Actions 工件使用隐藏目录但未一开始声明包含隐藏文件；七平台构建和物化成功后仍在上传阶段失败。
10. `publish` 间接依赖被跳过的 build job；无 CLI 变化的 surface-only 发布会在 materialize 成功后静默跳过正式发布。
11. Host workflow 由 `main` push 隐式触发，Agent 需要猜测和轮询 run；receipt 与七平台文件又需手工同步回 `main`。
12. Host CLI 预构建被创建为 GitHub Release，既污染用户可见 Releases，又把构建缓存、恢复源和正式发布面混为一体。
13. Content package 在 Host receipt 完成前发布，且目标从 `0.4.x` 改为 `0.5.0`，导致额外 bump、提交和 dispatch。

## 根因

- 正式发布与镜像同步没有清晰的完成边界。
- GitHub 虽然实际上承担源站角色，但脚本没有把“从 GitHub 复制不可变字节”固化为协议。
- 上传脚本只关注请求结果，对超时后服务端是否已接收、同名附件是否同字节缺少可靠校验。
- 发布门禁同时检查 GitHub 和 Gitee，导致次要平台成为主线阻塞项。
- 发布身份、构建配方、校验实现和发布编排没有分层，任何热修复都被误判为 CLI 字节变化。
- 复杂 workflow 依赖隐含的 Actions skip 传播语义，缺少针对 build-skipped 路径的契约测试。
- 发布脚本缺少精确 target、correlation ID、complete receipt 基线和自动 source finalization。
- 预构建没有独立的内容寻址存储协议。

## Host Bridge 重试时间线

1. plan 输出混入 npm banner，JSON 解析失败。
2. ambient `GITHUB_RUN_ID` 进入 release identity，四份 release-set 副本漂移。
3. Linux ARM/ARM64 交叉产物在 x64 runner 上执行并报 `Exec format error`。
4. 结构校验错误覆盖可原生执行的 Darwin 目标，产生 fingerprint 缺失误报。
5. 七平台构建和预构建创建成功后，隐藏 materialization 目录没有上传。
6. 修复上传后正式三表面发布成功，但预构建和 receipt 仍需手工同步。
7. 同一 aggregate 的恢复 run 中 build 被跳过，publish 又因依赖传播一并跳过。

其中第 2 至第 5 次修复都会改变 build fingerprint，因此一次编排缺陷被放大为新的 release set 刷新和完整七平台重建。

## Host Bridge 流程改进

- 用 `host-bridge/cli-build-recipe.json` 统一工具链、七目标矩阵和运行校验模式。
- build fingerprint 只覆盖 CLI 源码、Cargo、build recipe 和实际构建/打包逻辑；流程实现使用独立 pipeline revision。
- workflow 仅允许带 `releaseSetId`、source SHA 和 request ID 的手动 dispatch。
- 预构建以 `sets/<binaryAggregateSha256>` 只追加到 `host-bridge-cli-prebuilds` 分支，不再创建 Host CLI GitHub Release。
- build-skipped 是被测试的一等路径，materialize 和 publish 都使用显式 `always()` 结果门禁。
- 三表面验证后自动生成 receipt，并将完整预构建状态和 receipt 原子提交回最新 `main`。
- Content package dispatch 要求当前 Host release set 已有匹配 complete receipt，并精确跟踪本次 request ID 的 Actions run。

## 已落实的流程设计

### 正式发布主线

- release gate 只检查本地状态、GitHub `main`、GitHub tag/release、必要的本地验证、content package GitHub 发布，以及 Host Bridge GitHub receipt。
- content package workflow 只发布 GitHub release 和 GitHub `content-feed`。
- GitHub 同版本同名 content asset 视为不可变：哈希一致则复用，不一致则失败并要求提升 content package 版本。
- content package 的生成时间来自提交时间或显式环境变量，使相同 revision 的构建输入稳定。
- Host Bridge 仍是纯 GitHub 三表面发布，不增加 Gitee 目标。

### 独立 Gitee 同步

默认同步当前版本：

```sh
npm run sync:gitee-release
```

显式同步指定版本：

```sh
npm run sync:gitee-release -- --plugin-version vX.Y.Z --content-version X.Y.Z
```

该命令以 GitHub 为源：

- 同步插件 `main` 与版本 tag；
- 下载 GitHub 插件 XPI 和 `release` update metadata 后上传 Gitee；
- 下载 GitHub content package 的 stable、beta、dev ZIP 与 SHA-256 文件后上传 Gitee；
- 将 GitHub `content-feed` 分支同步到 Gitee；
- 对已有同名附件先比对 SHA-256，一致则跳过，不一致才替换；
- 对上传超时进行有限重试，并在结束前校验附件哈希与远端 ref；
- 任一部分失败即以非零状态退出，重复执行可从已有正确状态继续。

## 后续发布操作准则

1. 先完成并验证 GitHub 正式发布，不等待 Gitee。
2. 正式发布汇报中将 Gitee 标为“未请求”或“待用户手动同步”，不得标为主线失败。
3. 只有用户单独要求时，Agent 才运行或观察 Gitee 同步命令。
4. Gitee 失败时只重跑独立同步命令；不得为镜像恢复重新构建、修改版本、创建修复提交或重跑正式发布。
5. 同版本资产产生不同哈希时停止处理并查明输入漂移；正式产物需要新字节时必须发布新版本。

## 预期收益

- GitHub 正式发布耗时与 Gitee 网络质量解耦。
- Agent 不再为镜像上传长时间占用会话。
- 镜像恢复入口从多条发布命令收敛为一个可重复执行的命令。
- GitHub 与 Gitee 产物具备明确的源与副本关系，减少同版本字节漂移和恢复性提交。
