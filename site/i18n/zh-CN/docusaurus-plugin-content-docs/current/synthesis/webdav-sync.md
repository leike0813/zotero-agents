# WebDAV 同步

## 概述

WebDAV 同步是 Synthesis Workbench 的跨设备同步方案，用于**替代已弃用的 Git 同步**。它通过 WebDAV 协议将 Canonical Store 中的持久化状态快照（deterministic durable-state bundles）同步到远程服务器。

适配任意 WebDAV 服务（Nextcloud、ownCloud、Synology 等），无需 Git。

## 前置条件

- 可访问的 WebDAV 服务器
- WebDAV 凭据（用户名 + 密码或应用专用令牌）

## 配置

在 Zotero 偏好设置中配置：

Zotero → 设置 → Zotero Agents → WebDAV Sync

| 设置项 | 类型 | 默认值 | 说明 |
|-------|------|--------|------|
| **启用 WebDAV 同步** | boolean | `false` | 主开关 |
| **Base URL** | string | `""` | WebDAV 服务器地址，如 `https://nextcloud.example.com/remote.php/dav/files/user/` |
| **远程路径** | string | `"zotero-agents"` | 远程目录路径 |
| **用户名** | string | `""` | WebDAV 用户名（可选） |
| **密码/令牌** | encrypted | `""` | 密码或应用专用令牌（AES-256-GCM 加密存储） |
| **自动同步** | boolean | `false` | 每次 Synthesis 变更后自动触发同步 |
| **自动重试** | boolean | `false` | 网络错误时自动重试 |

操作按钮：

- **Save Settings**：保存非凭据设置
- **Save Credential**：加密并存储密码/令牌
- **Test Connection**：发送 PROPFIND 验证连通性

## 远程文件布局

```
<remotePath>/
├── HEAD.json                           # 当前快照指针
└── snapshots/
    └── <snapshotId>/
        ├── manifest.json               # 持久化包清单
        └── bundles/                    # 确定性持久化包文件
```

**HEAD.json** 包含 `snapshot_id`、`manifest_hash`、`updated_at`、`producer_version`。快照在上传完成后才更新 HEAD，异常中断不会破坏远程一致性。

## 同步范围

| 同步 | 不同步 |
|------|--------|
| Topics（主题综合） | SQLite 运行时数据库 |
| Concepts（概念、义项、别名、关系） | 运行时日志 |
| Topic Graph（主题图谱） | 工作区文件 |
| References（引文绑定、重定向） | 队列和锁状态 |
| Reviews（审核项） | 可重建投影（引用布局、指标、缓存） |
| Tags（受控词表） | 凭据 |
| Related Items（关联条目） | 临时文件 |

## 同步流程

```
idle → queued → syncing → idle
                 ├── blocked_conflict（需手动解决）
                 └── failed_retryable / failed_permanent
```

| 步骤 | 说明 |
|------|------|
| 1. HEAD | 读取远程 HEAD.json |
| 2. Download | 若有新快照，下载 manifest + bundles |
| 3. Preview | 验证导入，比对实体哈希 |
| 4. Conflict Check | 检查双边变更冲突 |
| 5. Apply | 导入远程快照到本地 Canonical Store |
| 6. Export | 导出当前本地状态为 bundles |
| 7. Upload | 上传 manifest + bundles |
| 8. HEAD Update | 最后更新 HEAD.json（使用 ETag/If-Match 防并发覆盖） |

## 冲突处理

冲突检测基于实体哈希比对。当同一实体在本地和远程均有变更时触发。

**冲突类型：**

- 同一实体双边修改
- 更新 vs. tombstone 冲突
- 审核项分歧
- 引文绑定/重定向目标分歧

**解决方式：**

| 操作 | 说明 |
|------|------|
| `keep_local` | 保留本地状态，关闭冲突门，排队下次导出 |
| `clear_after_manual_edit` | 手动解决后重新校验，通过后清除冲突标记 |

Workbench Home 页面的同步面板显示冲突详情和操作按钮。

## 安全

- **凭据加密**：AES-256-GCM，密钥由 Host Bridge master token 派生（PBKDF2-SHA256，100,000 迭代）
- **明文不返回**：保存后凭据原文不可读取
- **URL 脱敏**：日志中自动剥离凭据
- **HTTP Basic Auth**：传输层使用标准 Basic 认证

## 限制

| 限制 | 说明 |
|------|------|
| **手动默认为主** | 自动同步和自动重试默认关闭 |
| **无压缩** | v1 快照为原始 JSON 包 |
| **不清理旧快照** | 远程快照累积，需手动清理 |
| **无字段级合并** | 冲突为整个实体级别 |
| **单设备假设** | 多设备同时写入可能引发冲突 |

## 下一步

- [Home 仪表板](home) — 查看同步状态面板
- [偏好设置](../preferences) — 配置 WebDAV 同步参数
- [Git 同步](git-sync)（已弃用） — 历史参考
