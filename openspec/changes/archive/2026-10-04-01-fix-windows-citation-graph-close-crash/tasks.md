# Tasks

本清单补记已经执行的修复；证据与验收边界见 [verification.md](verification.md)。

## 1. 确认故障与方案

- [x] 1.1 确认已归档页面重构的 browser/Graph 所有权边界，并固定源码基线；完成依据为 proposal 和 design 中的前置依赖及文件清单。
- [x] 1.2 用真实图谱、鼠标关闭、full dump 与原生卸载跟踪确认执行访问异常，比较跳过 context loss 和额外模块引用的对照；完成依据为 verification 的 A/B/C 结果。

## 2. 实现原生生命周期保护

- [x] 2.1 先建立 ctypes 引用模型回归测试，再实现 Windows D3D11 OS PIN 与当次资源清理；空实现产生 3 项失败，实现后 `windows-graphics-runtime.test.ts` 的 4 项测试通过。
- [x] 2.2 接入统一 Synthesis browser 创建入口，并在破坏旧内容或添加 Tab 前完成保护；完成依据为 `125-synthesis-tab-ui.test.ts` 中已有内容保留与无空 Tab 的行为测试通过。
- [x] 2.3 保留正常 Sigma/WebGL 清理，记录宿主与平台 owner 约束；完成依据为 Graph 卸载测试通过、生产包保留 loseContext，以及 `docs/dev/zotero-e2e.md` 和 `AGENTS.md` 的约束更新。

## 3. 构建与真实宿主验收

- [x] 3.1 运行完整插件构建、相关测试、格式和 lint 检查；完成依据为 `npm run build`、103 项相关测试、四份 TypeScript 配置、Prettier 和 ESLint 的通过记录。
- [x] 3.2 从当前源码构建并验证本地 sidecar，打包生产 XPI；完成依据为 bundle 文件校验、修复包身份和安装包一致性核验。
- [x] 3.3 在金例副本中干净替换插件，用无外部保活探针和无调试器的新进程完成三轮完整图谱的真实鼠标关闭；完成依据为用户三轮正常报告、loader PIN、驱动卸载、延迟宿主响应检查与无新增 WER dump。

## 4. 补齐变更记录

- [x] 4.1 交付 proposal、design、完整 spec delta、tasks 与脱敏 verification，记录已通过组合和未验证范围；完成依据为产物齐备并可对应到源码及实机证据。
- [x] 4.2 对本 change 运行 `openspec validate --strict`、Prettier 和 diff 检查；全部通过，记录完成。
