import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import handleRequest from './index';

const app = express();
const port = 3003;

// CORS設定
app.use(cors());

// JSONリクエスト解析
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// MCP APIエンドポイント
app.post('/api/mcp', async (req, res) => {
  try {
    // JSON-RPCリクエストの解析
    console.error('MCPリクエスト受信:', JSON.stringify(req.body));
    
    const { method, params, id, jsonrpc } = req.body;
    
    // プロトコルバージョンの確認
    if (!jsonrpc || jsonrpc !== '2.0') {
      return res.json({
        jsonrpc: '2.0',
        id: id || null,
        error: {
          code: -32600,
          message: '無効なJSON-RPCリクエストです'
        }
      });
    }
    
    // initializeメソッドの処理
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          capabilities: {
            supportsClaudeCanvas: true
          }
        }
      });
    }
    
    // generateメソッドの処理
    if (method === 'generate') {
      const input = params?.input;
      
      if (!input || typeof input !== 'string') {
        return res.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32602,
            message: '入力が無効です'
          }
        });
      }
      
      // 画像生成処理を実行
      const result = await handleRequest(input);
      
      // 結果をJSON-RPC形式で返す
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: `
## Stable Diffusion 画像生成結果

**元の指示**: ${result.input}

**最適化されたプロンプト**: ${result.optimizedPrompt}

**ネガティブプロンプト**: ${result.negativePrompt}

**使用モデル**: ${result.modelUsed}

**生成パラメータ**:
- Steps: ${result.parameters.steps}
- CFG Scale: ${result.parameters.cfg_scale}
- Sampler: ${result.parameters.sampler_name}
- サイズ: ${result.parameters.width}x${result.parameters.height}
- Seed: ${result.seeds ? result.seeds[0] : 'ランダム'}

![生成画像](data:image/png;base64,${result.imageData})
          `
        }
      });
    }
    
    // サポートしていないメソッドの場合
    return res.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `メソッド '${method}' はサポートされていません`
      }
    });
    
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
  res.json({ status: 'ok' });
});

// サーバー起動
app.listen(port, () => {
  // JSON-RPC通信に影響を与えないように標準エラー出力を使用
  console.error(`Stable Diffusion MCP サーバーが http://localhost:${port} で起動しました`);
  console.error('注意: 設定ファイルのendpointも同じポートに更新してください');
  console.error('APIエンドポイント: http://localhost:3003/api/mcp');
});
