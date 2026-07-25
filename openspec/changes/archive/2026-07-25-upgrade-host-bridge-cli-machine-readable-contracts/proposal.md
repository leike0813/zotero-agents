## Why

Host Bridge CLI 目前能描述命令树，却没有统一、严格且可离线读取的结构化输入与结果契约；生成的命令参考也按大类聚合，迫使 agent 加载无关命令并在多份手写说明之间推断 payload。需要在尚未发布的 CLI `0.4.0` 首次发布前收敛这些事实源，避免后续以兼容性负担固化不完整契约。

## What Changes

- 新增版本化 command-contract registry，统一声明结构化输入参数 schema、条件必填关系、示例、前置条件和命令级 result schema。
- 为所有 canonical leaf command 增加离线全局 `--schema` 查询路径；该路径跳过普通命令必填参数、profile/config 加载和网络连接，并保持现有 stdout 信封。
- 将 Agent Surface 从 v4 升级到 v5，完整保留现有命令语义并增加 argv 元数据、原始 input schemas、examples 和严格 result schemas。
- 从同一 Clap inventory 与 command-contract registry 生成 `--help`、`surface describe --json`、逐命令 Markdown 卡片和 command catalog，消除 schema 与示例的多处手写。
- 将 8 个聚合命令 reference 替换为 125 个 canonical leaf command 文件；catalog 成为全部命令卡的唯一直接索引。
- 更新 release-set、CLI identity、surface checksum、Skill package governance、semantic parity 与 review mirror 门禁。
- CLI Cargo 版本保持 `0.4.0`，不触发发布、提交或分支操作。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `agent-cli-self-description`: CLI 自描述需要覆盖严格的参数级 schema、示例、完整 argv 元数据和命令级 result contract。
- `host-bridge-agent-surfaces`: Minimum command references 改为逐叶命令卡，并由 catalog 保证完整、唯一、可达且保持固定 baseline 的语义厚度。
- `host-bridge-cli-interface`: CLI 增加离线全局 `--schema`，并定义叶命令、无 schema 输入和 stdout 信封行为。

## Impact

- Rust CLI parser、离线旁路执行、embedded descriptor 和 CLI tests。
- `schemas/` 中的 command-contract、Agent Surface 与 release-set schema。
- TypeScript Clap inventory、Agent Surface generator、surface catalog、release renderer、Skill package validator 与相关 tests。
- `skills_src/zotero-bridge-cli` 及其 builtin、Hermes、中文 review mirror materialization。
- 固定语义 baseline 为 `71da2eb325e946291b901d778b20ceb3c5db368f`；仅批准删除现有 8 个 aggregate command references，其有效语义必须映射到逐命令卡。
