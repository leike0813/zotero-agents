# Zotero Librarian Hermes Profile

## 概要

**zotero-librarian** は、すぐにインストール可能な [Hermes](https://github.com/anomalyco/hermes) プロファイルで、[Host Bridge](#doc/backends%2Fhost-bridge) を通じて AI エージェントが Zotero ライブラリを管理できるようにします。`zotero-bridge` CLI、Host Bridge 接続プロファイルテンプレート、ローカル SQLite メタデータインデックス、ワークフローカタログキャッシュ、実行監視スクリプト、定期メンテナンス cron ジョブなど、エージェントが必要とするすべてを同梱しています。

このプロファイルは Zotero Agents リポジトリの `host-bridge/zotero-librarian-profile` ブランチからスタンドアロンパッケージとして配布されています。

## できること

| 機能 | 説明 |
|------|------|
| **ローカルメタデータインデックス** | Zotero ライブラリの検索可能な SQLite スナップショット — タイトル、作成者、タグ、コレクション、DOI、ノート/添付ファイル数 — を維持し、高速でオフライン可能なクエリを実現 |
| **ワークフローカタログキャッシュ** | 組み込みの全ワークフローのペイロード契約をローカルにキャッシュし、エージェントが毎回スキーマを再クエリせずに既知のワークフローを送信可能 |
| **定期メンテナンス** | 6 つの組み込み cron テンプレート：インデックス更新、ワークフローカタログ更新、実行監視、受信トレイトリアージ、ライブラリ健全性チェック、注目キューのサマリー |
| **実行監視** | 送信されたワークフロー実行を追跡し、状態変更、終了状態、対応が必要な項目を報告 |
| **注目キュー** | Host Bridge の `insights.get_attention_queue` とローカルインデックスメタデータを組み合わせ、優先度の高い読み取り・分析タスクを表示 |

## インストール

### 前提条件

- [Zotero](https://www.zotero.org/) 7+ と **Zotero Agents** プラグインがインストール済み
- Host Bridge が稼働中（確認：Zotero → 設定 → Zotero Agents → Host Bridge → **開始/エンドポイント表示**）
- [Hermes](https://github.com/anomalyco/hermes) がシステムにインストール済み
- `zotero-bridge` CLI が使用可能（Host Bridge 設定パネルの **CLI をインストール** ボタンでインストール）

### プロファイルのインストール

```bash
hermes profile install zotero-librarian
```

このコマンドでプロファイルパッケージがダウンロードされ、Hermes プロファイルディレクトリに展開されます。

### Hermes の設定

プロファイル内の `config.yaml` を編集して、使用するモデルプロバイダーを設定します：

```yaml
# インストールされたプロファイルディレクトリ内
provider:
  type: anthropic    # openai、local など
  model: claude-sonnet-4-20250514
  # ... APIキーとその他のプロバイダー設定
```

完全なプロバイダー設定オプションについては [Hermes ドキュメント](https://github.com/anomalyco/hermes) を参照してください。

### Zotero Bridge 接続の設定

プロファイルには `assets/host-bridge/profile.example.json` に Host Bridge 接続テンプレートが同梱されています。実際のエンドポイントとトークンを指定する必要があります：

1. Zotero → 設定 → Zotero Agents → Host Bridge を開く
2. **開始/エンドポイント表示** をクリックして Bridge が実行中であることを確認し、エンドポイント URL（例：`http://127.0.0.1:26570/bridge/v1`）をメモ
3. **マスタートークンをコピー** をクリック（またはパネルに表示されているセッショントークンを使用）
4. トークンを環境変数として設定：

```bash
# Linux / macOS
export ZOTERO_BRIDGE_TOKEN="<your-token>"

# Windows PowerShell
$env:ZOTERO_BRIDGE_TOKEN = "<your-token>"
```

5. リモート/LAN アクセスの場合、エンドポイントも指定：

```bash
export ZOTERO_BRIDGE_ENDPOINT="http://127.0.0.1:26570/bridge/v1"
```

プロファイルテンプレートは `auth.tokenEnv: "ZOTERO_BRIDGE_TOKEN"` を使用しているため、CLI は環境変数からトークンを自動的に読み取ります。エンドポイント、トークン、プロファイルファイルの詳細については [Host Bridge 設定](#doc/backends%2Fhost-bridge) を参照してください。

### セットアップの確認

```bash
# Host Bridge 接続の確認
zotero-bridge status

# プロファイルに CLI バイナリをインストール（初回のみ）
python scripts/install_zotero_bridge_cli.py

# 初回インデックス更新（全ライブラリメタデータをローカル SQLite に取得）
python scripts/zotero_librarian_index_service.py refresh

# ローカルインデックスでの検索テスト
python scripts/zotero_librarian_index_service.py search "machine learning"
```

## インデックスサービスのコマンド

プロファイルの中核ユーティリティは `zotero_librarian_index_service.py` です。Zotero に毎回問い合わせることなく、高速で繰り返しライブラリをクエリするためのローカル SQLite データベースを維持します。

| コマンド | 説明 |
|----------|------|
| `refresh` | `zotero-bridge library snapshot` をページングし、SQLite インデックスをアトミックに更新。最新の更新で欠落したアイテムは削除済みとしてマーク |
| `search "<クエリ>"` | タイトル、作成者、識別子、タグ、コレクション、出版物フィールドを全文検索 |
| `item <key-or-id>` | Zotero アイテムキーまたは数値 ID で単一のインデックスレコードを返す |
| `stats` | 有効/削除済みアイテム数、タグ数、コレクション数、ワークフローカタログ状態を報告 |
| `workflow-refresh` | `workflow list` と `workflow describe` を呼び出してローカルワークフローカタログキャッシュを更新 |
| `workflow-show <id>` | 既知のワークフローのキャッシュされたペイロード契約を表示 |
| `run-register --run-id <id> --workflow-id <id>` | 送信されたワークフロー実行を監視対象として登録 |
| `run-watch` | アクティブな登録済み実行をすべてチェックし、状態変更や終了状態を報告 |

## ユースケース

### ライブラリ管理

**毎日の受信トレイトリアージ**（`cron/inbox-triage.yaml`）

プロファイルの受信トレイトリアージ cron は毎日実行され、ライブラリ内の新規アイテムの完全性をチェックします：

- ステータスが `0-inbox`（未処理）のアイテム
- 欠落しているタグやコレクション割り当て
- 欠落している DOI、URL、添付ファイル
- 欠落しているサマリーやダイジェスト成果物

提案アクションのレポートを生成しますが、承認なしに Zotero の変更は行いません。

**毎週のライブラリ健全性チェック**（`cron/library-hygiene.yaml`）

毎週月曜に実行され、ライブラリのデータ品質問題をスキャンします：

- 重複エントリ（DOI、タイトル、ISBN による）
- 疑わしい文字化けタイトル
- 孤立アイテム（親コレクションなし）
- 空のコレクション
- 単一アイテムの過剰なタグ数
- 異常な Zotero アイテムタイプ

すべての提案は読み取り専用で、明示的に修正を承認するまで実行されません。

**注目キュー**（`cron/attention-queue.yaml`）

Host Bridge の `insights.get_attention_queue` とローカルインデックスメタデータを組み合わせて、優先度の高いタスク（読むべき論文、埋めるべきメタデータの欠落、実行すべきワークフロー）のランク付けリストを表示します。

### 文献検索と取り込み

1. まずローカルインデックスを検索して、既に所有している論文を再度追加しないようにします：
   ```bash
   python scripts/zotero_librarian_index_service.py search "attention mechanism survey"
   ```

2. 論文が見つからない場合、`literature-search-ingest` ワークフローを使用して外部ソースから検索し Zotero に追加します：
   ```bash
   zotero-bridge workflow submit \
     --workflow literature-search-ingest \
     --none \
     --workflow-options '{"query":"attention mechanism survey","searchMode":"arxiv-and-doi"}'
   ```

3. 取り込み後、tag-bootstrapper または tag-regulator ワークフローを実行して新規アイテムのタグを正規化します。

### 自動文献分析ワークフロー

プロファイルは Zotero Agents プラグインのすべての組み込みワークフローをカタログ化します。カタログを更新すれば、スキーマを再クエリすることなく任意のワークフローを直接送信できます。

**バッチ文献分析**

論文のコレクションに対して `literature-analysis` ワークフローを送信し、構造化されたダイジェストを生成します：

```bash
zotero-bridge workflow submit \
  --workflow literature-analysis \
  --items @items.json \
  --workflow-options '{"language":"ja"}'
```

実行を登録して監視：

```bash
python scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id literature-analysis
python scripts/zotero_librarian_index_service.py run-watch
```

**単一論文の深読**

特定の論文の詳細な分析：

```bash
zotero-bridge workflow submit \
  --workflow literature-deep-reading \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"ja","mode":"comprehensive"}'
```

**論文横断トピック統合**

論文コレクション全体のテーマを統合：

```bash
zotero-bridge workflow submit \
  --workflow create-topic-synthesis \
  --items @collection-items.json \
  --workflow-options '{"topicSeed":"self-supervised learning","language":"ja"}'
```

**翻訳支援**

論文メタデータや要約の翻訳：

```bash
zotero-bridge workflow submit \
  --workflow literature-translator \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"ja","mode":"metadata"}'
```

**論文 Q&A**

論文の内容について質問：

```bash
zotero-bridge workflow submit \
  --workflow literature-explainer \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"language":"ja"}'
```

## 定期メンテナンスジョブ

プロファイルには `cron/` ディレクトリに 6 つの事前設定 cron テンプレートが含まれています：

| Cron ジョブ | スケジュール | 動作 |
|-------------|------------|------|
| `index-refresh` | 6 時間ごと | `library snapshot` をページングしてローカル SQLite インデックスを最新に保つ。変更がない場合は `[SILENT]` を返す |
| `workflow-catalog-refresh` | 毎日 03:00 | `workflow list` + `workflow describe` を呼び出してワークフローカタログキャッシュを更新。変更がない場合は `[SILENT]` を返す |
| `run-monitor` | 5 分ごと | `run-watch` を呼び出してアクティブな登録済み実行をチェック。状態変更、終了状態、注意が必要な項目のみを報告 |
| `inbox-triage` | 毎日 09:00 | `status:0-inbox` のアイテム、欠落タグ、欠落コレクション、欠落メタデータを検索。読み取り専用レポートを生成 |
| `library-hygiene` | 毎週月曜 | 重複エントリ、孤立アイテム、空のコレクション、データ品質問題をスキャン |
| `attention-queue` | 毎日 18:00 | 注目キューインサイトとローカルインデックスデータを組み合わせて高優先度タスクをランク付け |

すべての非対話型メンテナンスジョブは、アクション可能な結果がない場合にユーザーへのスパムを避けるため `[SILENT]` マーカーを使用します。

## セキュリティ境界

- プロファイルテンプレート（`profile.example.json`）には実際のトークンは決して含まれません。常に `ZOTERO_BRIDGE_TOKEN` を環境変数として使用してください。
- メンテナンス cron ジョブはデフォルトで読み取り専用です。変更には明示的なユーザー承認が必要です。
- Zotero データベースファイルを直接読み取らないでください。常に Host Bridge、`zotero-bridge`、`library.sync_snapshot` から生成されたローカルインデックスを使用してください。

## 次のステップ

- [Host Bridge](#doc/backends%2Fhost-bridge) — `zotero-bridge` CLI と Host Bridge 機能の完全なリファレンス
- [ワークフロー](#doc/workflows%2Findex) — すべての組み込みおよびカスタムワークフローの概要
- [MCP Server](#doc/backends%2Fmcp-server) — MCP 互換クライアント向けの代替プロトコルインターフェース
