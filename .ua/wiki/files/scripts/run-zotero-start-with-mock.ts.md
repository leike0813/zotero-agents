
# scripts/run-zotero-start-with-mock.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/run-zotero-start-with-mock.ts -->

带 mock SkillRunner 的启动脚本：先拉起本地 mock 后端并等待就绪，再以受控环境启动 Zotero，退出时负责终止全部子进程。
源码：[scripts/run-zotero-start-with-mock.ts](../../../../scripts/run-zotero-start-with-mock.ts)

## 符号（8）
<!-- node: function:scripts/run-zotero-start-with-mock.ts:buildStartWithMockEnv -->
<!-- node: function:scripts/run-zotero-start-with-mock.ts:main -->
<!-- node: function:scripts/run-zotero-start-with-mock.ts:patchStartWithMockRuntimePrefs -->
<!-- node: function:scripts/run-zotero-start-with-mock.ts:resolveLocalTsxCli -->
<!-- node: function:scripts/run-zotero-start-with-mock.ts:runTargetStart -->
<!-- node: function:scripts/run-zotero-start-with-mock.ts:spawnMockSkillRunner -->
<!-- node: function:scripts/run-zotero-start-with-mock.ts:terminateChild -->
<!-- node: function:scripts/run-zotero-start-with-mock.ts:waitForMockReady -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildStartWithMockEnv | 函数 | 27–31 | 简单 | environment、testing、utility | 0 | 在启动环境中注入 mock 端点与 profile 相关变量。 |
| main | 函数 | 220–274 | 中等 | entry-point、orchestration、lifecycle | 0 | 主编排：以 mock 生命周期包裹目标启动流程。 |
| patchStartWithMockRuntimePrefs | 函数 | 39–48 | 简单 | configuration、preferences、testing | 0 | 把 mock 运行时根写入 Zotero 偏好设置。 |
| resolveLocalTsxCli | 函数 | 60–72 | 简单 | tooling、path、utility | 0 | 解析本地 tsx CLI 的可执行路径。 |
| runTargetStart | 函数 | 157–175 | 简单 | process、orchestration、tooling | 0 | 执行目标启动脚本并继承 mock 环境。 |
| spawnMockSkillRunner | 函数 | 74–92 | 简单 | process、testing、lifecycle | 0 | 启动 tests/mock-skillrunner 服务进程。 |
| terminateChild | 函数 | 177–218 | 简单 | process、lifecycle、cleanup | 0 | 分级终止子进程树，处理 detached 进程组。 |
| waitForMockReady | 函数 | 107–155 | 简单 | polling、testing、diagnostics | 0 | 轮询等待 mock SkillRunner 服务就绪并输出诊断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [run-zotero-direct.ts](run-zotero-direct.ts.md) | scripts/run-zotero-direct.ts | 本地直启 Zotero 的启动器：写入 dev prefs、经 RDP 安装临时插件（不需要 XPI），并可暂存 Synthesis sidecar 运行时资产与本地 runtime root 偏好。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildStartWithMockEnv | 函数 | 27–31 | 在启动环境中注入 mock 端点与 profile 相关变量。 |
| patchStartWithMockRuntimePrefs | 函数 | 39–48 | 把 mock 运行时根写入 Zotero 偏好设置。 |
