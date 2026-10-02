
# scripts/run-zotero-compatibility-worker.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/run-zotero-compatibility-worker.ts -->

兼容性矩阵 worker 入口：在隔离的 run 目录中物化测试工作区与宿主链接，按 mode/domain/lane 解析测试条目并执行，同时回传宿主事实事件。
源码：[scripts/run-zotero-compatibility-worker.ts](../../../../scripts/run-zotero-compatibility-worker.ts)

## 符号（4）
<!-- node: function:scripts/run-zotero-compatibility-worker.ts:createDirectoryLink -->
<!-- node: function:scripts/run-zotero-compatibility-worker.ts:main -->
<!-- node: function:scripts/run-zotero-compatibility-worker.ts:materializeCompatibilityTestWorkspace -->
<!-- node: function:scripts/run-zotero-compatibility-worker.ts:resolveCompatibilityWorkerEntries -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createDirectoryLink | 函数 | 13–24 | 简单 | filesystem、symlink、utility | 0 | 创建目录符号链接，Windows 下使用 junction。 |
| main | 函数 | 97–172 | 中等 | entry-point、cli、e2e | 0 | worker 主流程：准备环境、物化工作区、执行测试并回传事件。 |
| materializeCompatibilityTestWorkspace | 函数 | 47–95 | 简单 | filesystem、compatibility、e2e | 0 | 在 run 目录中建立符号链接并物化出测试工作区。 |
| resolveCompatibilityWorkerEntries | 函数 | 26–45 | 简单 | parsing、compatibility、testing | 0 | 按模式、domain、lane 与是否安装候选 XPI 解析实际执行的测试条目。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [zotero-compatibility-fixture.ts](zotero-compatibility-fixture.ts.md) | scripts/zotero-compatibility-fixture.ts | Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| materializeCompatibilityTestWorkspace | 函数 | 47–95 | 在 run 目录中建立符号链接并物化出测试工作区。 |
| resolveCompatibilityWorkerEntries | 函数 | 26–45 | 按模式、domain、lane 与是否安装候选 XPI 解析实际执行的测试条目。 |
