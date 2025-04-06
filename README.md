# Stable Diffusion MCP for Claude

## 概要

このプロジェクトは、Claude AIのキャンバス機能と連携して、日本語の指示を受け取り、Stable Diffusion用に最適化されたプロンプトに変換して画像生成を行うMCPサーバーを提供します。

## 機能

- 日本語による自然な指示文からStable Diffusion用の最適なプロンプトを生成
- Stable Diffusion Web UIのAPIを利用した高品質な画像生成
- Claude AIのキャンバスに直接画像を表示
- 生成パラメータの詳細表示

## システム要件

- Node.js 18以上
- TypeScript
- Stable Diffusion Web UI（API有効化済み、ポート7860で実行中）
- Claude AI（デスクトップアプリまたはWeb版）

## インストール

1. リポジトリをクローンするか、ファイルをダウンロードします

```bash
git clone https://github.com/yourusername/sd-mcp.git
cd sd-mcp
```

2. 依存パッケージをインストールします

```bash
npm install
```

## 設定

### Stable Diffusion Web UI

1. Stable Diffusion Web UIを起動し、APIアクセスが有効になっていることを確認します
   - 起動オプションに `--api` フラグを追加してください
   - デフォルトポート: 7860

webui-user.batファイルを編集して、COMMANDLINE_ARGSに --api フラグを追加します：

```
@echo off

set PYTHON=
set GIT=
set VENV_DIR=
set COMMANDLINE_ARGS=--api

call webui.bat
```

### Claude設定ファイル

Claude デスクトップアプリケーションの設定ファイル（claude_desktop_config.json）を以下のように設定します：

```json
{
  "mcps": [
    {
      "name": "Stable Diffusion プロンプト最適化",
      "description": "日本語指示をStable Diffusion用の最適なプロンプトに変換し、画像を生成します",
      "endpoint": "http://localhost:19001/api/mcp",
      "enabled": true,
      "auth": {
        "type": "none"
      },
      "ui": {
        "icon": "🖼️",
        "category": "画像生成",
        "shortDescription": "StableDiffusionで画像生成",
        "examplePrompts": [
          "青い空と緑の草原の風景を描いて",
          "夕暮れの東京の街並みを写実的に",
          "宇宙を飛ぶ猫のファンタジーイラスト",
          "暖かい雰囲気の北欧風インテリア",
          "フォトリアリスティックな黒猫の画像"
        ]
      }
    }
  ]
}
```

## 使用方法

### シンプルな実装を使用する場合（推奨）

1. simple-proxy.jsまたはdirect-webui.jsを使って、JavaScriptベースの実装を起動します：

```bash
# JavaScript版（依存パッケージが少なく安定）
node simple-proxy.js
# または
node direct-webui.js
```

2. Claudeを起動し、日本語で画像の説明を入力します（例: 「夕焼けの海辺で遊ぶ子供たちを写実的に描いて」）

### TypeScript版（開発用）

1. TypeScript版のMCPサーバーを起動します：

```bash
npx ts-node direct-proxy.ts
```

2. Claudeを起動し、サイドパネルから「Stable Diffusion プロンプト最適化」ツールを選択します

## 実装バリエーション

このプロジェクトには複数の実装が含まれています：

1. **direct-proxy.ts**: TypeScript版のMCPプロキシ（ポート8080）
2. **simple-proxy.js**: 依存関係の少ないシンプルなJavaScript実装（ポート19001）
3. **direct-webui.js**: 画像をローカルに保存し、WebUIへのリンクも提供する拡張版（ポート19001）

必要に応じて、適切な実装を選択してください。

## トラブルシューティング

### ポート競合が発生した場合

`Error: listen EADDRINUSE: address already in use :::9001` のようなエラーが表示される場合：

```bash
# すべてのNodeプロセスを終了（Windows）
taskkill /F /IM node.exe

# その後サーバーを再起動
node simple-proxy.js
```

### Stable Diffusion Web UIに接続できない場合

1. Stable Diffusion Web UIが実行されているか確認してください（http://localhost:7860）
2. WebUIが起動時に `--api` オプションが指定されているか確認してください
   - webui-user.batファイルを編集して`--api`フラグを追加してください
3. ファイアウォールがAPI接続を許可しているか確認してください

### 生成に時間がかかる場合

生成に時間がかかる場合、以下の調整を試してください：

1. **simple-proxy.js**または**direct-webui.js**内のパラメータを調整：
   - steps: 20に減らす（デフォルト30）
   - sampler_name: 'Euler a'に変更（高速）

### Claude MCPが接続できない場合

1. サーバーが正常に起動していることを確認（ログメッセージを確認）
2. claude_desktop_config.jsonのendpointが正しいポートを指しているか確認：
   - http://localhost:19001/api/mcp（simple-proxy.js/direct-webui.js用）
   - http://localhost:8080/api/mcp（direct-proxy.ts用）

## ログ確認方法

サーバーのログはコンソールに出力されます。エラーの詳細はそこで確認できます。画像生成リクエストが正常に送信されているか、日本語テキストがどのように変換されているかなど、デバッグ情報が表示されます。

## ライセンス

MIT

## 謝辞

- Stable Diffusion コミュニティ
- Anthropic Claude チーム
