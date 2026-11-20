## Why

四种来源全部选中时，旧配置中的空库列表仍会让重建只发现主题，论文搜索因此返回空结果。恢复文献枚举后，超过单次读取上限的合法 Markdown 又会阻止完整索引发布。

## What Changes

- 将所选文献来源绑定到当前个人库，保留仅主题的选择及已发布范围的展示。
- 分页核验长 Markdown，使高位 UTF-16 命中可定位回原文。
- 从向量搜索页直接打开首选项，并用目录列表图标标识 Index。

## Capabilities

### Modified Capabilities

- `synthesis-vector-retrieval` — 来源范围、长正文读取及工作台入口。

## Impact

涉及 Zotero Host、共享协议、Rust sidecar、首选项和 Workbench。用户须显式重建，新的文献范围才会进入已发布索引。
