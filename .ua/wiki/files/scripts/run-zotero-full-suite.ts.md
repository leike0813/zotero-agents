
# scripts/run-zotero-full-suite.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/run-zotero-full-suite.ts -->

Zotero E2E 全量套件的启动脚本，按顺序 spawn 各阶段 npm 步骤并把失败输出直接转发到控制台。
源码：[scripts/run-zotero-full-suite.ts](../../../../scripts/run-zotero-full-suite.ts)

## 符号（3）
<!-- node: function:scripts/run-zotero-full-suite.ts:main -->
<!-- node: function:scripts/run-zotero-full-suite.ts:runStep -->
<!-- node: function:scripts/run-zotero-full-suite.ts:spawnNpm -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 51–61 | 简单 | script、tooling、build-system | 0 | 套件入口，按固定顺序执行 Zotero E2E 的构建、安装与全量测试步骤。 |
| runStep | 函数 | 29–49 | 简单 | script、tooling、build-system | 0 | 执行单个 npm 步骤的子进程，继承 stdio 并在非零退出码时中断整个套件。 |
| spawnNpm | 函数 | 15–27 | 简单 | script、tooling、build-system | 0 | 封装 npm 命令的 spawnSync 调用，传入附加参数并透传退出码。 |
