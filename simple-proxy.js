// simplex-proxy.js - シンプルな実装のMCPプロキシ
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

// Stable Diffusion WebUI APIの設定
const SD_API_URL = 'http://127.0.0.1:7860';

// Express設定 (非常に高いポート番号を使用して競合を避ける)
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
  let translated = text
    .replace(/猫/g, 'cat')
    .replace(/黒猫/g, 'black cat')
    .replace(/フォトリアリスティック/g, 'photorealistic')
    .replace(/リアル/g, 'realistic')
    .replace(/写実的/g, 'photorealistic')
    .replace(/描いて/g, 'create')
    .replace(/作って/g, 'generate');
  
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
            name: 'sd-simple-proxy',
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
          await axios.get(`${SD_API_URL}/sdapi/v1/samplers`);
        } catch (err) {
          throw new Error('Stable Diffusion WebUIに接続できません。WebUIが--apiフラグ付きで起動していることを確認してください。');
        }
        
        // プロンプト最適化
        const { prompt, negative } = optimizePrompt(input);
        
        // 画像生成パラメータ
        const params = {
          prompt: prompt,
          negative_prompt: negative,
          steps: 30,
          width: 512,
          height: 512,
          cfg_scale: 7.5,
          sampler_name: 'DPM++ 2M Karras'
        };
        
        // 画像生成リクエスト
        console.log('画像生成リクエスト送信中...');
        const sdResponse = await axios.post(`${SD_API_URL}/sdapi/v1/txt2img`, params);
        
        // 生成情報の解析
        const imageInfo = JSON.parse(sdResponse.data.info);
        const seed = imageInfo.seed || -1;
        
        // 画像データ
        const image = sdResponse.data.images[0];
        
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

![生成画像](data:image/png;base64,${image})
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

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Simple SD Proxy is running' });
});

// サーバー起動
app.listen(port, () => {
  console.log(`
==========================================================
シンプルSD-MCP サーバーが http://localhost:${port} で起動しました
API: http://localhost:${port}/api/mcp
==========================================================

注意:
- このサーバーはnpmパッケージを使わないシンプルな実装です
- Claude設定でendpointを http://localhost:19001/api/mcp に更新してください
`);
});
