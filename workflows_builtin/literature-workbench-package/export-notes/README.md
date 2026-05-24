# export-notes

导出 `literature-digest` 生成的三类结构化 note 产物：

- `digest.md`
- `representative_image.jpg`（当 digest note 含代表图 embedded-image 时）
- `references.json`
- `citation_analysis.json`
- `citation_analysis.md`

支持父条目与三类 note 混选；多选时只弹一次导出目录选择窗口。

代表图会以 `zs:representative-image:v1` Markdown 注释块插入 `digest.md`，并使用同目录相对路径引用 `representative_image.jpg`。图片导出失败不会阻塞文本与 JSON 产物导出。
