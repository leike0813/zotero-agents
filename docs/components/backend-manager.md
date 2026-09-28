# Backend Manager

`openBackendManagerDialog()` 由 `src/modules/workflow/settings/backendManager.ts` 持有。宿主创建 Zotero 对话框及 iframe，并通过 `src/shared/dashboardWireContract.ts` 的消息契约与 `src/dashboard/backendManagerApp.ts` 通信。页面各区域是 `src/dashboard/components/BackendManagerRegion.tsx` 的 Preact 组件；`addon/content/dashboard/backend-manager.js` 是构建产物。

## 两条配置路径

| 页面 | 数据来源 | 保存动作 |
| --- | --- | --- |
| ACP、SkillRunner、Generic HTTP | `BackendInstance` 行，来自 `backendsConfigJson` | `save` 汇总和校验全部 Backend Profile 行，再调用 `persistBackendsConfig()` |
| 内置 Agent | 独立的 `builtinAgent` snapshot，来自 Pi 模型 Provider 配置、脱敏凭据元数据及 Pi 模型目录 | `pi-*` 动作单独保存配置、默认值或刷新目录；不传入 Backend Profile 行 |

现有三个 Backend Profile 页保留原有 ACP 预设、Generic HTTP 预设、SkillRunner 管理入口、连接探测及行级校验。托管本地 SkillRunner 行继续隐藏，保存其他行时保留。

## 内置 Agent 页面

此页维护多份 Pi 模型 Provider 配置。用户可选择目录 provider 和模型、显式认证类型、凭据引用、reasoning、可选自定义端点及 API dialect；配置与凭据删除互不级联。页面显示配置与目录状态、已保存凭据的脱敏元数据，并提供全局、Pi Conversation、Pi Skill Run 默认项和 `models.yml` 的只读导入/刷新。模型候选按 provider 查询，一次最多返回 100 条，避免把完整目录投影进页面。

C04 在此页提供 API key 的录入、替换和清除。密码输入框在提交时立即清空，宿主只把密钥交给加密凭据库；页面快照仍只有掩码元数据。用户可对已保存配置手动发起一次短连接测试，结果只显示脱敏状态码，不保存测试会话。OpenAI Codex 的连接流程由 C05 接入。配置允许不完整地保存，但禁用、缺少匹配类型的凭据或目录中不存在的模型不能成为可运行默认项。

Pi 模型目录由 `src/modules/piModelCatalog.ts` 持有，仅读取固定的静态 catalog 和只读 `models.yml`；有效 overlay 经白名单归一化后缓存。配置选择由 `src/modules/piProviderConfiguration.ts` 持有，凭据封装由 `src/modules/piCredentialStore.ts` 持有。共享 DTO 在 `src/shared/piProviderContract.ts`，页面不导入宿主模块。Pi 密文及脱敏元数据存在 profile 偏好中，加密密钥使用现有插件状态库的 `plugin_meta`，不依赖 Host Bridge token。

`src/modules/piApiKeyProviderExecution.ts` 把已解析的选择快照投影给原生 Pi stream adapter，逐次读取指定的加密凭据。自定义本地端点须由调用方先提供 Local Network 授权；缺失时调用在发出请求前失败。模型流只向 `PiRuntime` 传递文本增量或结构化失败码，不把原始响应正文、请求头或异常传到 UI。此切片尚未把模型源接入 Pi Conversation 或 Skill Run owner。

## 验证入口

- `tests/dashboard/251-dashboard-backend-manager.test.ts`：页面动作、区域身份和三个原有页的行为。
- `tests/runtime/57-backend-manager-risk-regression.test.ts`：Backend Profile 既有保存及副作用边界。
- `tests/runtime/242-pi-provider-configuration.test.ts` 至 `244-pi-credential-store.test.ts`：Pi 选择、目录、凭据行为。
- `tests/runtime/246-pi-api-key-provider-execution.test.ts`、`tests/tooling/246-pi-provider-env-guard.test.ts`：模型流、脱敏失败和浏览器构建边界。
- `tests/zotero/core/lite/278-pi-provider-configuration.zotero.test.ts` 与 `tests/zotero/ui/lite/278-pi-provider-configuration.zotero.test.ts`：真实宿主边界。
- `tests/zotero/core/lite/280-pi-api-key-provider-execution.zotero.test.ts`：真实 Zotero 中使用确定性响应夹具执行原生 Provider 路径。
