
# zotero-plugin.config.ts
所属分层：[构建、发布与工程配置](../layers/build-tooling.md)  
所属目录：[.](../modules/index.md)
<!-- node: file:zotero-plugin.config.ts -->

zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。
源码：[zotero-plugin.config.ts](../../../zotero-plugin.config.ts)

## 符号（7）
<!-- node: function:zotero-plugin.config.ts:applyZoteroTestHeadlessEnvironment -->
<!-- node: function:zotero-plugin.config.ts:resolveGitBranch -->
<!-- node: function:zotero-plugin.config.ts:resolveSystemE2ETestPrefs -->
<!-- node: function:zotero-plugin.config.ts:resolveTestEntries -->
<!-- node: function:zotero-plugin.config.ts:resolveZoteroTestDisplayMode -->
<!-- node: function:zotero-plugin.config.ts:shouldStageDirectSynthesisBundle -->
<!-- node: function:zotero-plugin.config.ts:stageZoteroE2EFixture -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyZoteroTestHeadlessEnvironment | 函数 | 106–118 | 中等 | headless、环境变量、测试 | 1 | 把 headless 所需的窗口尺寸与 MOZ_HEADLESS 等环境写入子进程环境。 |
| resolveGitBranch | 函数 | 200–214 | 简单 | git、工具函数、构建 | 0 | 解析当前 git 分支名，供构建元信息与 fixture 分支判定使用。 |
| resolveSystemE2ETestPrefs | 函数 | 54–59 | 简单 | 首选项、e2e、环境 | 0 | 解析系统 E2E 首次运行注入的插件首选项集合。 |
| resolveTestEntries | 函数 | 157–179 | 中等 | 测试、入口解析、编排 | 0 | 按测试模式与域解析出本次构建应包含的测试入口集合。 |
| resolveZoteroTestDisplayMode | 函数 | 83–99 | 中等 | headless、环境、测试 | 0 | 按环境变量解析 Zotero 测试运行是 headless 还是带界面模式。 |
| shouldStageDirectSynthesisBundle | 函数 | 181–188 | 简单 | sidecar、构建、条件判定 | 0 | 判断当前直跑场景是否需要把 sidecar bundle 暂存进 runtime root。 |
| stageZoteroE2EFixture | 函数 | 219–295 | 复杂 | fixture、e2e、构建、暂存 | 0 | 按分支与运行模式暂存 E2E 所需 fixture 与 sidecar 产物到 runtime root。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-plugin-host-bridge-assets.ts](scripts/host-bridge/check-plugin-host-bridge-assets.ts.md) | scripts/host-bridge/check-plugin-host-bridge-assets.ts | 插件 Host Bridge 资产校验：核对 zotero-bridge-release.json、七平台原生二进制、skill bundle zip 的 manifest、路径安全与 digest 是否一致。 |
| [debugMode.ts](src/modules/debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [fixture.ts](scripts/system-e2e/fixture.ts.md) | scripts/system-e2e/fixture.ts | E2E fixture 注册表与已提交 seed 的治理模块：校验结构事实、可移植性与隐私约束，并把 seed 物化到只读测试工作区。 |
| [package.json](package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [patch-zotero-test-runner.ts](scripts/patch-zotero-test-runner.ts.md) | scripts/patch-zotero-test-runner.ts | Zotero 测试 runner 页面补丁：向生成的 test_runner.html 注入事件回传、诊断桥与失败时自动 dump，使 mocha 结果可被外部进程采集。 |
| [run-zotero-direct.ts](scripts/run-zotero-direct.ts.md) | scripts/run-zotero-direct.ts | 本地直启 Zotero 的启动器：写入 dev prefs、经 RDP 安装临时插件（不需要 XPI），并可暂存 Synthesis sidecar 运行时资产与本地 runtime root 偏好。 |
| [runtime-diagnostics-esbuild.ts](scripts/runtime-diagnostics-esbuild.ts.md) | scripts/runtime-diagnostics-esbuild.ts | runtime diagnostics 的 esbuild 插件：按开关把诊断独占模块标记为副作用并在正式构建中消除，同时对部分模块执行区域级 elision。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [run-zotero-test-with-mock.ts](scripts/run-zotero-test-with-mock.ts.md) | scripts/run-zotero-test-with-mock.ts | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyZoteroTestHeadlessEnvironment | 函数 | 106–118 | 把 headless 所需的窗口尺寸与 MOZ_HEADLESS 等环境写入子进程环境。 |
| resolveSystemE2ETestPrefs | 函数 | 54–59 | 解析系统 E2E 首次运行注入的插件首选项集合。 |
| resolveTestEntries | 函数 | 157–179 | 按测试模式与域解析出本次构建应包含的测试入口集合。 |
| resolveZoteroTestDisplayMode | 函数 | 83–99 | 按环境变量解析 Zotero 测试运行是 headless 还是带界面模式。 |
| shouldStageDirectSynthesisBundle | 函数 | 181–188 | 判断当前直跑场景是否需要把 sidecar bundle 暂存进 runtime root。 |
| stageZoteroE2EFixture | 函数 | 219–295 | 按分支与运行模式暂存 E2E 所需 fixture 与 sidecar 产物到 runtime root。 |
