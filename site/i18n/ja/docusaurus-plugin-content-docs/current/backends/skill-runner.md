# Skill-Runnerデプロイと設定

## Skill-Runnerとは

Skill-Runnerは独立したエージェントスキル実行サービスである。Zotero AgentsはHTTP APIを介してSkill-Runnerと通信し、スキルリクエストの送信と結果の取得を行う。複数のAIエージェントCLIをバックエンドエンジンとしてサポートし、独立したDockerコンテナまたはローカルサービスとしてデプロイできる。

> **🏆 推奨優先度**: マシンにACP対応のエージェントツール（Codex、OpenCode、Claude Codeなど）がすでにある場合は、まず[ACPバックエンド](./acp)を使用されたい。追加の設定はゼロで済む。Skill-Runnerは永続的なバックグラウンドサービスやLAN共有が必要なシナリオに適している。

## デプロイモード

### 推奨：Docker永続デプロイ

DockerデプロイのSkill-Runnerは独立した永続サービスとして動作し、**Zoteroの開始/停止に影響されない**。Zoteroを閉じてもタスクはバックグラウンドで実行を継続でき、次回Zoteroを起動した際に再開または完了した結果を直接取得できる。

適するケース：
- 長時間実行タスク（トピック統合、バッチ文献分析など）
- LAN内で複数のデバイスから単一のSkill-Runnerインスタンスを共有
- Dockerの経験があるユーザー

#### docker compose（推奨）

```yaml
version: "3"
services:
  skill-runner:
    image: leike0813/skill-runner:latest
    ports:
      - "9813:9813"
      - "17681:17681"
    volumes:
      - ./skills:/app/skills
      - skillrunner_cache:/opt/cache
      - ./data:/app/data
    environment:
      - SKILL_RUNNER_DATA_DIR=/app/data
      - UI_BASIC_AUTH_ENABLED=false

volumes:
  skillrunner_cache:
```

```bash
mkdir -p data skills
docker compose up -d --build
```

起動後：
- **APIサービス**: `http://localhost:9813/v1`
- **管理UI**: `http://localhost:9813/ui`

#### Docker直接実行

```bash
docker run --rm -p 9813:9813 -p 17681:17681 \
  -v "$(pwd)/skills:/app/skills" \
  -v skillrunner_cache:/opt/cache \
  -v "$(pwd)/data:/app/data" \
  leike0813/skill-runner:latest
```

ポートの説明：

| ポート | 用途 |
|------|---------|
| `9813` | HTTP API + 管理UI |
| `17681` | ブラウザ内インラインエンジンターミナル（ttydが必要） |

#### 本番設定

公開デプロイの場合は、UI Basic Authを有効にすることを推奨する。

```bash
docker run --rm -p 9813:9813 \
  -v "$(pwd)/skills:/app/skills" \
  -e UI_BASIC_AUTH_ENABLED=true \
  -e UI_BASIC_AUTH_USERNAME=admin \
  -e UI_BASIC_AUTH_PASSWORD=your-password \
  leike0813/skill-runner:latest
```

HTTPSリバースプロキシ（Nginxなど）との併用を推奨する。

### 緊急時：ワンクリックローカルモードデプロイ

> ⚠️ このモードは**エージェントツールのインストール方法を知らず、Dockerも使用できない**ユーザーにのみ適している。エージェントCLIのインストールやDockerの使用が可能であれば、[ACPバックエンド](./acp)または上記のDockerデプロイを優先されたい。

ワンクリックデプロイのSkill-RunnerはZoteroプラグインの開始/停止に連動して自動的に起動・停止する。**Zoteroを閉じると現在実行中のすべてのタスクが終了**し、バックグラウンド実行はない。中断されたタスクは再送信が必要である。

**デプロイ手順：**

1. **Zotero → 設定 → Zotero Agents**を開く
2. **SkillRunnerローカルバックエンド**セクションを探す
3. **ワンクリックデプロイ**をクリック（未インストールの場合）
   - プラグインがGitHub Releasesから最新版を自動的にダウンロード
   - プラグインのデータディレクトリにインストール
   - 完了するとステータスが「インストール済み」に変化する
4. **スタート**をクリック
   - デフォルトアドレス：`http://127.0.0.1:29813`
   - ポートが占有されている場合は、次の10ポートを自動的に試行

**アクションボタンの説明：**

| ボタン | 機能 |
|--------|----------|
| デプロイ | Skill-Runnerランタイムをダウンロードしてインストール |
| スタート | ローカルSkill-Runnerプロセスを起動 |
| ストップ | 実行中のSkill-Runnerプロセスを停止 |
| アンインストール | インストールされたランタイムファイルを削除 |
| 管理UIを開く | Skill-Runner組み込みWeb管理インターフェースをサイドバーで開く |
| Skillsフォルダを開く | Skillファイルが格納されているディレクトリを開く |
| モデルキャッシュを更新 | バックエンドモデルリストキャッシュをリフレッシュ |
| デバッグコンソールを開く | バックエンドのログ出力を表示 |

### リモートモード

リモートまたはクラウドホストのSkill-Runnerインスタンスに接続する。

> ⚠️ **セキュリティに関する注意**: 現バージョンではリモート接続に対する追加のセキュリティ保護（TLS、APIキー検証など）は提供されておらず、Bearer Token認証のみに依存している。**LAN以外の環境でのリモート接続は推奨されない**。LAN内にデプロイする場合は、ファイアウォールを使用してアクセス元を制限することを推奨する。

**設定手順：**

1. **ツール → [バックエンドマネージャー](backend-manager)**を開く
2. **SkillRunner**タブに切り替える
3. **Add SkillRunner**をクリック
4. 以下を入力：
   - **表示名**: わかりやすい名前
   - **Base URL**: リモートインスタンスのアドレス（例：`http://192.168.1.100:9813`）
   - **認証**: `bearer`を選択し、**認証トークン**を入力（バックエンドが認証を要求する場合）
   - **タイムアウト**: リクエストタイムアウト（省略可）
5. 右下の**保存**をクリック

## ローカルデプロイ（Dockerを使用しない場合）

### クイックデプロイスクリプト

```bash
# Linux / macOS
./scripts/deploy_local.sh

# Windows (PowerShell)
.\scripts\deploy_local.ps1
```

前提条件：`uv`、`Node.js`、`npm`。`ttyd`は任意。

### 制御CLI

```bash
# ステータスを確認
./scripts/skill-runnerctl status --mode local --json

# 開始
./scripts/skill-runnerctl up --mode local --json

# 停止
./scripts/skill-runnerctl down --mode local --json
```

ローカルモードのデフォルトパラメータ：
- **Linux/macOS**: `$HOME/.local/share/skill-runner`
- **Windows**: `%LOCALAPPDATA%\SkillRunner`
- **ポート**: `29813`（フォールバック `29813-29823`）
- **バインド**: `127.0.0.1`のみ

### Releaseインストーラ

```bash
# Linux / macOS
./scripts/skill-runner-install.sh --version v0.4.3

# Windows (PowerShell)
.\scripts\skill-runner-install.ps1 -Version v0.4.3
```

スクリプトは`skill-runner-<version>.tar.gz` + `.sha256`を自動的にダウンロードし、インストール前にSHA256整合性を検証する。

## エンジンシステム

Skill-Runnerは複数のAIエージェントCLIを実行エンジンとしてサポートし、統一された適応レイヤーを提供する。

### サポートされているエンジン

| エンジン | パッケージ名 |
|--------|-------------|
| Codex | `@openai/codex` |
| Gemini CLI | `@google/gemini-cli` |
| OpenCode | `opencode-ai` |
| Claude Code | `@anthropic-ai/claude-code` |
| Qwen | `@qwen-code/qwen-cli` |

### 設定の優先度

エンジン設定は4つのレイヤーからマージされる（低→高）：

1. **エンジンのデフォルト**: エンジンアダプタに組み込まれたデフォルト設定
2. **スキルの推奨値**: スキルパッケージの`assets/<engine>_config.*`からの推奨設定
3. **ユーザーオプション**: APIリクエストボディからのパラメータ
4. **強制設定**: エンジンアダプタからの強制設定（上書き不可）

### エンジン認証

| 方法 | 説明 | 推奨度 |
|--------|-------------|----------------|
| **OAuthプロキシ** | 管理UIを通じてOAuthを完了。認証情報は自動的に保存される | ⭐ 推奨 |
| **CLI委譲** | エンジンの組み込みローカルログインフローを使用 | 代替手段 |
| **インラインTUI** | ブラウザ内のエンジンターミナル（ttydが必要） | デバッグ用 |
| **認証情報ファイルのインポート** | UIを通じて認証情報ファイルをアップロード | 代替手段 |
| **コンテナCLIログイン** | `docker exec`でCLIログインを直接実行 | コンテナ環境用 |

## 管理UI

組み込みWeb管理インターフェースはSkill-Runnerの完全な運用機能を提供する。

アクセスURL：`http://localhost:<port>/ui`

| 機能 | 説明 |
|---------|-------------|
| **Skillブラウザ** | インストール済みSkillの表示、パッケージ構造とファイル内容の検査 |
| **エンジン管理** | エンジンステータスの監視、アップグレードのトリガー、エンジンログの表示 |
| **モデルカタログ** | エンジンモデルスナップショットの閲覧と管理 |
| **インラインTUI** | ブラウザ内でエンジンターミナルを直接起動（ttydが必要） |
| **設定** | ログレベル、データ保持期間、最大ディレクトリサイズなど |

## REST API概要

### コア実行エンドポイント

```bash
# 利用可能なSkillを一覧
curl http://localhost:9813/v1/skills

# ジョブを作成（Skillを実行）
curl -X POST http://localhost:9813/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "my-skill",
    "engine": "gemini",
    "parameter": { "language": "zh-CN" },
    "model": "gemini-3-pro-preview"
  }'

# 結果を取得
curl http://localhost:9813/v1/jobs/<request_id>/result

# ジョブをキャンセル
curl -X POST http://localhost:9813/v1/jobs/<request_id>/cancel
```

### リアルタイム監視（SSE）

実行過程をリアルタイムで観察するための2つのSSEチャネルがある。

| チャネル | エンドポイント | 用途 |
|---------|----------|---------|
| チャット | `GET /v1/jobs/{id}/chat?cursor=N` | チャットバブルストリーム |
| イベント | `GET /v1/jobs/{id}/events?cursor=N` | 完全なプロトコルイベントストリーム |

両チャネルともカーソルベースの再接続をサポートする。

### 管理API

フロントエンド統合に適した安定したJSON管理エンドポイント。

| エンドポイント | 用途 |
|----------|---------|
| `GET /v1/management/skills` | Skillのサマリー |
| `GET /v1/management/engines` | エンジンステータス |
| `GET /v1/management/runs` | 実行履歴（ページネーション） |
| `GET /v1/management/runs/{id}/chat` | 会話SSEストリーム |
| `POST /v1/management/runs/{id}/reply` | インタラクティブSkillへの返信を送信 |
| `POST /v1/management/runs/{id}/cancel` | 実行をキャンセル |

### ローカルランタイムリースAPI

ローカルランタイムモードはリースベースのライフサイクル管理を使用する。

| エンドポイント | 用途 |
|----------|---------|
| `POST /v1/local-runtime/lease/acquire` | リースを取得 |
| `POST /v1/local-runtime/lease/heartbeat` | リースを更新（TTL: 60秒） |
| `POST /v1/local-runtime/lease/release` | リースを解放 |

ローカルランタイムはリースの期限が切れると自動的に終了する。

## Skillパッケージ管理

### 永続インストール

```bash
# Skillパッケージのzipをアップロード
curl -X POST http://localhost:9813/v1/skill-packages/install \
  -H "Content-Type: multipart/form-data" \
  -F "file=@my-skill.zip"
```

サーバー側の検証ルール：
- パッケージにはトップレベルのディレクトリが必要
- `SKILL.md` + `assets/runner.json`が必要
- 3つのスキーマファイル（input / parameter / output）が必要
- ディレクトリ名 == `runner.json.id` == `SKILL.md`のfrontmatter名（同一性の整合性）
- 更新は厳密にバージョン増加であること

### 一時実行（インストールなし）

```bash
# 一時実行を作成
curl -X POST http://localhost:9813/v1/temp-skill-runs \
  -H "Content-Type: application/json" \
  -d '{ "engine": "gemini", "parameter": {} }'

# Skillパッケージをアップロードして開始
curl -X POST http://localhost:9813/v1/temp-skill-runs/<id>/upload \
  -F "skill_package=@my-skill.zip"
```

一時実行は終端状態に達すると自動的にクリーンアップされる。

## 実行ライフサイクル

典型的なスキル実行は以下のステージを含む。

```
1. セットアップとアップロード
   └── クライアントがPOST /v1/jobsを送信
       └── 入力ファイルをオプションでアップロード

2. オーケストレーション
   └── Skillマニフェストをロード
       └── パラメータスキーマを検証
       └── エンジン互換性をチェック
       └── 同時実行制限を適用

3. エンジン適応
   └── 環境を準備（Skillパッケージをコピー）
       └── 入力ファイルを解析
       └── Jinja2テンプレートでプロンプトを構築
       └── 実行ディレクトリの信頼を設定

4. 実行
   └── エンジンCLIをサブプロセスとして起動
       └── 分離された作業ディレクトリ
       └── stdout/stderrをリアルタイムでストリーミング

5. 完了
   └── 出力の検証（output.schema.jsonに対して）
       └── アーティファクトファイルを解析
       └── バンドルを生成（zip + マニフェスト）
       └── ステータスをsucceeded / failed / canceledに設定
```

実行が失敗した場合、デバッグバンドルには完全なログと診断ファイルが含まれる。

## データディレクトリ構造

```
data/
├── runs/<run_id>/              # 実行ワークスペース
│   ├── .state/state.json       # 実行状態
│   ├── .audit/                 # 監査ログ
│   ├── result/result.json      # 最終構造化出力
│   ├── artifacts/              # Skillが生成したファイル
│   └── bundle/                 # パッケージ化された結果（zip + マニフェスト）
├── requests/<request_id>/      # リクエストフェーズのデータ
│   ├── uploads/                # アップロードされた入力ファイル
│   └── request.json            # 元のリクエストパラメータ
├── logs/                       # アプリケーションログ（日次ローテーション）
└── system_settings.json        # UIで編集可能なシステム設定
```

## 環境変数リファレンス

| 変数 | 説明 | デフォルト |
|----------|-------------|---------|
| `SKILL_RUNNER_DATA_DIR` | 実行データディレクトリ | `./data` |
| `SKILL_RUNNER_AGENT_HOME` | エージェント分離設定ホームディレクトリ | `auto` |
| `SKILL_RUNNER_RUNTIME_MODE` | ランタイムモード：local / container | `auto` |
| `UI_BASIC_AUTH_ENABLED` | UI Basic Authを有効にする | `false` |
| `UI_BASIC_AUTH_USERNAME` | Basic Authユーザー名 | — |
| `UI_BASIC_AUTH_PASSWORD` | Basic Authパスワード | — |

## 実行ステータスの説明

| ステータス | 説明 |
|--------|-------------|
| unknown | 初期状態。未検出 |
| starting | 起動中 |
| running | 正常に実行中 |
| stopped | 停止 |
| degraded | 異常に実行中 |
| reconciling_after_heartbeat_fail | ハートビート検出に失敗。回復中 |

## ポートの説明

- デフォルトポート：`29813`（プラグインローカル範囲）
- 単独デプロイAPIポート：`9813`
- フォールバック範囲：連続する10ポート（29813〜29822）
- ハートビート間隔：20秒
- 自動開始検出：15秒ごとにチェック

## ログ

ログは`data/logs/skill_runner.log`に書き込まれる（日次ローテーション）。管理UIの設定ページでログレベル、保持期間、最大ディレクトリサイズを設定できる。

コンテナ起動時には、構造化されたブートストラップ診断ログも`${SKILL_RUNNER_DATA_DIR}/logs/bootstrap.log`および`agent_bootstrap_report.json`に生成される。

## 次のステップ

- [Workflowについて学ぶ](../workflows/) — Skill-RunnerはWorkflowを実行する主要なバックエンドの一つ
- [ダッシュボードの概要](../dashboard) — タスクの実行ステータスを監視
- [SkillRunnerタブ](../sidebar/skillrunner-tab) — サイドバーでSkillRunner実行を表示・操作
