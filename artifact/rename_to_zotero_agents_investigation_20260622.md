# 插件改名调查：zotero-skills → zotero-agents

**调查日期**：2026-06-22
**调查目的**：评估将插件名称从 "zotero-skills" 改为 "zotero-agents" 所需的改动范围和风险

---

## 一、当前插件身份标识

### package.json config 字段

| 字段 | 当前值 | 建议新值 |
|------|--------|----------|
| `name` | `zotero-skills` | `zotero-agents` |
| `addonName` | `Zotero Skills` | `Zotero Agents` |
| `addonID` | `zotero-skills@leike0813@gmail.com` | `zotero-agents@leike0813@gmail.com` |
| `addonRef` | `zotero-skills` | `zotero-agents` |
| `addonInstance` | `ZoteroSkills` | `ZoteroAgents` |
| `prefsPrefix` | `extensions.zotero.zotero-skills` | `extensions.zotero.zotero-agents` |

---

## 二、改动量统计

### 按目录分布

| 区域 | 文件数 | 匹配数 | 是否必须改 |
|------|--------|--------|-----------|
| **src/ (源码)** | ~36 | ~100 | **必须** |
| **addon/ (locale/css/xhtml)** | ~12 | ~30 | **必须** |
| **test/ (测试)** | ~37 | ~200 | **必须** |
| **package.json** | 1 | 6 | **必须** |
| **workflows_builtin/** | ~8 | ~15 | **必须** |
| **skills_builtin/ + skills_src/** | ~15 | ~30 | **必须** |
| **scripts/** | ~6 | ~10 | **必须** |
| **cli/ (Rust CLI)** | 2 | ~5 | **必须** |
| **site/ (文档站)** | ~43 | ~80 | 建议改 |
| **doc/ + README\*.md** | ~10 | ~25 | 建议改 |
| **openspec/specs/ (活跃spec)** | ~3 | ~5 | 建议改 |
| **openspec/changes/archive/** | ~30 | ~40 | **可跳过**（历史归档） |
| **deprecated/** | ~10 | ~15 | **可跳过**（已废弃） |
| **artifact/** | ~5 | ~430 | **可跳过**（归档） |
| **.gitignore** | 1 | 1 | **必须** |

### 总计

- **必须改动**: ~120 个文件，~400 处匹配（排除 deprecated/artifact/archive）
- **建议改动**: ~50 个文件，~110 处匹配（文档站、README、活跃 spec）
- **可跳过**: ~45 个文件，~490 处匹配（历史归档/已废弃代码）

---

## 三、关键改动点（按风险排序）

### P0 - 最高风险

#### 1. prefsPrefix 变更 — 用户数据丢失

**问题**：现有用户的所有偏好设置（`extensions.zotero.zotero-skills.*`）会全部丢失。

**硬编码位置**：

- `src/modules/runtimePersistence.ts:165`
  ```typescript
  const PLUGIN_PREFS_PREFIX = "extensions.zotero.zotero-skills";
  ```
- `scripts/run-zotero-direct.ts:35`
  ```typescript
  const PREFS_PREFIX = "extensions.zotero.zotero-skills";
  ```
- `workflows_builtin/literature-workbench-package/lib/model.mjs:1`
  ```javascript
  export const DEFAULT_PREFS_PREFIX = "extensions.zotero.zotero-skills";
  ```
- `workflows_builtin/literature-workbench-package/lib/runtime.mjs:211,217`
- `src/workflows/hostApi.ts:83`（作为 fallback）
- `src/modules/synthesis/service.ts:20687`（偏好键名）
- `scripts/ui-harness-serve.ts:706`
- `test/core/108-runtime-persistence-governance.test.ts:218`
- `test/ui/156-ui-readonly-harness.test.ts:226-244`
- `test/core/159-run-zotero-direct-runtime-root.test.ts:95`
- `test/node/core/97-zotero-mock-isolation.test.ts:28,35`

**解决方案**：需要编写用户数据迁移脚本，在插件启动时检测旧偏好并迁移到新前缀。

#### 2. addonID 变更 — 插件身份断裂

**问题**：Zotero 会将新旧插件视为两个完全不同的插件，用户需要卸载旧装新。

**影响**：

- 现有用户无法通过自动更新升级
- 需要手动卸载旧版本、安装新版本
- 用户数据（偏好设置、本地数据库）不会自动迁移

---

### P1 - 高风险

#### 3. resource:// 协议路径硬编码

**问题**：`resource://zotero-skills/...` 变为 `resource://zotero-agents/...`，影响模块路径解析。

**硬编码位置**：

- `test/core/139-host-bridge-cli-packaging.test.ts:355-369`
  ```typescript
  "resource://zotero-skills/"
  "C:\\Users\\A\\Zotero\\Profiles\\p\\extensions\\zotero-skills"
  "resource://zotero-skills/bin/win32-x64/zotero-bridge.exe"
  ```
- `cli/zotero-bridge/src/args.rs` 中解析路径

**影响**：Host Bridge CLI 路径解析失败，无法定位插件资源。

#### 4. JavaScript 全局对象 + 事件名

**问题**：跨文件硬编码的全局对象和事件名。

**全局对象**：

- `window.ZoteroSkillsTheme` — 主题 API
  - `src/workspaceApp.ts`
  - `addon/content/shared/theme.js`
  - `skills_builtin/literature-deep-reading/renderer/templates/citation-graph-synthesis-theme.js`
- `window.ZoteroSkillsCitationGraph` — 引文图渲染器
  - `src/shared/citationGraphStandalone.ts`
  - `skills_src/literature-deep-reading/renderer/templates/citation-graph-standalone.js`
- `window.ZoteroSkillsTopicTimeline` — 时间线渲染器
  - `src/shared/topicTimelineStandalone.ts`
  - `skills_src/literature-deep-reading/renderer/templates/topic-timeline-shared.js`
- `window.__ZoteroSkillsDeepReadingCitationGraphAssets` — 资源注入
  - `skills_builtin/literature-deep-reading/renderer/templates/deep-reading.js`
  - `skills_src/literature-deep-reading/renderer/templates/deep-reading.js`

**事件名**：

- `zotero-skills-theme-change` — 主题切换事件
  - `addon/content/shared/theme.js`
  - `skills_builtin/.../citation-graph-synthesis-theme.js`
  - `skills_src/.../citation-graph-synthesis-theme.js`

**localStorage key**：

- `zotero-skills.theme` — 主题持久化
  - `skills_builtin/.../citation-graph-synthesis-theme.js`
  - `skills_src/.../citation-graph-synthesis-theme.js`

**影响**：主题切换、图表渲染器失效。

#### 5. chrome:// 协议路径

**问题**：资源加载路径依赖 `addonRef`。

**代码示例**：

```typescript
// src/utils/ztoolkit.ts
const pluginToastIconURI = `chrome://${config.addonRef}/content/icons/favicon.png`;

// src/modules/workspaceTab.ts
const WORKSPACE_TAB_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_workbench_32.png`;
```

**影响**：图标、HTML 页面加载失败。

---

### P2 - 中风险

#### 6. CSS 类名 / Tab ID 硬编码

**CSS 类名**：

- `.icon-zotero-skills-workspace` — `addon/content/zoteroPane.css`
  ```css
  .icon-css.icon-zotero-skills-workspace,
  .icon-css.icon-item-type[data-item-type="zotero-skills-workspace"],
  .tab-icon.icon-item-type[data-item-type="zotero-skills-workspace"] { ... }
  ```

**Tab ID/kind**：

- `zotero-skills-workspace` — `src/modules/workspaceTab.ts`
- `zotero-skills-synthesis-workbench` — `src/modules/synthesisWorkbenchTab.ts`
- `zotero-skills-synthesis-workbench-embedded` — `src/modules/synthesisWorkbenchTab.ts`

**影响**：UI 样式丢失、Tab 管理异常。

#### 7. esbuild global-name

**问题**：构建脚本中的全局变量名。

**位置**：`scripts/build-literature-deep-reading-graph-renderer.ts:72,96`

```typescript
"--global-name=ZoteroSkillsCitationGraphBundle"
"--global-name=ZoteroSkillsTopicTimelineBundle"
```

**影响**：构建产物变量名不匹配，运行时无法访问。

#### 8. Rust CLI 品牌描述

**位置**：

- `cli/zotero-bridge/Cargo.toml:5`
  ```toml
  description = "Agent-first CLI for the Zotero Skills Host Bridge"
  ```
- `cli/zotero-bridge/src/args.rs:9-10,28,46`
  ```rust
  about = "Agent-first CLI for Zotero Skills Host Bridge"
  long_about = "Call the Zotero Skills Host Bridge over local HTTP JSON..."
  ```

**影响**：品牌描述不一致（功能不受影响）。

#### 9. Python 运行时硬编码

**位置**：`skills_builtin/literature-deep-reading/scripts/deep_reading_runtime.py`

```python
"renderer": "zotero-skills-citation-graph-standalone"
"window.__ZoteroSkillsDeepReadingCitationGraphAssets="
```

**影响**：Python 运行时无法正确识别渲染器。

#### 10. 内置 workflow 包的 kind 标识符

**位置**：

- `workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs`
  ```javascript
  kind: "zotero-skills-workbench-note-payload"
  ```
- `workflows_builtin/literature-workbench-package/lib/digestPayload.mjs`
- `workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs`
  ```javascript
  return joinPath(tempPath, "zotero-skills", "tag-regulator");
  ```

**影响**：数据格式识别失败。

---

### P3 - 低风险

#### 11. 数据库文件名 / 临时目录

**数据库文件**：

- `zotero-skills.db` — 状态数据库
  - `scripts/migrate-persistence-governance.mjs`
    ```javascript
    path.join(oldRoot, "state", "zotero-skills.db")
    path.join(oldRoot, "runtime", "state", "zotero-skills.db")
    ```

**隐藏目录**：

- `.zotero-skills-runtime/` — `.gitignore`

**临时目录**：

- `mkTempDir("zotero-skills-...")` — 测试临时目录（37 个测试文件）

**影响**：功能不受影响，仅命名一致性。

#### 12. resolveAddonRef fallback 值

**位置**：

- `src/modules/workflowExecution/messageFormatter.ts`
- `src/modules/builtinWorkflowSync.ts`
- `src/modules/acpSkillPatchTemplates.ts`
- `src/modules/acpRuntimePromptTemplates.ts`

**代码示例**：

```typescript
const addonRef = resolveAddonRef("zotero-skills");
```

**影响**：作为 fallback，正常情况下不会触发。

---

## 四、已有 "zotero-agents" 痕迹

项目中已有部分地方使用了新名字：

- `addon/prefs.js:42`
  ```javascript
  pref("synthesisWebDavSyncRemotePath", "zotero-agents");
  ```

这说明改名可能已经在部分场景下被考虑过。

---

## 五、动态配置 vs 硬编码混用

### 理想情况

大部分代码通过 `config.addonRef`、`config.addonInstance`、`config.prefsPrefix` 动态访问，改 `package.json` 即可生效。

### 实际情况

大量关键位置**硬编码**了这些值，形成"双轨制"：

1. **构建系统硬编码** (`zotero-plugin.config.ts`)
   - `namespace: pkg.config.addonRef` → 决定 `resource://` 协议前缀
   - `outfile: .../${pkg.config.addonRef}.js` → 输出文件名
   - `waitForPlugin: () => Zotero.${pkg.config.addonInstance}...` → 测试启动等待条件

2. **协议路径硬编码**
   - `chrome://${config.addonRef}/...` — 资源加载
   - `resource://zotero-skills/...` — 模块路径（硬编码在测试和 CLI 中）

3. **JavaScript 全局对象**（跨文件硬编码）
   - `window.ZoteroSkillsTheme`
   - `window.ZoteroSkillsCitationGraph`
   - `window.ZoteroSkillsTopicTimeline`

4. **事件名硬编码**
   - `zotero-skills-theme-change`

5. **prefsPrefix 硬编码**（最高风险）
   - 多处直接写死 `extensions.zotero.zotero-skills`

---

## 六、风险总结

| 风险等级 | 改动点 | 影响 |
|---------|--------|------|
| **P0** | `prefsPrefix` 硬编码 | 现有用户偏好设置全部丢失，需写迁移脚本 |
| **P0** | `addonID` 变更 | Zotero 视为全新插件，用户需卸载旧装新 |
| **P1** | `resource://` 路径硬编码 | Host Bridge CLI 路径解析失败 |
| **P1** | JS 全局对象 + 事件名 | 主题切换、图表渲染器失效 |
| **P1** | `chrome://` 路径 | 图标、HTML 页面加载失败 |
| **P2** | CSS 类名 / Tab ID | UI 样式丢失、Tab 管理异常 |
| **P2** | esbuild global-name | 构建产物变量名不匹配 |
| **P2** | Rust CLI 帮助文本 | 品牌描述不一致（功能不受影响） |
| **P3** | 测试中的临时目录名 | 功能不受影响，仅命名一致性 |
| **P3** | 文档站 / README | 仅文字描述 |

---

## 七、结论

**改动规模**：

- **必须改动**：~120 个文件，~400 处（排除 deprecated/artifact/archive）
- **其中硬编码**：~50 处关键硬编码，无法仅靠改 `package.json` 解决
- **核心风险**：`prefsPrefix` 迁移（用户数据兼容性）和 `addonID` 变更（插件身份断裂）

**改动性质**：

不是简单的全局替换，需要处理：

1. 动态配置与硬编码的对齐
2. 跨语言（TS/JS/Rust/Python）的一致性
3. 构建系统（esbuild）的 global-name
4. 协议路径（`chrome://`、`resource://`）
5. 用户数据迁移逻辑

**建议**：

- 这是一个**大型重构**，建议在独立的分支上进行
- 需要充分的测试和用户沟通
- 考虑是否需要保留旧插件 ID 的兼容性（如提供过渡期）
