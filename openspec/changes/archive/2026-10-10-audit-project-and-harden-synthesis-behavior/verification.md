# Verification

Change: `audit-project-and-harden-synthesis-behavior`。执行回执见 [audit](audit.md#final-follow-up-verification-2026-10-10)，逐行为断言与适用边界见 [覆盖矩阵](behavior-coverage.md)。

实施任务 **13/13 完成**。G01–G12 已闭合；最后复核的 canonical 反向合并、Related Items 缺失条目与 maintenance 运行/续行状态均有已通过的断言，旧 YAML 中未实现的状态名称另记为文档漂移。

## 规格与实现

五份 delta spec 共九项 requirement、25 个 scenario。修复保留既有模块所有权，无新增运行器、依赖、存储迁移或测试专用公共 API。

| 需求 / 场景 | 实现所有者 | 验证证据 |
| --- | --- | --- |
| RPC envelope 分类、HTTP 矛盾、成功身份与原生错误保留 | synthesisSidecarRpcClient.ts | 231 observability；两种 transport error policy、取消与超时 |
| JSON 数字/自有键跨语言往返，旧存储兼容 | protocol、worker/pool、canonical-store；contracts canonicalJson/common | 239 numeric/JSON；protocol 数字/page hash 表；冻结 v1 存储 reopen、export/import、篡改拒绝 |
| Index 库范围、独立 cursor、Topic 全分页与规划节点 | libraryIndex.ts、closed schema、runtime_artifact_library_debug.rs | 238 十例实际 TS→Rust；229/230 调用方；RH-01 实机分页 |
| 非空领域 DTO、警告与精确审阅目标 | Concept/Topic/Reference/Tag/WebDAV application 与 runtime adapters | 239 Topic 十例、Tag 十二例、Reference/Graph 四例、WebDAV 六例；实际 worker rebuild/query、真实 triage、精确 Reference target、共享 baseline 冲突；Rust alias keep/remove、坏目标零写入及 reopened facts |
| reverse Host awaited read 的 basis | synthesisReverseHostHandlers.ts | 225 末页 in-flight revision 拒绝与稳定对照；RH-02 实机重试 |
| surface response 当前库隔离 | synthesisWorkbenchApp.ts | 252 可见/隐藏旧 owner 响应均拒绝，当前 owner 较小 request ID 仍可更新 |
| ACP pending permission 退出收敛 | acpConnectionAdapter.ts | 100 真实 peer 退出；100/197 联合回归 |
| 安装替换失败保留旧目录、恢复冲突不覆盖 | skillRunnerReleaseInstaller.ts | 75 部分解压、缺失产物、promotion/rollback 失败与真实目录树 |
| 安装临时文件按最终结果保留 | skillRunnerReleaseInstaller.ts | 75 早期失败及 success/failure flag 组合 |

任务 3.3 的补测还覆盖 Canonical/Discovery 决策和持久化、maintenance 终态事件恰好一次、Tag/Related Items 丢响应恢复、Related Items echo 消费与写入失败后的图保留、只读投影/大结果传输，以及真实 Zotero Tags/Review 交互。证据按风险所在层记录，不用 schema 合法或 operation 存在替代业务成功断言。

## 最终验证

| 验证 | 结果 |
| --- | --- |
| Rust workspace | 445 passed，零 failed/ignored |
| 真实进程 CI 测试组 | 82 passed，自然退出 |
| Native Stage1 | 46 个文件、三个分段全部通过 |
| 普通 Synthesis | 35 个文件、三个 shard 全部通过 |
| UI 125/252/256/258/259 | 173 passed |
| 全项目 Node | 初始整轮与两个失败分片的修复后重跑合计 28 个 shard 通过；未冒称一次全绿 |
| 跨语言契约、runtime/worker transfer parity | 通过；135 capabilities、15 workers |
| TypeScript、ESLint、Prettier、Clippy、Rustfmt、构建 | 通过；root tsc 不包含测试源码，测试已直接执行和 lint |
| 最终 Linux Zotero 10.0.2 E2E | 31/31；complete manifest `abbceb30-2b8e-4f19-906e-e36b4622693d`，清理与健康检查全部通过 |
| Linux Zotero 7.0.32 / 9.0.6 | 各初始整套 31/31；后续 RH/PA 定向验收均 4/4，源码阶段与 manifest 分列于 audit |
| OpenSpec 严格校验、git diff --check | 通过 |

独立审阅发现的数值存储兼容风险、Topic triage 信息丢失、alias 缺失目标校验及测试夹具问题均已修复并回归。Rust 诊断捕获仅在测试模式下按线程隔离，生产日志行为保持原有语义。

## 验收边界

106/106 operation 表示清单完整；本 change 识别的适用行为断言以矩阵 G01–G12 为准。未用行数、case 数或 operation 数推导任意业务的“100%”，也不宣称所有内部代码分支已覆盖。D01–D03 区分当前未实现的可选能力与历史规格漂移，未新增这些产品能力。

Windows/macOS 的真实进程 CI 已配置，本轮未执行；Linux 结果不能证明这些平台的原生关闭行为。目录名为 10.0.2、实际为 10.0.5 的原安装树只提供补充证据，精确版本验收使用独立核验的 10.0.2 安装树。

用户原有暂存 help manifest 保留。代码未提交、未发布、change 未归档。
