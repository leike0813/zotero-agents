# Design

## Context

动机见 proposal。普通文件系统 adapter 已由 runtimePersistence 持有。Gecko 115/140 提供 PathUtils.toExtendedWindowsPath，IOUtils 使用 nsIFile 和 Win32 Unicode I/O；扩展路径不需要注册表开关。Shell、原生附件后续处理及外部提取器具有独立限制。

## Goals / Non-Goals

共享入口承担 native/interop 预算、late-bound 路径适配和临时目录预留。保留事务、stream 停止回调、原子提交、既有引用和清理语义。不迁移历史文件、不修改任意命令参数、不新增文件服务；超长链接最终目标不在本轮支持范围。

## Decisions

### 原生与兼容路径

assertRuntimePathBudget 增加第三个 policy 参数，默认 interop，保护未经迁移的下游消费者。native 预算计入扩展格式和 NUL 的 Windows 32767 上限，分量仍最多 255 UTF-16；interop 保留文件 259、目录 247。POSIX 字节预算不变。

平台 path 模块提供 normalizeWindowsFilesystemPath 与 toExtendedWindowsFilesystemPath，接受绝对盘符、UNC 及对应扩展形式，规范分隔符与点段，拒绝相对驱动器和设备命名空间。runtimePersistence 的 toRuntimeNativeFsPath 为 IOUtils、原生传输及 worker 提供私有物理路径；Gecko 调用 PathUtils.toExtendedWindowsPath，缺失能力时长路径失败关闭。返回枚举结果先恢复普通路径，再由每次 I/O 重新适配。Node 仍使用原有 fs adapter。

### 临时目录与物理名称

新增 reserveRuntimeTemporaryDirectory，在现有 category 根内独占预留有界 token；interop 下若该根不能容纳已知 relativePaths，则使用系统临时目录的插件短命名空间。返回 path、cleanup 与 release：cleanup 删除已取得的所有权，release 将内容交还既有保留策略而不删除。fallback 目录登记当前 runtime root 身份，治理只扫描匹配所有者的目录，活跃租约继续使用已有临时清理互斥。

资源物理名使用短序号及受限扩展名，runId、slotId、displayName 保留在资源元数据。输入物化缩短目录层级并保留既有消费者生命周期；已发布输出不随 hook 结束删除。附件主文件继续使用可携带名称，companion 相对路径不变。

### 消费者中转与提交

Workflow file 使用 native I/O。ZIP/外部提取器及附件入口使用完整 interop 预检和短副本，仅替换声明的本地输入/输出。外部输出完成后复制到目标同卷短 sibling，再沿原有原子提交路径提升。取消或原生完成状态不确定时保留在途所有权和恢复材料，不删除旧目标。

## Risks / Trade-offs

- 文件系统单段、卷和实际消费者限制仍有效：数值预算与原生失败分别报告。
- Gecko 最终 symlink/junction 解析仍可能使用 MAX_PATH：保留原有链接策略，不宣称扩展此能力。
- 系统临时根也可能过深：尝试已声明候选后安全拒绝，不迁移根或使用驱动器别名。
- Node 不能证明 Gecko 行为：Windows 三版本隔离验收记录实际版本、路径类别与执行结果；缺失结果不计通过。

## Migration Plan

先红灯回归，再逐入口迁移。修改文件包括 runtimePersistence、platform/path、runtimeFileTransfer、Workflow resource/file/archive/zipBundleReader/input materialization、runtimeFileRegistry、prepared-files、ACP interaction files、runtime governance 与对应既有测试。结果包临时写入由 workflowExecution/bundleIO 使用共享分配器；该 handle 和 Host Bridge agent apply 负责 dispose ZIP reader，测试调用者同步补齐清理。更新路径 SSOT、附件生命周期、Workflow 文档和 AGENTS；不改历史布局、数据库或 Host API v12。build 前使用既有 preflight，未授权发布与提交。

## Validation — 2026-11-11

基于 `bc9924858`、`dev` 工作区执行，未提交或发布，也未安装到日常 profile。

- 原生及内容 preflight 全部 fresh：sidecar 七平台 fingerprint `36668dbf295a4af923adef50aaedd1eeb2a74c739f85ba4ed22fed96221e4c22`；Host Bridge CLI 七平台 `0.5.2-dev.1`；ACP bridge、Host Bridge 内容/文档、内置技能、validators、workflow manifest 及当前分支 Content Package 检查通过。内容包 428 文件、5197742 字节，摘要 `a85a65173753d1b93bbbb7f7c23c6e65f4a05365bafc27426f70d4a92066e9f4`。
- `npm run build` 通过，包括生产打包、四份插件 TypeScript 配置及 Synthesis packages 检查；`npm run check:help-docs`、`openspec validate support-native-windows-long-paths --strict` 通过。
- Node 合跑十个既有文件：runtime 108/164、Workflow 90 输入及附件/87/91/176、Host Bridge 108/138、tooling 194。命令采用 `node --import tsx node_modules/mocha/bin/mocha <上述文件> --require tests/setup/zotero-mock.ts --timeout 20000 --reporter dot --exit`，仅以精确 grep + invert 排除下述无权限用例；290 passing、3 pending。合跑权限投影用例改为等待 approval handler 就绪，消除单次 `setTimeout(0)` 的时序假设。平台文件输出 mock 统一相对/绝对路径身份，完整 164 为 53 passing、3 pending。
- 未排除时 runtime 108 的 `sets attachment modification time without changing bytes and identifies symlink sources` 在 `fs.symlink` 报 EPERM；本机账号没有文件 symlink 创建权限，该用例不计通过。3 pending 是平台条件跳过，不计覆盖。
- ACP 107 定点 `--grep 'interaction files|copy fails|copy failure'`：1 passing；此前暂存及失败回归定点为 2 passing。文献深读 158 与分析 21 的 `--grep 'bundle|ArrayBuffer|ZIP'`：6 passing；Synthesis 239 的 `--grep 'bundles paper|source bundle'`：1 passing。
- Node 外部提取的红灯证实本机 Windows PowerShell 误加载 PowerShell 7 Archive 模块，报 MethodException 但返回 0；改用已有 .NET `ZipFile.ExtractToDirectory` 双参数接口并设置终止错误后，真实 ZIP 提取和 dispose 用例通过。没有引入 tar 或新依赖。

Windows 实机使用同一既有 `npm run test:zotero:core` 入口，设置 `ZOTERO_TEST_GREP='supports ordinary Windows long paths'`，分别指定 `ZOTERO_TEST_ZOTERO_VERSION` 为 7、9、10 及本机对应 executable。每次由 runner 从当前源码构建、安装临时插件并使用隔离 profile/data；三个 invocation 均退出 0，各 1 passed：

| 实际宿主                  | 覆盖                                                    | 结果   |
| ------------------------- | ------------------------------------------------------- | ------ |
| Zotero 7.0.32 / Gecko 115 | 普通 Unicode 长路径文件操作、worker、XPC 哈希、ZIP 往返 | passed |
| Zotero 9.0.6 / Gecko 140  | 同上                                                    | passed |
| Zotero 10.0.2 / Gecko 140 | 同上                                                    | passed |

这些是本地源码隔离验收，不替代兼容矩阵 10.0.1 receipt 或正式发布验收。真实 UNC 网络卷、长 symlink/junction 最终目标、完整 `npm test` 均未覆盖。普通 UNC/扩展 UNC 的规范化由平台单元测试覆盖。
