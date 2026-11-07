# Design

## Context

动机见 [proposal.md](proposal.md)。本设计补记已实施代码，不构造一个尚未发生的开发过程。

普通异步文件系统 adapter 由 `runtimePersistence` 持有；工作流包经 Workflow Host API v12 使用文件能力，不能选择 Node 或 Zotero 全局。附件准备与原生导入有各自的资源所有权；相邻输出的命名与事务仍由工作流包持有。

## Goals / Non-Goals

**Goals:**

- 在各操作 owner 能确定目标时校验完整路径；所有已知恢复路径必须在移动旧内容前通过预检。
- 即使底层操作失败或响应不确定，也不把“可能存在旧数据”推断成“可删除”。
- 复用现有 API、adapter 和工作流事务，不增设路径服务或新的存储层。

**Non-Goals:**

- 不保证任意目录深度都能完成任务；无足够预算时安全拒绝。
- 不修改 Windows 注册表、不使用长路径前缀、不自动迁移根目录或重命名历史相邻输出。
- 不治理其他应用自行生成的路径，不扩大到发布、安装或无关运行时超时修复。

## Decisions

### 1. 完整预算由共享文件系统边界持有

`assertRuntimePathBudget` 解析绝对工作目录基础，分别校验文件、目录和分量。Windows 使用 UTF-16 单元；POSIX 使用 UTF-8 字节；生成的 portable 名称另保留既有 UTF-8 上限。错误带稳定 `resource_limited` 分类和 limit/observed 数值；Workflow Host 投影遵守既有错误详情契约。

只截断 basename 无法约束根目录和中间路径；放开 Windows 长路径也不能保证其他消费者可读。因此不采用这两种替代方案。

### 2. 短内部目录与独占所有权

原子文件和 ZIP 使用短 sibling operation directory 及固定叶名；目录复制在其内部持有新树/旧树。`ensureRuntimeDirectoryExclusive` 只有成功取得独占创建证据后才授予清理权；Workflow `file.makeDirectory` 的可选 `exclusive` 标志投影该语义。

不采用“清掉同名目录再创建”，也不将论文全名复制进临时名称。目录移动先有界检查所有目标后代，超过 100,000 个节点或 64 层时拒绝，避免无界预检。符号链接按链接本身检查，不跟随悬空链接。

### 3. 文件名缩短与附件原生目标分别验证

`normalizeRuntimeOutputFilename` 仅为新生成的物理主文件名计算剩余预算，保留扩展名，截断后再检查保留设备名。显示标题不变，companion 不改名，所有来源和目标先验证再暂存。

原生附件 owner 在创建前预测 Zotero 八字符 key 的 storage 路径、主文件、companion 和全文缓存原子临时名；返回的实际 storage 再校验。替换还预检备份路径。不能只因暂存成功就认定原生目标安全。

### 4. 失败恢复依据确认状态，不依据宽容 exists

- 原生覆盖失败直接传播，不删除旧文件后重试。
- 树 promotion 后无法确认状态时保留可能的备份；只把明确的 not-found 当作缺失。
- MinerU 在旧 Markdown 首次移动前预检图片目录、旧图片备份后代及新输出目标，记录已确认的 backup/promote effect。
- 翻译与深读复用 `withAdjacentTextFiles`：先完整暂存，再移动；独占失败不清理，未确定的 native move 或 mutation outcome 保留恢复目录。

基于目标存在与否猜测本次所有权会在迟到成功、权限错误或竞争时删除旧数据，因此不作为恢复依据。

### 5. ZIP 的预检身份与实际提取身份保持一致

Workflow bundle 的 Node 提取路径先解析 ZIP 元数据并检查全部完整目标，再调用既有 extractor。中央目录与 local header 的成员身份必须一致；歧义编码或不安全成员失败关闭。保留真实 deflate 支持，不以仅支持 store 的替代实现缩减既有能力。

## Risks / Trade-offs

- 深根目录或超大目录树可能被提前拒绝 → 返回预算/检查上限，不修改用户目录，也不静默跳过后代。
- 原生移动完成响应可能丢失 → 保留恢复材料并报告不确定状态，接受需要人工恢复的代价。
- 新预算会暴露此前依赖底层宽容行为的调用方 → 保持命名和根位置不变，迁移受影响 caller 并保留回归验证。
- Linux 测试不能证明 Windows Zotero 原生行为 → Windows 实机验收保留为未完成项，不宣称已获跨平台运行证明。

## Migration Plan

无数据格式或目录迁移。实现及主规格已更新；插件代码和工作流包均需通过既有交付流程更新后才对用户生效，本 change 不授权发布。

回退代码不应删除保留的恢复目录，也不能把历史文件转移到另一个根。主规格已同步；后续归档前应核对 delta 与主规格一致，避免重复应用新增条款。

## Verification Evidence

已执行记录，不代表本次补文档时重新运行：

- `npm run test:node -- --domain workflow --jobs 4`：五个 workflow 分片通过；共享相邻文件事务最终修正后另跑完整 literature 分片。
- `npm run test:node -- --shard workflow-packages-literature --jobs 1`：116 passing、18 pending、0 failures；[机器结果](../../../artifacts/test-diagnostics/node/2026-11-06T23-32-20-369Z-1424188/results/test-node--workflow-packages-literature.mocha.json)。
- 五文件定点 Mocha（input-materialization、stored-attachment-import、host-api-archive、runtime-persistence-governance、host-bridge-file-downloads）：107 passing。
- Linux 真实文件系统生产路径 smoke：长文件名原子替换、Windows 形状路径拒绝、store/deflate ZIP、原报告文件名 MinerU 图片 promotion、相邻文本提交/失败回滚均通过；源 PDF 不变、无工作流暂存残留。临时 smoke 脚本已删除。
- `tsc --noEmit`、受影响文件 ESLint/Prettier、两份主规格 strict 校验通过。

尚未闭合的证据：

- ACP 注入失败专项在技能物化前置断言处失败，未执行到 copy 故障注入；[分片失败记录](../../../artifacts/test-diagnostics/node/2026-11-06T23-31-06-827Z-1420969/failures.md)。随后定点诊断输出为 `Host Bridge plugin Skill bundle surface identity mismatch`。未放宽身份校验或改写生成包掩盖失败。
- `npm run test:node -- --domain runtime --jobs 4` 的 `runtime-provider-products` 中，`172-export-research-bundle-skill-runtime.test.ts` discovery/CLI 场景超时 30 秒；[失败记录](../../../artifacts/test-diagnostics/node/2026-11-06T15-52-39-903Z-588956/failures.md)。未证明其为基线问题，不能视为通过。
- 未执行 Windows 原生 Zotero 验收、插件 build/XPI、安装或发布。
