# Generic HTTPバックエンド設定

## 目的

Generic HTTPバックエンドは任意のURLに生のHTTPリクエストを送信するために使用される。エージェントスキルは実行せず、汎用HTTPクライアントとして機能する。

## 主な用途：MinerUドキュメント解析

Generic HTTPバックエンドの主な用途は**MinerU Workflow**のサポートである。PDFドキュメント解析Workflowである。

MinerUはPDFファイルをMarkdown形式に変換するドキュメント解析サービスである。MinerU WorkflowはGeneric HTTPバックエンドを介してMinerUサービスにリクエストを送信し、解析結果を取得する。

### MinerUの設定

1. [mineru.net](https://mineru.net)にアクセスしてアカウントを登録し、**API → API管理**ページからAPIトークンを取得
2. **ツール → [バックエンドマネージャー](#doc/backends%2Fbackend-manager)**を開く
3. **Generic HTTP**タブに切り替える
4. **Add Generic HTTP**をクリック
5. 以下を入力：

| フィールド | 値 |
|-------|-------|
| 表示名 | `MinerU Official` |
| Base URL | `https://mineru.net` |
| 認証 | `bearer` |
| 認証トークン | APIトークンを貼り付け |
| タイムアウト | `60000`（60秒） |

6. 右下の**保存**をクリック

## 設定フィールド

| フィールド | 必須 | 説明 |
|-------|----------|-------------|
| 表示名 | はい | バックエンドの表示名 |
| Base URL | はい | HTTPサービスのベースアドレス |
| Bearer Token | いいえ | 認証トークン |
| タイムアウト | いいえ | リクエストタイムアウト（ミリ秒） |

## 技術的な詳細

Generic HTTPバックエンドは以下をサポートする。
- **単一リクエスト**: `generic-http.request.v1` — 単一のHTTPリクエストを送信
- **マルチステップパイプライン**: `generic-http.steps.v1` — JSON path抽出（`$.*`式）を伴うチェーンリクエスト。前のレスポンスから値を抽出し、後続リクエストのパラメータとして使用
- **マルチパートアップロード**: ファイルアップロードをサポート
- ポーリングとリトライのメカニズム

## 次のステップ

- [Workflowについて学ぶ](#doc/workflows%2Findex) — Generic HTTPバックエンドは主に特定のWorkflowに使用される
