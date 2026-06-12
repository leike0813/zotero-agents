# Backend Manager

## Overview

`src/modules/backendManager.ts` 是插件的后端连接管理入口。提供 CRUD 对话框管理三种 provider 类型的后端配置（BackendInstance），协调持久化、UI 刷新和副作用清理。

配套文档：
- `doc/components/providers.md` — Provider 系统总览
- `doc/components/acp-backend-presets.md` — ACP 预设集成

## 架构定位

```
Backend Manager Dialog
├── 读取: loadBackendsRegistry()  ← backendsConfigJson (Zotero pref)
├── 渲染: 三大 Provider 分区表格
├── 校验: collectBackendsFromDialog()
├── 保存: persistBackendsConfig() → setPref() + side effects
└── 删除: 清理 session sync / reconcile / health tracking / ACP slots
```

## Dialog 生命周期

### 防止重复打开

```typescript
export async function openBackendManagerDialog(args?: { window?: Window }) {
  if (isWindowAlive(managerDialog?.window)) {
    managerDialog?.window?.focus();  // 复用已有窗口
    return;
  }
  // ... 创建新 Dialog
}
```

### 打开流程

1. `loadBackendsRegistry()` — 从 `backendsConfigJson` 偏好加载现有配置
2. 构建初始行数据（过滤掉 managed-local backend）
3. 打开 `ztoolkit.Dialog`：
   - `loadCallback`：渲染三大 provider 分区 → 填充行 → 绑定 Add / Add from Preset / 行操作按钮
   - `unloadCallback`：清除 `beforeunload` 监听器
4. 用户编辑后点击 Save：
   - `collectBackendsFromDialog()` 收集所有行
   - `persistBackendsConfig()` 写入偏好 + 副作用
5. 用户点击 Close 或 ESC → `confirmBackendManagerClose()` 检测未保存变更

### 未保存变更检测

对话打开时计算当前配置的 JSON draft signature (`computeBackendManagerDraftSignature`)。关闭时重新计算签名，有差异则安装 `beforeunload` 监听器阻止意外关闭。

## UI 设计

### Provider 分区

三种 provider 类型各有独立的表格分区和操作列：

| 类型 | 操作 | 说明 |
|------|------|------|
| `skillrunner` | manage-ui, refresh-model-cache, remove | 本地/远程 SkillRunner 实例 |
| `acp` | refresh-acp-runtime-options, remove | Agent Communication Protocol 后端 |
| `generic-http` | remove | 通用 HTTP 端点 |

### 行编辑

- 新增：点击 `Add` 按钮 → 插入空行模板 → 用户填写字段
- ACP Presets：`Add from Preset` 下拉 → `createAcpBackendFromPreset()` 预填模板行
- 行标识：`data-zs-backend-internal-id`（新增行自动生成 `generateBackendInternalId()`）
- ACP 元数据：`data-zs-backend-acp` 属性存储完整 JSON

### Dialog Data

```typescript
type BackendManagerDialogData = {
  _allowBackendManagerClose?: boolean;
  _initialBackendDraftSignature?: string;
  _lastButtonId?: string;
  _nativeBeforeUnloadListener?: (event: BeforeUnloadEvent) => void;
};
```

## 校验规则

`collectBackendsFromDialog(doc)` 在保存时逐行校验：

| 字段 | 规则 | 错误处理 |
|------|------|---------|
| displayName | 非空 | 弹窗提示并 focus 该行 |
| type | 必须在 `PROVIDER_SECTIONS` 中 | 跳过该行 |
| internalId | 在对话框内唯一（`seen` Set 去重） | 跳过该行 |
| baseUrl（非 ACP） | 必须是 `http://` 或 `https://` URL | 跳过该行 |
| bearer auth token | 类型为 bearer 时非空 | 跳过该行 |
| acp.command（ACP） | 非空 | 跳过该行 |
| timeoutMs | 正有限数（默认留空 = 无超时） | 跳过该行 |
| 配置 fingerprint（ACP） | 比对缓存 fingerprint 检测 drift | 标记为 stale 连接 |

## 持久化与副作用

### persistBackendsConfig()

```typescript
function persistBackendsConfig(
  backends: BackendInstance[],
  deps?: Partial<BackendPersistenceDeps>,
): void
```

执行顺序：

1. **Managed-local backend 注入** — 确保 `MANAGED_LOCAL_BACKEND_ID`（SkillRunner 本地运行时）始终在列表中
2. **偏好写入** — `setPref("backendsConfigJson", JSON.stringify(document))`
3. **Reference state 同步** — `syncBackendReferenceState(backends, existing)` 跟踪新增/删除
4. **Workflow 菜单刷新** — `refreshWorkflowMenus()`
5. **Model cache 后台刷新** — 对新增的 skillrunner 后端调用 `refreshSkillRunnerModelCacheForBackend()`
6. **ACP 会话槽修剪** — `pruneAcpSessionSlotsForBackends()`

### 后端删除时清理

| 清理目标 | 函数 | 说明 |
|---------|------|------|
| 会话同步 | `stopSessionSync()` | 停止后端 session sync |
| Reconcile 状态 | `purgeSkillRunnerBackendReconcileState()` | 清除 task reconciler 数据 |
| 健康追踪 | `untrackSkillRunnerBackendHealth()` | 取消健康注册 |
| ACP 会话槽 | `pruneAcpSessionSlotsForBackends()` | 修剪已删除的 ACP slot |

## 行操作

### getBackendRowActionKindsForType()

根据后端类型确定可用的行操作按钮：

### launchSkillRunnerManagementFromRow()

从行数据解析 `SkillRunnerManagementLaunchPayload`（backendId, baseUrl, uiUrl），打开管理 UI。

### refreshSkillRunnerModelCacheFromRow()

对指定 skillrunner 后端刷新模型缓存。

### refreshAcpRuntimeOptionsFromRow()

对指定 ACP 后端重新探测 runtime options（模型列表、模式等），更新配置 fingerprint。

### persistAcpBackendProbeResultFromRow()

将 ACP 探测结果持久化到配置中。

## 依赖注入与可测试性

```typescript
type BackendPersistenceDeps = {
  setPref: typeof setPref;
  refreshWorkflowMenus: typeof refreshWorkflowMenus;
  refreshModelCache: typeof refreshSkillRunnerModelCacheForBackend;
};
```

| 函数 | 注入 | 默认值 | 测试方式 |
|------|------|--------|---------|
| `persistBackendsConfig(backends, deps?)` | `Partial<BackendPersistenceDeps>` | `defaultBackendPersistenceDeps` | 注入假 setPref/menus/cache |
| `launchSkillRunnerManagementFromRow({ openDialog? })` | `openDialog` | `openZoteroSkillsWorkspaceTab(...)` | 注入不依赖 UI 的 handler |
| `refreshSkillRunnerModelCacheFromRow({ refresh? })` | `refresh` | `refreshSkillRunnerModelCacheForBackend` | 注入 mock refresh |
| `refreshAcpRuntimeOptionsFromRow({ probe? })` | `probe` | `probeAcpBackendRuntimeOptions` | 注入 mock probe |

**不受注入支持的函数**：
- `openBackendManagerDialog()` — 直接使用 `addon.data.dialog`、`ztoolkit.Dialog`、`loadBackendsRegistry`，需要 mock globals
- `collectBackendsFromDialog()` — 操作真实 DOM，可用 JSDOM 测试
