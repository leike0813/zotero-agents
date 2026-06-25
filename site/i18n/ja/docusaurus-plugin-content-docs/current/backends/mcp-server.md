# MCPサーバー

## 概要

MCP（Model Context Protocol）サーバーは、ZoteroライブラリとSynthesisの機能を40以上のMCPツールとして公開する組み込みプロトコルサービスである。MCP対応クライアント（Claude Desktop、Cursor、VS Code拡張機能など）がZoteroデータに直接アクセスできる。

MCPサーバーはHost Bridgeのケイパビリティレジストリを基盤として共有するが、MCPプロトコル仕様（Streamable HTTPトランスポート、JSON-RPC 2.0）に従う。

## 設定

Zotero → 設定 → Zotero Agents → Host Bridge → **MCPサーバーを有効にする**

単一のチェックボックスでサーバーのオン/オフを切り替える。デフォルトで有効。

### 設定不可のデフォルト値

| 設定 | 値 | 理由 |
|---------|-------|--------|
| リッスンアドレス | `127.0.0.1` | セキュリティ：ループバックのみ |
| オリジン検証 | 厳格 | `127.0.0.1`、`localhost`、`[::1]`のみ許可 |
| リクエストサイズ制限 | 1 MB | メモリ保護 |
| 書き込み保護 | 有効 | すべての書き込みオペレーションに承認が必要 |

## セキュリティ

- **Bearer Token認証**: Host Bridgeと同じセッショントークン/マスタートークンを共有
- **ループバックのみ**: リモートアクセスは不可
- **オリジン検証**: クロスオリジンリクエストは拒否（403）
- **1 MB上限**:  oversizedボディは413で拒否
- **シングルスレッドキュー**: 1実行 + 8待機、45秒実行タイムアウト、30秒キュータイムアウト
- **サーキットブレーカー**: 5分以内に3回失敗 → ツールを60秒間一時停止

## MCPクライアントの接続

### エンドポイント

```
http://127.0.0.1:<port>/mcp
```

ポートは自動割り当て（範囲26370-26569）。実際のポートは環境設定のHost Bridgeエンドポイントで確認する。

### Claude Desktop設定例

```json
{
  "mcpServers": {
    "zotero-skills": {
      "type": "http",
      "url": "http://127.0.0.1:26370/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```

トークンは環境設定 → Host Bridge → **マスタートークンをコピー**で取得する。

### プロトコルの詳細

- トランスポート：Streamable HTTP（`POST /mcp`）
- バージョン：`2025-06-18`
- サーバーID：`zotero-skills` / `"Zotero Agents Context Broker"` v0.4.0
- `GET /mcp` → 405（POSTのみ受け付け）
- `id`なしのリクエスト → 通知として扱われる（レスポンスなし）
- `id: null` → 明示的に無効

## ツール一覧

<details>
<summary>全40以上のツール</summary>

### 読み取りツール

| ツール | 説明 |
|------|-------------|
| `get_current_view` | 現在のZoteroビュー情報 |
| `get_selected_items` | 現在選択されているアイテムのサマリー |
| `search_items` | アイテムを検索（制限 ≤ 50） |
| `list_library_items` | ページネーション付きアイテム一覧 |
| `get_item_detail` | 完全なアイテムメタデータ |
| `get_item_notes` | 子ノートを一覧 |
| `get_note_detail` | ノート本文を読む（チャンク分割、1チャンクあたり ≤ 16k文字） |
| `list_note_payloads` | ノート内のWorkflowペイロードを一覧 |
| `get_note_payload` | 1つのペイロードを読む |
| `get_item_attachments` | 添付ファイルのマニフェストを一覧（ファイルバイトは除く） |
| `prepare_paper_reading_context` | 1つの論文のメタデータ、ノート、ペイロード、添付ファイルを統合 |

### 書き込みツール（承認が必要）

| ツール | 説明 |
|------|-------------|
| `preview_mutation` | 書き込みオペレーションをプレビュー（実行しない） |
| `update_item_fields` | 1つのアイテムの許可されたフィールドを更新 |
| `add_item_tags` | 1つ以上のアイテムにタグを追加 |
| `remove_item_tags` | タグを削除 |
| `create_child_note` | 子ノートを作成 |
| `update_note` | ノート本文を更新 |
| `create_markdown_note` | レンダリング済みHTML + base64 Markdownペイロードを持つノートを作成 |
| `update_markdown_note` | 既存のMarkdownバックノートを更新 |
| `ingest_paper` | DOI/arXiv/PMID/ISBNで論文を取り込み（PDF添付ファイル付き） |
| `add_items_to_collection` | アイテムをコレクションに追加 |
| `remove_items_from_collection` | アイテムをコレクションから削除 |

### 診断ツール

| ツール | 説明 |
|------|-------------|
| `get_mcp_status` | サービス診断：キュー、サーキットブレーカー、最近のリクエスト |

### Synthesisツール

| ツール | 説明 |
|------|-------------|
| `topics.list` | すべてのトピックを一覧 |
| `topics.find_by_paper_ref` | 論文参照でトピックを検索 |
| `topics.get_context` | 完全なトピックコンテキストを取得 |
| `topics.get_review_input` | トピックレビューパッケージを組立て |
| `schemas.get` | スキーマ定義を取得 |
| `concepts.query` | 概念ナレッジベースをクエリ |
| `citation_graph.query_cluster` | 引用クラスタをクエリ |
| `citation_graph.get_overview` | グラフの概要を取得 |
| `citation_graph.get_slice` | サブグラフスライスを抽出 |
| `citation_graph.get_metrics` | グラフメトリクスを計算（pagerank、foundation、frontier） |
| `citation_graph.rank_external_references` | 外部参考文献をランキング |
| `citation_graph.rank_library_papers` | ライブラリ論文をランキング |
| `library_index.get` | ページネーション付きライブラリインデックス |
| `resolvers.resolve` | 参考文献/トピックリゾルバを解決 |
| `reference_index.get` | 参考文献インデックスを取得 |
| `paper_artifacts.get_manifest` | アーティファクトのマニフェストを取得 |
| `paper_artifacts.read` | アーティファクトの内容を読む |
| `paper_artifacts.export_filtered` | フィルタ済みアーティファクトをエクスポート |
| `paper_artifacts.resolve_topic_digest` | トピックダイジェストを解決 |
| `insights.get_attention_queue` | アテンションキューを取得 |

</details>

## 書き込み保護

書き込みツールはHost Bridgeと同じ承認モデルに従う。

```
MCPクライアントが書き込みツールを呼び出す
  │
  ├── Bearer Tokenを検証
  ├── ツールスコープを抽出
  ├── 承認チェック：
  │     ├── 読み取り専用ツール → 即座に実行
  │     ├── 事前承認済み書き込み → 即座に実行
  │     └── 承認が必要 → Zotero UIにキュー
  └── 実行 / 拒否
```

キュー：最大50の保留中の承認。5分以内に10回以上の拒否 → サーキットブレーカー（30秒間無効化）。

## 次のステップ

- [Host Bridge](host-bridge) — 基盤となるトランスポートとCLIツール
- [環境設定](../preferences) — MCPサーバーの設定を表示
