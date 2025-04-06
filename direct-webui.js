// direct-webui.js - Stable Diffusion WebUIへの直接アクセスを提供するMCPプロキシ
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');  // uuid生成用（なければnpm install uuidでインストール）

// Stable Diffusion WebUI APIの設定
const SD_API_URL = 'http://127.0.0.1:7860';
const SD_WEBUI_URL = 'http://127.0.0.1:7860';  // WebUIのアドレス

// 画像保存ディレクトリ（存在確認と作成）
const IMAGE_DIR = path.join(__dirname, 'generated_images');
if (!fs.existsSync(IMAGE_DIR)) {
  try {
    fs.mkdirSync(IMAGE_DIR);
  } catch (err) {
    console.error('画像保存ディレクトリの作成に失敗しました。既存のディレクトリを使用します。');
  }
}

// Express設定
const app = express();
const port = 19001;

// CORS有効化
app.use(cors());

// リクエスト本文の解析
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// 簡易的な日英変換
function translateSimple(text) {
  // 英語キーワードに置き換え
  const translations = {
    '猫': 'cat',
    '黒猫': 'black cat',
    'フォトリアリスティック': 'photorealistic',
    'リアル': 'realistic',
    '写実的': 'photorealistic',
    '描いて': 'create',
    '作って': 'generate',
    '空': 'sky',
    '雲': 'clouds',
    '海': 'ocean',
    '山': 'mountain',
    '森': 'forest',
    '川': 'river',
    '花': 'flower',
    '木': 'tree',
    '犬': 'dog',
    '人物': 'person',
    '女性': 'woman',
    '男性': 'man',
    '子供': 'child',
    '夕日': 'sunset',
    '朝': 'morning',
    '夜': 'night',
    '街': 'city',
    '建物': 'building',
    '部屋': 'room',
    '自然': 'nature',
    '風景': 'landscape',
    'ファンタジー': 'fantasy',
    'アニメ': 'anime',
    '漫画': 'manga',
    '絵画': 'painting'
  };
  
  let translated = text;
  Object.entries(translations).forEach(([jp, en]) => {
    translated = translated.replace(new RegExp(jp, 'g'), en);
  });
  
  return translated;
}

// プロンプト最適化
function optimizePrompt(text) {
  // 翻訳
  const translated = translateSimple(text);
  
  // 最適化（黒猫向けの場合）
  if (translated.includes('black cat') || translated.includes('cat')) {
    return {
      prompt: `masterpiece, best quality, highly detailed, sharp focus, 8k, photorealistic, detailed fur, bright eyes, whiskers, ${translated}`,
      negative: 'lowres, bad anatomy, text, error, cropped, worst quality, low quality, jpeg artifacts, ugly, duplicate, deformed, blurry, bad proportions'
    };
  }
  
  // 一般的な最適化
  return {
    prompt: `masterpiece, best quality, highly detailed, sharp focus, 8k, ${translated}`,
    negative: 'lowres, bad anatomy, text, error, cropped, worst quality, low quality, jpeg artifacts, ugly, duplicate, deformed, blurry, bad proportions'
  };
}

// Base64画像データをファイルに保存
function saveImageToFile(base64Data) {
  const fileName = `sd_${Date.now()}_${uuidv4().substring(0, 8)}.png`;
  const filePath = path.join(IMAGE_DIR, fileName);
  
  // Base64ヘッダーを削除
  const base64Image = base64Data.split(';base64,').pop();
  
  // ファイルに保存
  fs.writeFileSync(filePath, Buffer.from(base64Image, 'base64'));
  
  return { fileName, filePath };
}

// 生成した画像ファイルへのアクセスを提供
app.use('/images', express.static(IMAGE_DIR));

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Direct WebUI Proxy is running' });
});

// MCP APIエンドポイント
app.post('/api/mcp', async (req, res) => {
  try {
    console.log('MCPリクエスト受信:', JSON.stringify(req.body));
    
    // 初期化リクエストに応答
    if (req.body.method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            handleRequest: {}
          },
          serverInfo: {
            name: 'sd-direct-webui-proxy',
            version: '1.0.0'
          }
        }
      });
    }
    
    // handleRequestメソッドの処理
    if (req.body.method === 'handleRequest') {
      const input = req.body.params?.input;
      
      if (!input) {
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: {
            code: -32602,
            message: '入力パラメータが不足しています'
          }
        });
      }
      
      try {
        // SD WebUIの接続チェック
        try {
          await axios.get(`${SD_API_URL}/sdapi/v1/samplers`, { timeout: 5000 });
        } catch (err) {
          throw new Error('Stable Diffusion WebUIに接続できません。WebUIが--apiフラグ付きで起動していることを確認してください。');
        }
        
        // プロンプト最適化
        const { prompt, negative } = optimizePrompt(input);
        
        // 画像生成パラメータ（軽量化設定）
        const params = {
          prompt: prompt,
          negative_prompt: negative,
          steps: 20,           // ステップ数削減
          width: 512,
          height: 512,
          cfg_scale: 7,
          sampler_name: 'Euler a', // 高速サンプラー
          batch_size: 1
        };
        
        // 画像生成リクエスト - タイムアウトを延長
        console.log('画像生成リクエスト送信中...');
        const sdResponse = await axios.post(`${SD_API_URL}/sdapi/v1/txt2img`, params, {
          timeout: 180000  // 3分のタイムアウト
        });
        
        // 画像情報解析
        const imageInfo = JSON.parse(sdResponse.data.info);
        const seed = imageInfo.seed || -1;
        
        // 画像データをBase64として取得
        const base64Image = sdResponse.data.images[0];
        
        // 画像をファイルに保存
        const { fileName, filePath } = saveImageToFile(base64Image);
        
        // 画像アクセスパス
        const imageUrl = `http://localhost:${port}/images/${fileName}`;
        
        // Txt2imgのURLを生成（直接WebUIでの再生成用）
        const webUiDirectUrl = `${SD_WEBUI_URL}/?prompt=${encodeURIComponent(prompt)}&negative_prompt=${encodeURIComponent(negative)}&steps=${params.steps}&width=${params.width}&height=${params.height}&cfg_scale=${params.cfg_scale}&sampler_name=${encodeURIComponent(params.sampler_name)}&seed=${seed}`;
        
        console.log('画像生成成功、応答を送信します');
        
        // レスポンス
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: `
## 🖼️ Stable Diffusion 画像生成結果

**元の指示**: ${input}

**最適化されたプロンプト**: ${prompt}

**ネガティブプロンプト**: ${negative}

**生成パラメータ**:
- Steps: ${params.steps}
- CFG Scale: ${params.cfg_scale}
- Sampler: ${params.sampler_name}
- サイズ: ${params.width}x${params.height}
- Seed: ${seed}

**画像は以下のURLで確認できます**:
[生成画像を表示](${imageUrl})

**Stable Diffusion WebUIで直接開く**:
[WebUIで開く/編集する](${webUiDirectUrl})

※画像はローカルに保存されました: ${filePath}
`
          }
        });
        
      } catch (error) {
        console.error('エラー:', error);
        
        let errorMessage = error instanceof Error ? error.message : String(error);
        
        // エラーメッセージをユーザーに返す
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: `## エラーが発生しました

画像生成中にエラーが発生しました。

**エラー**: ${errorMessage}

**確認事項**:
1. Stable Diffusion WebUIが起動していること (http://127.0.0.1:7860)
2. WebUIが --api オプション付きで起動していること

**WebUIを直接開いて確認**: [WebUI](${SD_WEBUI_URL})
`
          }
        });
      }
    } else {
      // 不明なメソッド
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        error: {
          code: -32601,
          message: `メソッド '${req.body.method}' はサポートされていません`
        }
      });
    }
    
  } catch (error) {
    console.error('MCPエラー:', error);
    return res.json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32603,
        message: `サーバーエラー: ${error instanceof Error ? error.message : String(error)}`
      }
    });
  }
});

// サーバー起動
app.listen(port, () => {
  console.log(`
==========================================================
StableDiffusion WebUI 連携プロキシが起動しました
URL: http://localhost:${port}
API: http://localhost:${port}/api/mcp
画像保存先: ${IMAGE_DIR}
==========================================================

詳細情報:
- このサーバーは生成画像をローカルに保存し、URLとして提供します
- Stable Diffusion WebUIへの直接リンクも生成します
- WebUIのURL: ${SD_WEBUI_URL}

使用方法:
- Claudeで「StableDiffusionで画像つくるよ」と入力してください
- 生成された画像のURLをクリックして表示できます
- WebUI直接リンクでさらに編集や調整ができます
`);
});
