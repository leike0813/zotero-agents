# インストールガイド

## システム要件

- **Zotero**: 7.0以降（Zotero 9推奨）
- **プラットフォーム**: Windows 10以降、macOS 12以降、Linux（x86_64 / x86 / ARM64 / ARM）

> **Zoteroバージョンについて**: 本プラグインはZotero 9で開発・テストされている。Zotero 8は理論上完全にサポートされている（プラグインフレームワークはZotero 8/9間で大きな変更なし）。Zotero 7も理論上サポートされるはずだが、リソースの制約により十分にテストされてはいない。今後のメンテナンスはZotero 9に注力する。Zotero 7で問題が発生した場合は[Issues](https://github.com/leike0813/zotero-agents/issues)で報告されたい。

## プラグインのインストール

### GitHub/Giteeリリースから（推奨）

1. [GitHub Releases](https://github.com/leike0813/zotero-agents/releases)または[Gitee Releasesミラー](https://gitee.com/leike0813/zotero-agents/releases)にアクセス
2. 最新の`.xpi`ファイルをダウンロード
3. Zoteroで**ツール → アドオン**を開く
4. 歯車アイコンをクリックし、**ファイルからアドオンをインストール...**を選択
5. ダウンロードした`.xpi`ファイルを選択

### ソースからビルド

```bash
git clone https://github.com/leike0813/zotero-agents.git
cd zotero-agents
npm install
npm run build
```

ビルド出力は`.scaffold/build/`ディレクトリに配置される。

## 公式Workflowパッケージのインストール

本プラグインには**組み込みのビジネスロジックはない**。すべてのWorkflowは公式Workflowパッケージとして別途提供される。

### 方法1：メニューからのインストール（推奨）

1. Zoteroを再起動後、任意のアイテムを右クリック → **Zotero Agents** → **📦 公式Workflowパッケージをインストール**
2. プラグインがGitHub / Giteeから最新の公式パッケージを自動的にダウンロード
3. 完了すると成功の通知が表示される。ダッシュボードですべての公式Workflowが参照可能になる

### 方法2：環境設定からのインストール

1. **Zotero → 設定 → Zotero Agents**を開く
2. **Workflow設定**セクションで**公式Workflowパッケージをインストール**をクリック
3. 更新チャネル（stable / beta / dev）の切り替えや更新の確認もここで可能

### 更新メカニズム

- プラグインは起動時に公式パッケージの新バージョンを自動的にチェック
- 新バージョンが利用可能な場合は確認ダイアログが表示される
- 更新後にWorkflowリストが自動的にリロードされる

公式Workflowパッケージリポジトリ：[GitHub](https://github.com/leike0813/zotero-agents-workflows) · [Giteeミラー](https://gitee.com/leike0813/zotero-agents-workflows)

## インストールの検証

1. Zoteroを再起動
2. Zoteroツールバーに**Zotero Agents**アイコンが表示される
3. 任意のアイテムを右クリックすると、**Zotero Agents**サブメニューが表示される（利用可能なWorkflowを含む）

右クリックメニューに**📦 公式Workflowパッケージをインストール**オプションのみが表示される場合、公式パッケージはまだインストールされていない。上記の手順に従ってインストールされたい。インストールが成功したら、[はじめに](/getting-started)に進み、バックエンドを設定して最初のWorkflowを実行する。
