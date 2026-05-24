# Host Bridge Phase 9 MCP Deprecation 实现计划

日期：2026-05-20

## Summary

本阶段目标是完成 agent host access 默认路径切换：ACP agent run 默认只使用 Host Bridge CLI，不再默认启动 MCP、不注入 MCP descriptor、不执行 MCP preflight，也不在 ACP 面板正常状态中显示 MCP 指示灯。

MCP 的代码、能力、测试和诊断入口仍保留，定位从默认通信机制降级为显式兼容/开发诊断工具。也就是说，本阶段不是删除 MCP，而是把 MCP 从正常运行链路中移出。

## Scope

本阶段覆盖 OpenSpec change `introduce-host-bridge-cli-interface` 中的 Phase 9：

- `9.1` 保留 MCP descriptor injection 的显式兼容路径。
- `9.2` 增加诊断，说明 run 使用 Host Bridge CLI guidance 还是 MCP compatibility guidance。
- `9.3` Host Bridge CLI 稳定后，停止 MCP 默认启动、descriptor injection 和 fallback。
- `9.4` 从正常 ACP run preparation 中移除 MCP preflight。
- `9.5` 从 ACP 面板正常 run status surface 中移除 MCP 指示灯。
- `9.6` 保留 MCP diagnostics 作为显式 developer / compatibility tooling。
- `9.7` 更新文档，说明 Host Bridge 是主路径，MCP 是兼容/开发工具。
- `10.8` 增加迁移测试，证明 MCP adapter 与 Host Bridge 可共存，同时 deprecated 状态下 MCP 默认关闭。

## Non-Goals

- 不删除 `zoteroMcpServer.ts`、`zoteroMcpProtocol.ts` 或现有 MCP tool suite。
- 不删除 MCP server/protocol 单元测试。
- 不重新设计 MCP tool schema。
- 不把 MCP 兼容开关暴露成普通用户设置页配置。
- 不把 Host Bridge CLI 不可用时的 fallback 改回 MCP 默认路径。
- 不在本阶段补齐所有历史测试债；`10.1`、`10.5`、`10.6` 可留到最终 hardening 阶段。

## Design Decisions

### 默认 Host Access Mode

ACP skill run 的默认 host access mode 为：

```text
host_bridge_cli
```

如果 Host Bridge CLI injection 不可用，run 记录诊断和状态，但不自动回退到 MCP：

```text
host_bridge_cli_unavailable
```

MCP 仅在显式开发/兼容路径中使用：

```text
mcp_compat_explicit
```

### MCP 兼容路径

保留现有 MCP descriptor 生成和 server 启动能力，但要求调用方显式选择兼容路径。建议先采用内部依赖/运行时选项，而不是普通用户设置项，避免用户误以为 MCP 仍是推荐主路径。

兼容路径可以用于：

- MCP server/protocol 测试。
- 开发者诊断。
- 必要时的旧 agent / backend 兼容验证。

### 面板显示策略

ACP Chat 和 ACP Skills 面板的正常 banner indicators 不再显示 MCP 指示灯。MCP 相关信息如果存在，只能出现在 diagnostics/details 中，或者通过显式开发诊断入口查看。

Host Bridge CLI 的可用性应通过已有 run state / diagnostics 表达，不新增复杂 UI 面板。

## File Change Plan

### `src/modules/acpConnectionAdapter.ts`

计划变更：

- 停止默认在 `newSession()`、`loadSession()`、`resumeSession()` 中注入 MCP descriptor。
- 将 `resolveMcpServers(stage)` 改为显式兼容路径使用，而不是默认 session 创建路径。
- 移除默认 ACP prompt 中的 `ZOTERO_MCP_PROMPT_GUIDANCE` 注入，避免 agent 同时收到 MCP 与 Host Bridge CLI 两套指令。
- 保留 MCP permission 处理逻辑，因为显式兼容路径仍可能触发 MCP write approval。
- 增加诊断事件，说明默认 MCP descriptor injection 已 deprecated，例如：

```text
kind: "mcp_compat_disabled"
message: "MCP descriptor injection is disabled by default; Host Bridge CLI is the primary host access path."
```

兼容路径：

- 允许测试或开发依赖显式开启 MCP descriptor injection。
- 显式开启时继续调用 `ensureZoteroMcpServer()`，并记录：

```text
kind: "mcp_compat_descriptor_injected"
```

### `src/modules/acpSkillRunnerOrchestrator.ts`

计划变更：

- 从正常 run preparation 中移除 `preflightRequiredMcpTools()` 调用。
- 停止在 prompt 中注入 `mcp_required_guard`。
- 保留 required MCP tools 解析函数或降级为兼容诊断，不再让它影响正常 run 的启动。
- 将 Host Bridge CLI unavailable 文案从 “continuing with migration fallback” 改为明确的不可用诊断，避免暗示会自动 fallback 到 MCP。
- 在 run state / event 中记录 host access mode：

```ts
hostAccess: {
  primary: "host_bridge_cli",
  status: "ready" | "unavailable",
  mcpCompatibility: "disabled_by_default" | "explicit"
}
```

如现有 store 类型不适合新增结构化字段，可先通过 event details 记录稳定字段。

### `addon/content/dashboard/assistant-panel-model.js`

计划变更：

- 从 ACP Chat `indicators` 中移除 `buildAcpMcpIndicator(snap)`。
- 从 ACP Skills `indicators` 中移除 `buildAcpSkillMcpIndicator(panel, run)`。
- 保留 `zotero-mcp-write` permission source 的标题处理，以兼容显式 MCP write approval。
- 可保留 MCP indicator helper 函数一轮，若无引用再删除；删除时避免触及 renderer/CSS。

### `src/modules/acpSessionManager.ts`

计划变更：

- 不再把 MCP server/health 作为正常 ACP panel status 的主信号刷新。
- 如仍需要返回 MCP diagnostics，放在 details/diagnostics 数据中，而不是主状态 surface。
- 避免正常 ACP run 期间因为 snapshot 刷新而隐式启动 MCP。

### `src/modules/acpSidebarModel.ts`

计划变更：

- 若该模型只是透传 `mcpServer` / `mcpHealth`，则配合 session manager 降级为可选 diagnostics。
- 不再为正常面板构造 MCP 主状态。

### `addon/content/acp-runtime-prompts/templates/mcp_required_guard.md`

计划变更：

- 文件保留，不删除。
- 默认 run 不再加载该模板。
- 后续如有显式 MCP compat run，可继续复用。

### 文档

计划变更：

- 更新 `artifact/host_bridge_cli_refactor_design_20260520.md` 或新增补充段落，明确 Phase 9 后：
  - Host Bridge CLI 是 ACP host access 主路径。
  - MCP 保留为兼容/开发工具。
  - MCP 默认不启动、不注入、不 preflight、不显示面板指示灯。
- OpenSpec task 勾选只在实现和验证完成后进行。

## Implementation Steps

1. 先加测试或调整现有测试，锁定 Phase 9 的稳定行为：
   - 默认 ACP session 创建不传 MCP descriptor。
   - 默认 ACP skill run 不执行 MCP preflight。
   - 默认 prompt 不包含 MCP guidance / MCP required guard。
   - ACP panel indicators 不包含 `id = "mcp"`。
   - MCP server/protocol 仍可被显式测试启动。

2. 修改 ACP connection adapter：
   - 默认 `mcpServers: []`。
   - 保留显式 compat injection 方法。
   - 增加默认禁用诊断和显式 compat 诊断。

3. 修改 ACP skill runner orchestrator：
   - 删除正常 run preparation 对 MCP preflight 的依赖。
   - 删除 prompt guard 注入。
   - 修正 Host Bridge CLI unavailable 文案。
   - 写入 host access mode 诊断。

4. 修改 dashboard panel model：
   - 移除正常 indicators 中的 MCP indicator。
   - 保留 permission source 兼容逻辑。

5. 调整 session/sidebar snapshot：
   - MCP health 降级为 diagnostics/details。
   - 确认不会因为正常 snapshot 刷新启动 MCP。

6. 更新文档和 OpenSpec tasks：
   - 补充 Phase 9 说明。
   - 实现验证完成后勾选 `9.1` 到 `9.7` 和 `10.8`。

## Acceptance Criteria

- 新 ACP skill run 默认只使用 Host Bridge CLI guidance。
- 默认 `newSession/loadSession/resumeSession` 不注入 MCP descriptor。
- 正常 ACP skill run preparation 不执行 MCP required-tools preflight。
- Host Bridge CLI 不可用时，不自动 fallback 到 MCP。
- ACP Chat / ACP Skills 正常 banner indicators 不显示 MCP 指示灯。
- MCP server/protocol 能力保留，显式测试或开发路径仍可启动。
- 迁移测试能证明：
  - Host Bridge CLI 和 MCP adapter 代码可共存。
  - MCP deprecated 状态下默认不启动、不注入、不 preflight。

## Test Plan

优先新增或调整以下测试：

- ACP prompt / session 测试：
  - 默认 prompt 不包含 `[Zotero MCP tool usage]`。
  - 默认 prompt 包含 Host Bridge CLI guidance。
  - 默认 session request 的 `mcpServers` 为空。

- ACP skill runner 测试：
  - 默认 run 不调用 `mcpPreflight` probe。
  - runner 中声明 MCP required tools 时，默认不阻塞 Host Bridge CLI 路径。
  - Host Bridge CLI unavailable 时记录结构化诊断，但不启动 MCP fallback。

- Dashboard model 测试：
  - ACP Chat indicators 不包含 MCP。
  - ACP Skills indicators 不包含 MCP。
  - MCP permission source 仍显示为 Zotero write approval。

- MCP compatibility 测试：
  - `zoteroMcpServer` / `zoteroMcpProtocol` 现有核心测试继续通过。
  - 显式 compat path 可以注入 descriptor 或启动 MCP server。

建议验证命令：

```powershell
npm run test:node:core -- --grep "mcp deprecation|host bridge|acp skill"
npm run test:node:core -- --grep "zotero mcp"
npm run build
openspec validate introduce-host-bridge-cli-interface --strict
```

如果 grep 无法覆盖相关测试，应改跑具体测试文件，例如：

```powershell
npm run test:node:core -- test/core/96-acp-session-manager.test.ts
npm run test:node:core -- test/core/101-zotero-mcp-server.test.ts
```

## Risks

- 旧 workflow 或 runner manifest 中可能仍声明 MCP required tools。Phase 9 后这些声明不能再阻塞默认 Host Bridge CLI run，但需要留下清晰诊断，避免用户误以为 MCP 工具仍会默认可用。
- 面板 snapshot 里可能还有历史 MCP health 字段。实现时要区分“数据仍可用于 diagnostics”和“正常 surface 不展示”。
- 测试中存在真实 MCP integration case，应避免把兼容测试误删。目标是改默认路径，不是破坏 MCP adapter。

## Out Of Phase

以下事项留到最终 hardening 或后续阶段：

- 补齐全部 Host Bridge auth / manifest / capability call 测试债。
- 补齐 CLI command mapping、help、stdout/stderr hygiene 的系统性测试。
- 补齐 agent injection PATH/profile/token/README/prompt 的完整测试矩阵。
- 设计用户可见的 MCP developer diagnostics UI。
