# Mock Zotero 说明

## 目标

为 `npm run test:node` 提供可重复的“类 Zotero”运行环境，覆盖 Handler 与 SelectionContext 相关 API。

## 位置与加载

- 实现文件：`test/setup/zotero-mock.ts`
- Node 测试入口会通过 `--require test/setup/zotero-mock.ts` 自动注入全局 `Zotero`
- Parity 治理合同：`doc/components/zotero-mock-parity.md`

## 覆盖范围（精简但可用）

### 全局对象

- `Zotero`：核心 API 模拟
- `Zotero.__parity`：mock 能力声明与 drift 元数据（HB-08）
- `Components.utils.isDeadWrapper`：恒为 `false`
- `PathUtils.join` / `OS.Path.join`：路径拼接

### Item / Collection

- `Zotero.Item`：支持 `saveTx/eraseTx`、字段读写、标签/集合、父子关系
- `Zotero.Collection`：支持 `saveTx/eraseTx`
- `Zotero.Items.get/getAsync/getByLibraryAndKey`
- `Zotero.Collections.get/getByLibraryAndKey`

### Attachments

- `Zotero.Attachments.linkFromFile`
- `Zotero.Attachments.importFromURL`（测试用 URL 附件导入；包含 `fail` 标记的 URL 会抛错）
- `Zotero.Attachments.resolveRelativePath`（`attachments:` 前缀）
- `Zotero.Attachments.getStorageDirectoryByLibraryAndKey`（`storage:` 前缀）

### File

- `Zotero.File.pathToFile`
- `Zotero.File.putContentsAsync`
- `Zotero.File.createDirectoryIfMissingAsync`
- `Zotero.getTempDirectory`

## 类型与字段映射

`ItemTypes` / `ItemFields` 的映射来自：
- `reference/zotero-item-typeMap.xml`

Mock 内会生成：
- `itemTypeIdByName`
- `fieldIdByName`
- `validFieldsByType`
- `baseFieldByTypeAndField`
- `fieldIdByTypeAndBase`

用于保证 `updateFields` 与字段校验在 Node 环境中尽可能贴近真实 Zotero 行为。

## 行为差异（需要注意）

差异与风险等级以 `doc/components/zotero-mock-parity.md` 的 drift register 为准。  
常见偏差包括：

- `allowMissing` 场景下，会在临时目录创建占位文件
- `Search` 仅为 stub，`search()` 返回空数组
- UI/插件注册相关 API（`PreferencePanes/ItemPaneManager` 等）为轻量 stub

## Fixtures 与文件依赖

SelectionContext 重建测试依赖以下目录：
- `test/fixtures/selection-context/*.json`
- `test/fixtures/selection-context/attachments/`

该目录应包含真实附件文件，以避免 `allowMissing` 分支触发占位文件创建。

## 限制

- 不覆盖完整 Zotero 行为，仅满足当前测试需求
- 不包含 UI、网络或真实索引能力
