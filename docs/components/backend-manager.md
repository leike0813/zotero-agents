# Backend Manager

`openBackendManagerDialog()` 由 `src/modules/workflow/settings/backendManager.ts` 持有。宿主创建 Zotero 对话框及 iframe，并通过 `src/shared/dashboardWireContract.ts` 的消息契约与 `src/dashboard/backendManagerApp.ts` 通信。页面各区域是 `src/dashboard/components/BackendManagerRegion.tsx` 的 Preact 组件；`src/dashboard/backendManagerRenderer.ts` 为每个区域建立独立挂载点，因此重渲染一个区域不会清空或重建其它区域。

## 两条路径

| 页面                           | 数据来源                                            | 保存动作                                                                   |
| ------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------- |
| ACP、SkillRunner、Generic HTTP | `BackendInstance` 行，来自 `backendsConfigJson`       | `save` 汇总和校验全部 Backend Profile 行，再调用 `persistBackendsConfig()` |
| 内置 Agent                     | 固定的后端注册表事实，无动态订阅                    | 无保存动作；`open-zotero-agent-settings` 打开独立设置窗口                 |

三个 Backend Profile 页保留原有 ACP 预设、Generic HTTP 预设、SkillRunner 管理入口、连接探测及行级校验。托管本地 SkillRunner 行继续隐藏，保存其他行时保留。

## 内置 Agent 摘要

内置 Agent 是一个合成后端，由 `src/backends/registry.ts` 在加载时提供，不从 `backendsConfigJson` 读取可编辑字段或凭据。页面第四个页签只显示 `BackendManagerBuiltinAgentSnapshot`：后端 ID、类型、显示名和合成目标 `local://builtin-pi`。这份摘要不携带连接、模型、凭据、认证、MCP、搜索或维护状态，宿主也不订阅目录或认证生命周期。

唯一的内置 Agent 动作是 `open-zotero-agent-settings`。宿主以惰性 `import("./zoteroAgentSettings")` 打开或聚焦独立窗口；窗口自身拥有草稿、请求世代和订阅，关闭 Backend Manager 不影响它。启动设置不会读取、保存或丢弃 Backend Profile 草稿，两个窗口可以同时存在，重复打开只聚焦而不重置草稿。

连接、模型配置、凭据录入、ChatGPT 注册、MCP 工具源、Web 搜索源、目录与诊断导出的配置入口都在该独立窗口内，详见 `docs/components/zotero-agent-settings.md`。Backend Manager 不再实现这些动作的转发、快照投影或表单。

## 窗口生命周期

Backend Manager 的 `unloadCallback` 只解除消息监听、清理 frame 引用并卸载 beforeunload 提示。内置 Agent 设置窗口的清理由 `closeZoteroAgentSettings()` 负责，并接入 `src/hooks.ts` 的统一 shutdown 步骤 `zotero-agent-settings-window-close`，而不是跟随 Backend Manager 关闭。

## 验证入口

- `tests/dashboard/251-dashboard-backend-manager.test.ts`：固定摘要与启动动作、三个原有页的行为及区域身份。
- `tests/runtime/57-backend-manager-risk-regression.test.ts`：Backend Profile 既有保存及副作用边界。
- `tests/zotero/ui/lite/278-pi-provider-configuration.zotero.test.ts`：真实宿主中的摘要、启动与首选项直达路由。
- `tests/runtime/292-zotero-agent-settings-host.test.ts`：独立窗口的准入、请求身份与释放。
