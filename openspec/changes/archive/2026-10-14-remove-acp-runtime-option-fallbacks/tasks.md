# Tasks

## 1. Model 与 reasoning 值语义收敛为 raw 直传

- [x] 1.1 移除 model suffix 折叠、model-derived reasoning 内部来源与 derived cache
  执行路径，reasoning 仅来自后端显式 `thought_level`；公共字段名与 `acpModelId`
  保持不变，`acpModelId` 承载完整 raw ID；可保留 `state.displayModels` 与
  `state.rawModels` 双字段但取值一一相同、不 fold、不 rename；验证 181 组
  model-effort-selector 测试通过且 `gpt-5@low/medium/high` 各自独立
- [x] 1.2 未指定 mode/model/reasoning 时不发送任何配置覆盖 RPC，UI 显示后端
  current、无 current 时保持 unset；验证 96 组 runtime-options 测试与相关
  assistant chrome 测试通过

## 2. 无效选项失败语义与 profile 契约

- [x] 2.1 无效或含糊的显式选项保留原值并报 `provider_profile_option_unavailable`，
  不回退到 current、catalog 首项或其它 variant，不自动迁移旧 profile；验证
  100 组 connection 测试与 backend-provider-profile-contract 相关测试通过

## 3. 配置 RPC 路径与启动失败治理

- [x] 3.1 有 advertised config setter 的 category 失败即失败，不切换 RPC 救场；仅在
  缺少该 category 时使用原生 model/mode RPC；后端拒绝原样传播 `-32601` /
  `-32602` / `-32603`，`code/data/method/configId/value` 经既有 ACP diagnostics 与
  runtime-log `details` 脱敏保存，message 含后端 `data.details`
- [x] 3.2 启动期配置失败阻止首 prompt，且不进入输出 repair 或 result-file fallback；
  current 仅在 RPC 成功或后端权威 update 确认后提交；验证 107 组 compatible 测试
  与 output repair / recovery 相关测试通过

## 4. 删除降级模块与 cache 定位

- [x] 4.1 删除 `acpReasoningEffortFallback.ts` 及 Kilo downgrade 全部调用点；live
  catalog 以 session 实时元数据为准，backend cache 仅用于离线展示与提交前静态
  membership 检查，不用 stale categories 覆盖实时声明；验证受影响 Node shards
  与 typecheck 通过

## 5. 文档与集成验证

- [x] 5.1 更新 `docs/components/assistant-workspace-acp-surface-ssot.md`、
  `docs/acp-skills-state-machine-ssot.md`、`docs/components/acp-skillrunner-parity.md`
  的陈旧语义（折叠/派生/Kilo 降级），并在 AGENTS.md ACP 硬约束处记录当前契约；
  验证 192 组 assistant chrome 测试、相关 Node shards、typecheck 与 scoped lint
  通过

## 验证记录

- `runtime-provider-registry`、`acp-session`、`acp-skill-run`、`skillrunner-runtime`、
  `assistant` Node 分片通过；工作流设置 35/50 两组共 44 个用例通过。
- ACP Runtime 完整分片有 9 个与此次配置契约无关的 Windows 测试失败：
  100 组的 5 个 npm 替身被 Windows 原生 npx 启动优化绕过；
  178 组的 POSIX 0600 权限断言；249 组的 3 个 manifest 路径插入 JSON
  未转义 Windows 反斜杠，子进程未生成 evidence。排除这些用例后的分片通过，
  配置拒绝、动态配置更新、含糊控制与 backend probe 用例全部通过。
- 主项目与 Sidebar TypeScript 检查、受影响文件 ESLint、Prettier 和
  `git diff --check` 通过。
- 未构建 XPI、未在真实 Zotero profile 安装验证；未修改 MiniMax 后端或本机配置，
  未提交、同步主规格或归档 change。旧的折叠模型值需要用户重新选择。
