# 打包与部署

Workflow 支持两种形式：**单 workflow** 和 **多 workflow 包**。单 workflow 适合简单场景，多 workflow 包适合有共享代码的工作流集合。

## 单 Workflow

最简单的形式，一个目录包含一个 `workflow.json` 及其 Hook 脚本：

```
my-workflow/
├── workflow.json
└── hooks/
    ├── filterInputs.mjs
    └── applyResult.mjs
```

单 workflow 没有 `packageId`，Hook 脚本之间不能通过相对导入共享代码。

## 多 Workflow 包

当多个 workflow 共享逻辑时，可以组织为 package：

```
my-package/
├── workflow-package.json       # 包清单
├── lib/                        # 共享代码
│   └── runtime.mjs
│   └── util.mjs
├── workflow-a/
│   ├── workflow.json
│   └── hooks/
│       ├── filterInputs.mjs
│       └── applyResult.mjs
├── workflow-b/
│   ├── workflow.json
│   └── hooks/
│       └── applyResult.mjs
└── locales/                    # 包级本地化文件
    ├── zh-CN.json
    └── ja-JP.json
```

### workflow-package.json

```json
{
  "id": "my-package",
  "version": "1.0.0",
  "workflows": [
    "workflow-a/workflow.json",
    "workflow-b/workflow.json"
  ],
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

### 包内共享代码

Package 中的 Hook 脚本可以通过相对路径导入 `lib/` 中的共享模块：

```js
// workflow-a/hooks/applyResult.mjs
import { processResult } from "../../lib/util.mjs";

export async function applyResult({ parent, bundleReader, runtime }) {
  return processResult({ parent, bundleReader, runtime });
}
```

```js
// lib/util.mjs
export function processResult({ parent, bundleReader, runtime }) {
  // 共享的处理逻辑
}
```

注意：Hook 脚本以 ES Module 方式执行，支持 `import` 语句，但导入路径必须相对于 Hook 文件本身。

## 部署方式

### 用户 workflow 目录

将 workflow 目录放到 Zotero 偏好设置中配置的 **Workflow Directory** 下。Workflow Manager 会自动扫描该目录（包括子目录），发现所有 `workflow.json`。

配置位置：Zotero → 设置 → Zotero Agents → Workflow Directory。

### 目录扫描规则

- Workflow Manager 会**递归扫描** workflow 目录及其子目录
- 找到 `workflow.json` 即注册为一个 workflow
- 如果在 package 目录内找到 `workflow-package.json`，则按 package 的方式加载子 workflow
- 如果 workflow 目录不存在或没有有效 workflow，Workflow Manager 会报告警告但不影响插件运行

### 与其他 format 的兼容

| 存放位置 | 可见性 | 说明 |
|---------|--------|------|
| 官方 Workflow 包 `content/official/workflows/` | 所有用户 | 通过 Content Feed 独立安装，用户不可直接修改 |
| 用户 Workflow Directory | 当前用户 | 可自由添加/修改/删除 |
| 官方 + 用户目录 | 合并显示 | 两处 workflow 在 Dashboard 中并列显示 |

## 验证

将 workflow 部署到用户目录后：

1. **重新打开 Dashboard**，在 Home 页的 workflow 列表中应出现新 workflow
2. 选中匹配的条目后右键 → Zotero Agents，应出现新 workflow
3. 运行 workflow 前检查设置对话框中的参数是否正确

## 下一步

- [本地化](#doc/workflows%2Fcustom%2Flocalization) — 为 workflow 添加多语言支持
- [请求种类](#doc/workflows%2Fcustom%2Frequest-kinds) — 选择合适的执行后端和请求类型
- [调试与测试](#doc/workflows%2Fcustom%2Fdebugging) — 验证 workflow 的正确性
