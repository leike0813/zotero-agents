# タグ管理

## タグ語彙とは

タグ語彙（Tag Vocabulary）は、文献の一貫したアノテーションに使用される標準化されたタグシステムである。Zotero ネイティブの自由形式タグとは異なり、統制語彙のタグは統一された命名規則に従い、統計と検索が容易になる。

## ファセット

各タグはファセット（次元）に属する。現在、以下のファセットがサポートされている。

| ファセット | 説明 | 例 |
|-----------|------|-----|
| `field` | 研究分野 | `field:natural_language_processing` |
| `topic` | 研究トピック | `topic:transformer_architecture` |
| `method` | 研究方法 | `method:reinforcement_learning` |
| `model` | 使用モデル | `model:gpt-4` |
| `ai_task` | AI タスクタイプ | `ai_task:text_summarization` |
| `data` | データセット | `data:imagenet` |
| `tool` | ツール | `tool:python` |
| `status` | Workflow の未完了タスク | `status:need-analysis` |

タグフォーマット：`^[a-z_]+:[a-zA-Z0-9/_.-]+$`、最大 120 文字。

## Vocabulary タブ

Synthesis Workbench → Tags → Vocabulary ページでは以下の操作ができる。

- **表示**: 定義されたすべての正規タグを表示。ステータス、ファセット、別名、使用回数を表示
- **追加**: 新しい正規タグを作成
- **編集**: タグのメタデータを修正
- **非推奨化**: タグを非推奨としてマーク。代替タグを指定可能
- **JSON インポート**: JSON ファイルからタグ語彙をインポート（確認前のプレビューをサポート）
- **JSON エクスポート**: 現在の語彙を JSON ファイルにエクスポート

5 つの組み込み Workflow ステータスはプラグイン起動時に初期化されます。それらの tag、facet、source、非推奨状態、replacement は変更または削除できません。note は引き続き編集可能で、aliases は通常のガバナンスパスを使用します。カスタム `status:*` エントリは他のカスタム語彙エントリと同じ管理コントロールを保持します。インポートは組み込みの note と aliases を更新できますが、組み込みを省略したり保護された ID を変更したりしても、削除や置換はできません。

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/tags.webp" alt="Synthesis Tags ページ" title="Synthesis Tags ページ" loading="lazy" /><figcaption>Synthesis Tags ページ</figcaption></figure>

タグのステータス：
- `active`: アクティブ
- `deprecated`: 非推奨（代替タグあり）
- `warning`: 警告（レビューが必要かもしれない）

## Staged タブ（保留タグ）

**tag-regulator** Skill が文献メタデータを自動的に分析し、統制タグ提案を生成して Staged ページに表示する。

### 承認ワークフロー

1. 提案されたタグのリストをレビュー
2. 各タグに対して以下の操作が可能：
   - **昇格**: タグを正規語彙に追加
   - **破棄**: 提案を却下
   - **一括クリア**: すべての提案を一括破棄

### インポート/エクスポート形式

タグ語彙は JSON 形式（TagVocab 形式）のインポート/エクスポートに対応しており、以下が可能である。

- ライブラリ間のタグシステム移行
- チームでのタグ規則の共有
- バックアップとバージョン管理

## 関連 Workflow

`status` は読書進捗ではなく Workflow の未完了タスクを表します。項目には 0 個以上の status を付けられます。5 つの組み込み定義：

- `status:need-metadata-curation`
- `status:need-fulltext`
- `status:need-markdown`
- `status:need-analysis`
- `status:need-deep-reading`

これらを作成するために Tag Bootstrapper を実行する必要はありません。Tag Bootstrapper はカスタム語彙エントリのみを追加し、[Tag Regulator](#doc/workflows%2Ftag-regulator) は通常の統制タグを監査できますが、文献項目に組み込み Workflow ステータスを追加または削除することはできません。どちらの Workflow も論文のトピック、言語、メタデータ、または全文から組み込みステータスを推論することはできません。

| イベント | 項目に追加 | 項目から削除 |
|----------|------------|--------------|
| Search が項目を作成 | Markdown、analysis、deep reading。結果が必要とする場合の metadata/fulltext | — |
| Search が項目を再利用 | この結果で明示的に必要な metadata/fulltext のみ | — |
| Metadata Curator が成功または変更なしを確認 | — | Metadata curation |
| MinerU が Markdown を書き込んで添付 | — | Markdown と fulltext |
| Literature Analysis が正式な成果物を書き込み | — | Analysis |
| Literature Deep Reading が HTML を書き込んで添付 | — | Deep reading |

失敗、スキップ、キャンセル、または未適用の実行はステータスをクリアしません。成果物が成功してもステータスクリーンアップが失敗した場合、成果物は保持され、実行は部分的な警告を報告します。PDF を手動添付しても `status:need-fulltext` は自動削除されません。
