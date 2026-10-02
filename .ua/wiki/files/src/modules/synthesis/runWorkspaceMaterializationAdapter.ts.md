
# src/modules/synthesis/runWorkspaceMaterializationAdapter.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/runWorkspaceMaterializationAdapter.ts -->

把 synthesis-contracts 定义的 run workspace 物化契约适配到插件侧运行时文件系统，使 Sidecar 下发的 workspace 结构在 Zotero 沙箱内按 runtimePersistence 规则落盘。
源码：[src/modules/synthesis/runWorkspaceMaterializationAdapter.ts](../../../../../../src/modules/synthesis/runWorkspaceMaterializationAdapter.ts)

## 符号（2）
<!-- node: function:src/modules/synthesis/runWorkspaceMaterializationAdapter.ts:createSynthesisHostRunWorkspaceMaterializationPort -->
<!-- node: function:src/modules/synthesis/runWorkspaceMaterializationAdapter.ts:validateAcpSkillRunRoot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisHostRunWorkspaceMaterializationPort | 函数 | 60–96 | 中等 | 契约适配、端口、物化 | 0 | 创建 run workspace 物化端口：把 contracts 声明的写文件/建目录语义映射到 runtimePersistence 适配器。 |
| validateAcpSkillRunRoot | 函数 | 42–58 | 简单 | 路径安全、校验、workspace | 0 | 校验 ACP skill run 工作区根路径合法，阻断越界路径进入物化流程。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [path.ts](../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisHostRunWorkspaceMaterializationPort | 函数 | 60–96 | 创建 run workspace 物化端口：把 contracts 声明的写文件/建目录语义映射到 runtimePersistence 适配器。 |
| validateAcpSkillRunRoot | 函数 | 42–58 | 校验 ACP skill run 工作区根路径合法，阻断越界路径进入物化流程。 |
