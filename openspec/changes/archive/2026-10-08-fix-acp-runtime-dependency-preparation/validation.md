# 验收记录

验收日期：2026-10-08。对象为当前未提交源码；未安装到生产 profile。

## 诊断与行为验证

原始任务在 120000 ms 处超时，stderr 留下 PyMuPDF/Layout、NumPy、ONNX Runtime 下载进度。新增 fake Mozilla pipe 用例先复现取消结果错误及部分输出丢失，再验证实际 adapter 保留输出。调度测试验证串行、相同上下文在途共享、前台优先、独立取消、排队过期和关闭后的迟到结果；probe 用例验证十五分钟默认预算、重试剩余预算和后台 `--no-project`。

定向 Node 命令：

```powershell
node_modules/.bin/tsx.cmd node_modules/mocha/bin/mocha tests/acp/194-acp-runtime-dependency-*.test.ts tests/runtime/164-runtime-platform-services.test.ts tests/workflows/41-workflow-scan-registration.test.ts --require tests/setup/zotero-mock.ts --timeout 15000 --exit
node_modules/.bin/tsx.cmd node_modules/mocha/bin/mocha tests/skillrunner/107-acp-skillrunner-compatible-runner.test.ts --require tests/setup/zotero-mock.ts --timeout 15000 --exit
```

第一组初次为 80 passing、3 pending（平台分支），随后新增的 retry-budget 用例通过，scheduler/probe 合计 11 passing。完整 runner 最终为 189 passing。正常执行与恢复执行均验证依赖准备取消后不能创建 adapter，失败诊断等级与依赖状态一致。上下文和环境对象的字段插入顺序不影响在途共享；该边界用例先失败，再修正为按显式上下文字段建立 identity 后通过。

主 TypeScript、sidebar/dashboard/synthesis 三份 TypeScript 配置、所有修改 TS 文件的 ESLint/Prettier、`git diff --check` 与 `openspec validate fix-acp-runtime-dependency-preparation --strict` 通过。

## 隔离 Zotero

使用 Windows x64 Zotero 10.0.2 和现有 `npm run test:zotero:core`，设置 `ZOTERO_TEST_GREP='runtime platform services in Zotero'`。插件由本次源码构建；测试 profile 位于 `.scaffold/test`，data 由标准 runner 创建于临时目录。清理命令只匹配测试 profile，未使用按进程名终止所有 Zotero 的默认命令。

最新源码结果为 5 passed，另有一个非 Windows 路径用例按平台跳过：原生文件写入、command registry、真实 Mozilla one-shot 的退出输出、超时/取消部分 stdout/stderr、实时依赖策略探测均通过。超时/取消用例启动 shell 写入两个输出流后休眠，分别验证 `timed_out` 和 `canceled`。

## 冷缓存

调用生产 `defaultAcpRuntimeDependencyProbe` 和 Node adapter，在仓库外新建临时 cwd 与全新的 `UV_CACHE_DIR`，使用 `--isolated --no-project` 和 900000 ms 预算。依赖为原始失败中的三个声明，未固定版本、未更改解释器选择或项目依赖。2026-10-08T14:21:03.716Z 的 receipt 摘要：

| 阶段 | 耗时 | 策略 / 结果 |
| --- | ---: | --- |
| 全新缓存 | 384802 ms | uv，首个 attempt exit 0，ready |
| 相同缓存再次准备 | 411 ms | uv，首个 attempt exit 0，ready |

冷准备输出包含 pymupdf (18.9 MiB)、pymupdf-layout (40.9 MiB)、numpy (12.0 MiB)、onnxruntime (13.6 MiB)，共安装 20 个包；解释器报告 Python 3.12.12。冷准备超过旧的两分钟上限，低于新预算。原始去敏 receipt 位于 `artifacts/acp-dependency-preparation-acceptance.json`，摘要保留在本文件。

这次实测分别验证了 Node adapter 的真实冷缓存准备和 Zotero Mozilla adapter 的输出/取消行为。它没有回放用户的完整 `literature-analysis` 工作流，也没有逐一执行 Zotero 7/9。
