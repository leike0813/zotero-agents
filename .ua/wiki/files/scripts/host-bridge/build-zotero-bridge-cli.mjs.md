
# scripts/host-bridge/build-zotero-bridge-cli.mjs
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/build-zotero-bridge-cli.mjs -->

Zotero Bridge CLI 构建脚本，检测运行平台、确保 cargo-zigbuild 可用，按七个目标平台交叉编译并输出到 addon/bin。
源码：[scripts/host-bridge/build-zotero-bridge-cli.mjs](../../../../../scripts/host-bridge/build-zotero-bridge-cli.mjs)

## 符号（3）
<!-- node: function:scripts/host-bridge/build-zotero-bridge-cli.mjs:ensureCargoZigbuild -->
<!-- node: function:scripts/host-bridge/build-zotero-bridge-cli.mjs:run -->
<!-- node: function:scripts/host-bridge/build-zotero-bridge-cli.mjs:runtimePlatform -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureCargoZigbuild | 函数 | 78–87 | 简单 | build-system、cross-compilation、validation、tooling | 0 | 确认 cargo-zigbuild 已安装，缺失时给出安装指引以保证跨平台编译链路可用。 |
| run | 函数 | 62–73 | 简单 | utility、process、build-system、wrapper | 0 | 同步执行子进程命令并在非零退出码时中止构建。 |
| runtimePlatform | 函数 | 48–60 | 简单 | cross-compilation、platform、build-system | 0 | 由当前操作系统与架构推导 cargo 目标三元组，用于选择交叉编译配置。 |
