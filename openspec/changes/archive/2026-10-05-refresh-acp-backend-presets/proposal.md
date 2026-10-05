# Proposal

## Why

ACP 预设仍包含旧的启动参数和缺失的配置目录规则，用户也无法直接选择一批已有明确 ACP 入口的 Agent。依据 agent-harness-wiki 的 2026-10-04 发布数据及上游文档、npm 发布物，更新模板能减少手工配置错误。

## What Changes

- 更新 Gemini、Qwen、Qoder 的启动元数据，为 Qwen、Copilot、Cline、CodeBuddy、Grok 补充配置目录隔离规则。
- 新增 Cursor 原生 ACP、Kimi Code、MiniMax Code、Mistral Vibe、OpenHands、DeepSeek Harness、Factory Droid、Goose、Junie、Kiro CLI、Pi ACP、Amp ACP、Oh My Pi，共 13 项，使目录达到 28 项。
- 明确原生入口与适配器的安装前提、npx 默认值及隔离范围；MiniMax 显式选择 npm 包中的 mcode 可执行入口。
- 同步开发文档、站点八种翻译和生成的内嵌帮助文档，保留现有实机验证范围。
- 更新仅作用于创建模板，不迁移或覆盖已保存后端配置。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `backend-manager-ui`: 扩充 ACP 预设目录，更新 npx 默认选项和启动、隔离元数据契约，保持已有后端配置独立于预设更新。

## Impact

- 预设事实源 `src/modules/acp/chat/acpBackendPresets.ts` 及其 ID 类型。
- 现有 Backend Manager、Dashboard 预览和 npx 缓存公共接口测试。
- ACP 开发文档、站点文档及生成帮助文档。
- 不扩展生产 DTO、启动缓存解析器或 UI，不安装依赖，不提交代码，不修改已有用户配置。
