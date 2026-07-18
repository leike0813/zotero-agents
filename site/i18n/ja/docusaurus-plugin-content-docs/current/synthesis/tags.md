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

![Synthesis Tags ページ](/img/docs/synthesis/tags.png)

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

`status` は読書進捗ではなく Workflow の未完了タスクを表します。項目には 0 個以上の status を付けられます。5 つの組み込み定義（`need-metadata-curation`、`need-fulltext`、`need-markdown`、`need-analysis`、`need-deep-reading`）はプラグイン起動時に作成されます。Tag Bootstrapper と [Tag Regulator](../workflows/tag-regulator) はこれらを作成・変更できず、文献への追加・削除もできません。独自の status は追加できます。PDF を手動添付しても `status:need-fulltext` は自動削除されません。
