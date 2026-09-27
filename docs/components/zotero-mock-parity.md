# Zotero Mock Parity Governance (HB-08)

## 目标

为 Node 测试中的 `tests/setup/zotero-mock.ts` 建立可审计的 parity 治理基线，确保 mock 扩展遵循“先定义语义边界，再给测试证据”的流程。

## Parity Contract（必须一致）

以下语义属于 **contract scope**，变更时必须保持与真实 Zotero 一致，或登记 drift：

1. 路径与附件解析语义
   - `Zotero.Attachments.resolveRelativePath` 的 `attachments:` 输入语义
   - `Zotero.Attachments.linkFromFile` 的父子挂接语义
2. 删除语义
   - `Zotero.Items.trashTx` 必须以“标记删除”语义工作，不是直接硬删除
   - 被标记删除条目仍可通过 `Items.get` 读取 `deleted=true` 状态
3. 关键调用语义
   - `Items.get/getAsync/getByLibraryAndKey` 返回一致性
   - `ItemFields` 字段合法性判定语义保持一致
4. 只读行为约束
   - 只读属性（例如 `item.deleted`）不允许通过直接赋值修改真实状态

## Drift Register（已知偏差）

| ID | Scope | Risk | Status | 说明 | 收敛条件 |
|---|---|---|---|---|---|
| DR-001 | `File.pathToFile` | high | open | mock 默认接受 `D:/...` 形式路径；真实 Zotero 在部分链路下会报 path parse 错误。 | mock 引入与实机一致的路径解析校验，且相关回归测试通过 |
| DR-002 | `Search` API | medium | waived | `Search.search()` 目前是 stub，返回空数组。 | 当 workflow 依赖 Search 查询语义时补齐真实行为 |
| DR-003 | UI 注册 API | low | waived | `PreferencePanes`/`ItemPaneManager` 等仅保留轻量 stub。 | 当测试需要验证 UI 注册副作用时增加最小可验证实现 |

## 变更准入清单（Mock API）

当改动涉及 `tests/setup/zotero-mock.ts` 或其 helper，必须同时满足：

1. 代码：更新 mock 行为实现或能力声明。
2. 测试：新增或更新对应 parity/drift 测试（至少覆盖一个高风险语义）。
3. 文档：
   - 更新本文件的 contract 或 drift register；
   - 必要时更新 `docs/components/zotero-mock.md` 与 `docs/testing-framework.md`。
4. 追溯：在 OpenSpec change tasks 中标注 `HB-08` 对应项完成证据。
