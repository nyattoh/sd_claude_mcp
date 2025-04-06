import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';

// Stable Diffusion WebUI APIの設定
const SD_API_URL = 'http://127.0.0.1:7860';

// Express設定
const app = express();
const port = 8080; // ポートを新しい値に変更

// CORS有効化
app.use(cors());

// リクエスト本文の解析（JSONと大きいファイルサイズに対応）
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// 日本語テキストをStable Diffusion用の英語プロンプトに最適化する関数
async function optimizeJapanesePrompt(japaneseText: string): Promise<{
  optimizedPrompt: string;
  negativePrompt: string;
}> {
  console.error(`日本語テキスト最適化: "${japaneseText}"`);
  
  try {
    // ここでは簡易版の翻訳を使用
    let translatedText = japaneseText;
    
    // 基本的な日英翻訳マッピング
    const japaneseToEnglishMap: Record<string, string> = {
      '空': 'sky',
      '雲': 'clouds',
      '海': 'ocean',
      '山': 'mountain',
      '森': 'forest',
      '川': 'river',
      '花': 'flower',
      '木': 'tree',
      '猫': 'cat',
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
      '写実的': 'photorealistic',
      'リアル': 'realistic',
      'ファンタジー': 'fantasy',
      'アニメ': 'anime',
      '漫画': 'manga',
      '絵画': 'painting',
      '描いて': 'draw',
      '生成して': 'generate',
      '作って': 'create',
      '黒猫': 'black cat',
      'フォトリアリスティック': 'photorealistic',
      'リアリスティック': 'realistic'
    };
    
    // 簡易翻訳
    Object.entries(japaneseToEnglishMap).forEach(([jp, en]) => {
      translatedText = translatedText.replace(new RegExp(jp, 'g'), en);
    });
    
    // プロンプトの強化
    const enhancedPrompt = enhancePrompt(translatedText);
    
    // モデルや画像タイプに基づいてネガティブプロンプトをカスタマイズ
    let negativePrompt = 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, deformed, mutated, poorly drawn';
    
    // 猫の画像の場合、関連する否定的な要素を追加
    if (japaneseText.includes('猫') || translatedText.includes('cat')) {
      negativePrompt += ', human face, person, human, bad animal anatomy';
    }
    
    // 風景の場合
    if (japaneseText.includes('風景') || translatedText.includes('landscape')) {
      negativePrompt += ', buildings, people, deformed landscape';
    }
    
    console.error(`最適化されたプロンプト: "${enhancedPrompt}"`);
    
    return {
      optimizedPrompt: enhancedPrompt,
      negativePrompt
    };
  } catch (error) {
    console.error('プロンプト最適化エラー:', error);
    
    // エラー時はシンプルに英語化したテキストを返す
    return {
      optimizedPrompt: `high quality, detailed, ${japaneseText}`,
      negativePrompt: 'lowres, bad anatomy, bad hands, text, error'
    };
  }
}

// プロンプトを強化する関数
function enhancePrompt(basePrompt: string): string {
  // 高品質化のための追加キーワード
  const qualityEnhancements = 'masterpiece, best quality, highly detailed, sharp focus, 8k';
  
  // 猫関連のプロンプトの場合、猫の特徴を強調
  if (basePrompt.toLowerCase().includes('cat')) {
    return `${qualityEnhancements}, detailed fur, whiskers, bright eyes, ${basePrompt}`;
  }
  
  // プロンプトの先頭に品質向上ワードを追加
  return `${qualityEnhancements}, ${basePrompt}`;
}

// MCP APIエンドポイント
app.post('/api/mcp', async (req, res) => {
  try {
    // JSONリクエストの内容をログ出力
    console.error('MCPリクエスト受信:', JSON.stringify(req.body));
    
    const { method, params, id } = req.body;
    
    // 初期化リクエストの処理
    if (method === 'initialize') {
      console.error('初期化リクエスト受信、応答を送信します');
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            handleRequest: {}
          },
          serverInfo: {
            name: 'stable-diffusion-direct-proxy',
            version: '1.0.0'
          }
        }
      });
    } 
    
    // handle RequestメソッドのJSON-RPC処理
    if (method === 'handleRequest') {
      const input = params?.input;
      
      if (!input || typeof input !== 'string') {
        return res.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32602,
            message: '入力パラメータが不足しています'
          }
        });
      }
      
      try {
        // Stable Diffusion WebUIに接続確認
        try {
          await axios.get(`${SD_API_URL}/sdapi/v1/samplers`);
        } catch (err) {
          throw new Error(
            'Stable Diffusion WebUIに接続できません。WebUIが--apiフラグ付きで起動していることを確認してください。' +
            'デフォルトURL: http://127.0.0.1:7860'
          );
        }
        
        // 日本語プロンプトの最適化
        const { optimizedPrompt, negativePrompt } = await optimizeJapanesePrompt(input);
        
        // 生成パラメータの設定
        const generationParams = {
          prompt: optimizedPrompt,
          negative_prompt: negativePrompt,
          steps: 30,
          width: 512,
          height: 512,
          cfg_scale: 7.5,
          sampler_name: 'DPM++ 2M Karras',
          batch_size: 1,
          seed: -1 // ランダムシード
        };
        
        // txt2imgエンドポイントへのアクセス
        console.error('Stable Diffusion APIに画像生成リクエスト送信...');
        const sdResponse = await axios.post(`${SD_API_URL}/sdapi/v1/txt2img`, generationParams);
        
        // 生成情報の解析
        const imageInfo = JSON.parse(sdResponse.data.info);
        const seed = imageInfo.seed;
        
        // 画像データの取得
        const image = sdResponse.data.images[0];
        
        console.error('画像生成成功、応答を送信します');
        
        // Claude MCPレスポンス形式
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: `
## 🖼️ Stable Diffusion 画像生成結果

**元の指示**: ${input}

**最適化されたプロンプト**: ${optimizedPrompt}

**ネガティブプロンプト**: ${negativePrompt}

**生成パラメータ**:
- Steps: ${generationParams.steps}
- CFG Scale: ${generationParams.cfg_scale}
- Sampler: ${generationParams.sampler_name}
- サイズ: ${generationParams.width}x${generationParams.height}
- Seed: ${seed}

![生成画像](data:image/png;base64,${image})
            `
          }
        });
        
      } catch (error) {
        console.error('Stable Diffusion APIエラー:', error);
        
        // エラーメッセージの生成
        let errorMessage = error instanceof Error ? error.message : String(error);
        
        // より詳細なエラーメッセージ
        if (errorMessage.includes('ECONNREFUSED')) {
          errorMessage = 'Stable Diffusion WebUIに接続できません。WebUIが起動しているか確認してください。';
        }
        
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: `## エラーが発生しました

申し訳ありませんが、画像生成中にエラーが発生しました。

**エラー詳細**: ${errorMessage}

**確認事項**:
1. Stable Diffusion WebUIが起動していること
2. WebUIが \`--api\` オプション付きで起動していること
3. WebUIが http://127.0.0.1:7860 でアクセス可能であること

**現在の状態を確認して、もう一度お試しください。**`
          }
        });
      }
    } else {
      // サポートされていないメソッドの処理
      return res.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `メソッド '${method}' はサポートされていません`
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
        message: `サーバーエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
      }
    });
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Stable Diffusion Direct Proxy is running' });
});

// サーバー起動
app.listen(port, () => {
  console.error(`
==========================================================
Stable Diffusion Direct Proxy サーバーが起動しました
URL: http://localhost:${port}
API: http://localhost:${port}/api/mcp
==========================================================

注意:
1. Stable Diffusion WebUIが http://127.0.0.1:7860 で起動していることを確認してください
2. WebUIが --api フラグ付きで起動されていることを確認してください
3. Claude Desktop Configのendpointを http://localhost:8080/api/mcp に更新してください

サーバーが起動しました。Claudeで「StableDiffusionで画像つくるよ」といった指示を入力してみてください。
  `);
});
