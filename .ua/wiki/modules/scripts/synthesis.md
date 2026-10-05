
# scripts/synthesis
> 目录聚合页：35 个文件、100 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [scripts/synthesis/check-synthesis-artifact-library-debug-surface-parity.ts](../../files/scripts/synthesis/check-synthesis-artifact-library-debug-surface-parity.ts.md) | 文件 | 1 | 产物库 debug surface 一致性检查：比对 production surface 语料与 sidecar system 契约，确认 debug 面板所需的每个 operation 都被声明。 |
| [scripts/synthesis/check-synthesis-citation-graph-surface-parity.ts](../../files/scripts/synthesis/check-synthesis-citation-graph-surface-parity.ts.md) | 文件 | 1 | 引用图谱 surface 一致性检查：校验引用图谱相关 operation 在契约、语料与基线 fixture 三侧齐备。 |
| [scripts/synthesis/check-synthesis-concept-topic-graph-surface-parity.ts](../../files/scripts/synthesis/check-synthesis-concept-topic-graph-surface-parity.ts.md) | 文件 | 1 | 概念-主题图谱 surface 一致性检查：校验概念知识库与主题关系图谱 operation 的跨语言契约覆盖情况。 |
| [scripts/synthesis/check-synthesis-cross-language-contracts.ts](../../files/scripts/synthesis/check-synthesis-cross-language-contracts.ts.md) | 文件 | 5 | 跨语言契约检查脚本：递归比对 TS 契约 schema 与 Rust 侧协议注册表，验证结构、协议引用与必填字段在两种语言实现中保持一致。 |
| [scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts](../../files/scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts.md) | 文件 | 3 | 原生运行时契约一致性检查：比对 Rust 侧运行时 bundle 指针、launch config 与 discovery schema 是否与 TS 契约对齐。 |
| [scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts](../../files/scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts.md) | 文件 | 2 | 原生 worker 传输一致性检查：校验 citation graph build 的输入/输出分页与 transfer manifest 在引擎与 sidecar 之间的归属一致。 |
| [scripts/synthesis/check-synthesis-production-capabilities.ts](../../files/scripts/synthesis/check-synthesis-production-capabilities.ts.md) | 文件 | 5 | 生产 capability 契约检查：验证 sidecar system 声明的 capability 集合、operation policy、语义成功规则与 CLI 暴露面一致。 |
| [scripts/synthesis/check-synthesis-production-route-performance.ts](../../files/scripts/synthesis/check-synthesis-production-route-performance.ts.md) | 文件 | 8 | 性能门禁脚本：经 Synthesis 生产路由执行 topic 数据集写入、标签效果与 maintenance 操作，采集延迟与降级信号并生成 P50/P95 性能报告。 |
| [scripts/synthesis/check-synthesis-reference-canonical-surface-parity.ts](../../files/scripts/synthesis/check-synthesis-reference-canonical-surface-parity.ts.md) | 文件 | 1 | canonical reference surface 一致性检查：校验引用 canonical 化相关 operation 在契约与语料侧的覆盖与边界。 |
| [scripts/synthesis/check-synthesis-rust-license-inventory.ts](../../files/scripts/synthesis/check-synthesis-rust-license-inventory.ts.md) | 文件 | 3 | 治理校验脚本，读取 Synthesis 侧车的 Cargo.lock 并核对每个 crate 的许可证是否登记在允许清单中。 |
| [scripts/synthesis/check-synthesis-service-boundary.ts](../../files/scripts/synthesis/check-synthesis-service-boundary.ts.md) | 文件 | 7 | Synthesis 侧车服务边界巡检脚本，遍历仓库源码查找越界模式（生产代码引用测试设施、跨契约层导入等）并以 CLI 结果报告违规。 |
| [scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts](../../files/scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts.md) | 文件 | 1 | Synthesis sidecar 运行时新鲜度检查：按七平台目标逐一验证 addon 内 bundle 的构建指纹与当前源码是否一致。 |
| [scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts](../../files/scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts.md) | 文件 | 2 | 校验已构建的 XPI 内是否携带与目标平台匹配的 Synthesis sidecar 运行时 bundle，并按构建指纹判定其新鲜度。 |
| [scripts/synthesis/check-synthesis-tag-surface-parity.ts](../../files/scripts/synthesis/check-synthesis-tag-surface-parity.ts.md) | 文件 | 1 | 标签 surface 一致性检查：校验标签词表相关 operation 的契约、语料与基线一致。 |
| [scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts](../../files/scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts.md) | 文件 | 1 | 主题工作台 surface 一致性检查：校验 workbench 消费的 operation 集合与 sidecar 契约声明齐备。 |
| [scripts/synthesis/check-synthesis-webdav-maintenance-surface-parity.ts](../../files/scripts/synthesis/check-synthesis-webdav-maintenance-surface-parity.ts.md) | 文件 | 1 | WebDAV 维护 surface 一致性检查：校验 public maintenance operation 的 capability、路由与语料声明一致。 |
| [scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts](../../files/scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts.md) | 文件 | 5 | Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。 |
| [scripts/synthesis/dispatch-synthesis-sidecar-release.ts](../../files/scripts/synthesis/dispatch-synthesis-sidecar-release.ts.md) | 文件 | 2 | 触发正式 runtime release 的 workflow dispatch 脚本，先校验 checkout 处于预期分支与干净状态，再派发发布流水线。 |
| [scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts](../../files/scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts.md) | 文件 | 4 | 从 GitHub Actions artifact 下载 Synthesis sidecar runtime 压缩包并解包到本地 tar.gz 缓存，同时校验目标三元组与摘要。 |
| [scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts](../../files/scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts.md) | 文件 | 2 | 为已构建的 Synthesis sidecar runtime 生成符号清单（symbol manifest）并打包，支撑崩溃栈符号化与发布证据链。 |
| [scripts/synthesis/package-synthesis-sidecar-runtime.ts](../../files/scripts/synthesis/package-synthesis-sidecar-runtime.ts.md) | 文件 | 1 | Synthesis sidecar runtime 的打包 CLI：按平台目标收集 Rust 构建产物、清单与指针文件，组装成可分发的 bundle 目录。 |
| [scripts/synthesis/prepare-synthesis-sidecar-release.ts](../../files/scripts/synthesis/prepare-synthesis-sidecar-release.ts.md) | 文件 | 1 | 正式发布前的准备脚本：确认 git 状态与校验结果齐备，生成 release plan 与 release set 作为后续派发的输入。 |
| [scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts](../../files/scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts.md) | 文件 | 4 | 把预构建产物发布到不可变远端 store：以 copy-or-verify 方式幂等上传，校验目标证据后回写 prebuild 集合。 |
| [scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts](../../files/scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts.md) | 文件 | 4 | 解析并复用最近可用的 sidecar runtime 缓存：列举 workflow runs 与 artifact，按目标三元组和摘要选定可下载的缓存命中。 |
| [scripts/synthesis/resolve-synthesis-sidecar-verification.ts](../../files/scripts/synthesis/resolve-synthesis-sidecar-verification.ts.md) | 文件 | 3 | 解析并重新验证 sidecar runtime 的校验回执：只接受可信来源的 verification result，并按当前内容重新核对身份与指纹。 |
| [scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts](../../files/scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts.md) | 文件 | 5 | Rust sidecar durable candidate 冒烟脚本：以真实子进程启动 sidecar，覆盖 loopback 转发、reverse host fixture、饱和、布局与 citation graph build 等生产路径。 |
| [scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts](../../files/scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts.md) | 文件 | 2 | Rust sidecar worker 冒烟脚本：拉起 sidecar 的 worker 子进程，校验 provenance 指纹并对 worker 协议做一次 layout 请求往返。 |
| [scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts](../../files/scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts.md) | 文件 | 3 | 把预构建归档按目标三元组暂存到本地 store 目录，先断言目标目录集合精确匹配再落盘，避免目录漂移。 |
| [scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts](../../files/scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts.md) | 文件 | 2 | 从远端预构建分支同步 sidecar runtime 归档到本地 store，按目标三元组增量复制并保持集合与远端一致。 |
| [scripts/synthesis/synthesis-native-stage1-suite.ts](../../files/scripts/synthesis/synthesis-native-stage1-suite.ts.md) | 文件 | 3 | 把 Synthesis 原生 stage1 测试按 core 模块编号聚合为一个套件定义，供 Node 测试分片调度器统一执行。 |
| [scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts](../../files/scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts.md) | 文件 | 2 | runtime release 回执的状态机控制器：创建初始回执并按阶段推进状态，保证发布生命周期有唯一可追踪记录。 |
| [scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts](../../files/scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts.md) | 文件 | 9 | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |
| [scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts](../../files/scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts.md) | 文件 | 1 | 把 release set 展开为可执行的 release plan，列出每个目标三元组及其对应的预构建结果。 |
| [scripts/synthesis/synthesis-sidecar-runtime-release-set.ts](../../files/scripts/synthesis/synthesis-sidecar-runtime-release-set.ts.md) | 文件 | 1 | 定义 runtime release set 的文件布局与读写：集中 release set 与 receipt 的路径常量，并提供从磁盘读取校验的入口。 |
| [scripts/synthesis/synthesisProductionSurfaceCorpora.ts](../../files/scripts/synthesis/synthesisProductionSurfaceCorpora.ts.md) | 文件 | 3 | 生产 surface 语料库：定义各 surface 的 schema、codec、基线 fixture、请求/响应字节边界与 operation 清单，并读取基线证据用于一致性检查。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../packages/synthesis-contracts/src.md) | 38 |
| [packages/synthesis-engine/src](../packages/synthesis-engine/src.md) | 5 |
| [scripts](../scripts.md) | 3 |
| [scripts/system-e2e](system-e2e.md) | 1 |
