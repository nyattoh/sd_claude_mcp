import { SDApi, SDApiConfig, SDGenerationParams, SDGenerationResult } from './utils/sdApi';
import { optimizePrompt, OptimizedPromptResult } from './utils/promptOptimizer';
import { getRecommendedParameters } from './utils/parameterOptimizer';
import { ClaudeCanvas, initializeCanvas, getCanvasInstance } from './utils/claudeCanvas';

/**
 * Stable Diffusion APIを使用して画像を生成し、Claudeキャンバスに表示するMCP
 * @param input ユーザーからの入力（日本語の画像生成指示）
 * @returns 生成された画像データと表示結果
 */
export default async function handleRequest(input: string): Promise<any> {
  try {
    // APIクライアントの初期化
    const apiConfig: SDApiConfig = {
      host: '127.0.0.1',
      port: 7860,
      timeout: 60000 // 1分のタイムアウト
    };
    
    // SDAPIインスタンスの初期化
    const sdApi = new SDApi(apiConfig);
    
    // 接続テスト
    const isConnected = await sdApi.testConnection();
    if (!isConnected) {
      return {
        success: false,
        error: 'Stable Diffusion WebUIに接続できませんでした。WebUIが実行中であることを確認してください。',
        details: 'APIエンドポイント: http://127.0.0.1:7860'
      };
    }
    
    // 利用可能なモデル一覧を取得
    const models = await sdApi.getModels();
    if (models.length === 0) {
      return {
        success: false,
        error: 'Stable Diffusionモデルが見つかりませんでした。',
        details: 'WebUIにモデルがロードされていることを確認してください。'
      };
    }
    
    // 現在のモデルを最初のモデルに設定
    const currentModel = models[0].model_name;
    
    // 日本語プロンプトを最適化
    console.log(`プロンプト最適化処理を開始: "${input}"`);
    const optimizedResult = await optimizePrompt(input, currentModel);
    
    // 推奨パラメータの取得
    const recommendedParams = await getRecommendedParameters(optimizedResult.optimizedPrompt, currentModel);
    
    // 画像生成パラメータの設定
    const generationParams: SDGenerationParams = {
      prompt: optimizedResult.optimizedPrompt,
      negative_prompt: optimizedResult.negativePrompt,
      sampler_name: recommendedParams.sampler || 'DPM++ 2M Karras',
      steps: recommendedParams.steps || 30,
      cfg_scale: recommendedParams.cfgScale || 7,
      width: recommendedParams.width || 512,
      height: recommendedParams.height || 512,
      seed: -1, // ランダムシード
      batch_size: 1, // 一度に生成する画像数
      n_iter: 1, // バッチの繰り返し回数
    };
    
    console.log('画像生成を開始します:', generationParams);
    
    // 画像生成リクエスト
    const result = await sdApi.txt2img(generationParams);
    
    if (!result || !result.images || result.images.length === 0) {
      return {
        success: false,
        error: '画像生成に失敗しました。',
        details: '詳細なエラーはSDWebUIのログを確認してください。'
      };
    }
    
    // Claudeキャンバスの初期化
    const canvasClient = initializeCanvas({
      defaultWidth: generationParams.width || 512,
      defaultHeight: generationParams.height || 512
    });
    
    // キャンバスに画像を表示
    const displayResult = await canvasClient.displayImageOnCanvas({
      base64Data: result.images[0],
      caption: `Generated from: "${input}"`
    });
    
    // 結果を返す
    return {
      success: true,
      input: input,
      optimizedPrompt: optimizedResult.optimizedPrompt,
      negativePrompt: optimizedResult.negativePrompt,
      parameters: generationParams,
      imageData: result.images[0],
      canvasDisplayed: displayResult,
      modelUsed: currentModel,
      seeds: result.seeds || [-1]
    };
  } catch (error) {
    console.error('MCP実行エラー:', error);
    return {
      success: false,
      error: `画像生成処理エラー: ${error instanceof Error ? error.message : String(error)}`,
      details: error instanceof Error ? error.stack : undefined
    };
  }
}
