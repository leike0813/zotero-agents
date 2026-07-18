# 2026-07-18 发布复盘：将 Gitee 从正式发布主线剥离

## 结论

本次发布的主要耗时不在版本判断或正式 GitHub 发布，而在 Gitee 上传速度、超时后的状态确认，以及插件与 content package 两套镜像路径交织造成的反复等待。正式发布完成条件不应受非主托管平台的可用性影响。

发布流程现以 GitHub 为唯一事实源：插件、content package 和 Host Bridge 都先在 GitHub 完成发布与验证。Gitee 仅保留为事后、可恢复、可重复执行的同步目标，通过一个本地阻塞命令单独完成。

## 本次发布暴露的问题

1. Gitee 工作混入正式发布工作流。慢上传或 API 不稳定会延长工作流，并让 Agent 持续轮询，即使 GitHub 产物已经可用。
2. Gitee 步骤使用容错执行时，工作流可能整体成功，但镜像并不完整；结果需要额外人工审计才能解释。
3. 插件镜像与 content package 镜像由不同入口处理，恢复时需要记忆多条命令和不同的状态模型。
4. content package ZIP 包含生成时间。若时间取执行时钟，同一提交的再次构建也会产生不同字节，使同版本恢复变成覆盖远端资产，而不是复用已发布产物。
5. 失败后的修复容易误入“改版本、补提交、重跑主线”的路径。这会扩大变更面，并不能解决镜像端本身的延迟或超时。

## 根因

- 正式发布与镜像同步没有清晰的完成边界。
- GitHub 虽然实际上承担源站角色，但脚本没有把“从 GitHub 复制不可变字节”固化为协议。
- 上传脚本只关注请求结果，对超时后服务端是否已接收、同名附件是否同字节缺少可靠校验。
- 发布门禁同时检查 GitHub 和 Gitee，导致次要平台成为主线阻塞项。

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
