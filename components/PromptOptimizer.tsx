import React, { useState, useEffect, useCallback } from 'react';
import { fetchAvailableModels, fetchAvailableSamplers, setCurrentModel, generateImage, checkProgress, cancelGeneration } from '../utils/sdApi';
import { optimizePrompt, generateNegativePrompt } from '../utils/promptOptimizer';
import { getRecommendedParameters } from '../utils/parameterOptimizer';
import { initializeCanvas, getCanvasInstance, CanvasImageData } from '../utils/claudeCanvas';
import { PromptInput } from '../components/PromptInput';
import { OptimizedPrompt } from '../components/OptimizedPrompt';
import { ParameterControls } from '../components/ParameterControls';
import { ImageGallery } from '../components/ImageGallery';
import { ProgressIndicator } from '../components/ProgressIndicator';

const PromptOptimizer: React.FC = () => {
  // 入力と変換結果の状態
  const [inputPrompt, setInputPrompt] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isEditablePrompt, setIsEditablePrompt] = useState(false);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);

  // API接続情報
  const [apiHost, setApiHost] = useState('http://127.0.0.1');
  const [apiPort, setApiPort] = useState('7860');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // モデルとサンプラー
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableSamplers, setAvailableSamplers] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  // 生成パラメータ
  const [parameters, setParameters] = useState({
    model: '',
    sampler: '',
    cfgScale: 7,
    steps: 30,
    width: 512,
    height: 512,
    seed: -1,
    batchSize: 1,
    batchCount: 1,
    useRandomSeed: true
  });

  // 生成状態
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ step: 0, totalSteps: 0, percentage: 0, eta: 0 });
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1);
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);

  // エラー状態
  const [error, setError] = useState<string | null>(null);

  // キーワード説明
  const [keywordExplanations, setKeywordExplanations] = useState<Record<string, string>>({});

  // 推奨パラメータ
  const [recommendedSettings, setRecommendedSettings] = useState<any>(null);
  
  // Claudeキャンバス設定
  const [canvasEnabled, setCanvasEnabled] = useState(true);
  const [canvasStatus, setCanvasStatus] = useState<string | null>(null);

  // API接続を初期化
  const initializeConnection = useCallback(async () => {
    setConnectionError(null);
    setIsConnected(false);
    
    try {
      const models = await fetchAvailableModels(`${apiHost}:${apiPort}`);
      const samplers = await fetchAvailableSamplers(`${apiHost}:${apiPort}`);
      
      setAvailableModels(models.map((model: any) => model.title || model.name));
      setAvailableSamplers(samplers);
      
      if (models.length > 0) {
        setSelectedModel(models[0].title || models[0].name);
        setParameters(prev => ({ ...prev, model: models[0].title || models[0].name }));
        
        // 現在のモデルを設定
        await setCurrentModel(`${apiHost}:${apiPort}`, models[0].title || models[0].name);
      }
      
      setIsConnected(true);
    } catch (err) {
      setConnectionError(`API接続エラー: ${err instanceof Error ? err.message : String(err)}`);
      setIsConnected(false);
    }
  }, [apiHost, apiPort]);

  // プロンプト最適化
  const handleOptimizePrompt = useCallback(async () => {
    if (!inputPrompt.trim()) {
      setError('プロンプトを入力してください');
      return;
    }
    
    setError(null);
    
    try {
      const result = await optimizePrompt(inputPrompt);
      setOptimizedPrompt(result.optimizedPrompt);
      setNegativePrompt(await generateNegativePrompt(inputPrompt));
      setKeywordExplanations(result.keywordExplanations || {});
      
      // 推奨パラメータを取得
      const recommended = await getRecommendedParameters(result.optimizedPrompt, parameters.model);
      setRecommendedSettings(recommended);
      
      // 履歴に追加
      setPromptHistory(prev => [inputPrompt, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(`プロンプト最適化エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [inputPrompt, parameters.model]);

  // パラメータ変更ハンドラ
  const handleParameterChange = useCallback((newParams: any) => {
    setParameters(prev => ({ ...prev, ...newParams }));
  }, []);

  // 推奨パラメータ適用
  const applyRecommendedSettings = useCallback(() => {
    if (recommendedSettings) {
      setParameters(prev => ({ ...prev, ...recommendedSettings }));
    }
  }, [recommendedSettings]);

  // 画像生成
  const handleGenerateImage = useCallback(async () => {
    if (!isConnected) {
      setError('APIに接続されていません');
      return;
    }
    
    if (!optimizedPrompt) {
      setError('プロンプトを最適化してください');
      return;
    }
    
    setError(null);
    setIsGenerating(true);
    setProgress({ step: 0, totalSteps: parameters.steps, percentage: 0, eta: 0 });
    
    try {
      // 生成パラメータを作成
      const genParams = {
        prompt: optimizedPrompt,
        negative_prompt: negativePrompt,
        sampler_name: parameters.sampler,
        steps: parameters.steps,
        cfg_scale: parameters.cfgScale,
        width: parameters.width,
        height: parameters.height,
        seed: parameters.useRandomSeed ? -1 : parameters.seed,
        batch_size: parameters.batchSize,
        n_iter: parameters.batchCount
      };
      
      // 進捗モニタリング用のインターバル
      const progressInterval = setInterval(async () => {
        if (!isGenerating) {
          clearInterval(progressInterval);
          return;
        }
        
        try {
          const currentProgress = await checkProgress(`${apiHost}:${apiPort}`);
          setProgress({
            step: currentProgress.step,
            totalSteps: currentProgress.total,
            percentage: (currentProgress.step / currentProgress.total) * 100,
            eta: currentProgress.eta_relative
          });
          
          if (currentProgress.completed) {
            clearInterval(progressInterval);
          }
        } catch (err) {
          console.error('進捗確認エラー:', err);
        }
      }, 500);
      
      // 画像生成リクエスト
      const result = await generateImage(`${apiHost}:${apiPort}`, genParams);
      
      clearInterval(progressInterval);
      
      // 生成結果を保存
      const generatedImageData = result.images.map((img: string, index: number) => ({
        id: Date.now() + index,
        base64Data: img,
        parameters: {
          ...genParams,
          seed: result.seeds ? result.seeds[index] : 'unknown'
        }
      }));
      
      setGeneratedImages(generatedImageData);
      setSelectedImageIndex(0);
      
      // Claudeキャンバスに画像を表示
      if (canvasEnabled) {
        try {
          const canvasInstance = getCanvasInstance();
          
          // 単一画像の場合は直接表示
          if (generatedImageData.length === 1) {
            await canvasInstance.displayImageOnCanvas({
              base64Data: generatedImageData[0].base64Data,
              caption: `Generated from: "${inputPrompt}"`
            });
            setCanvasStatus('画像をClaudeキャンバスに表示しました');
          } 
          // 複数画像はグリッド表示
          else if (generatedImageData.length > 1) {
            const canvasImages: CanvasImageData[] = generatedImageData.map((img, idx) => ({
              base64Data: img.base64Data,
              caption: `Variation ${idx + 1} - ${inputPrompt}`
            }));
            
            await canvasInstance.displayImagesGrid(canvasImages, 2);
            setCanvasStatus(`${generatedImageData.length}枚の画像をClaudeキャンバスに表示しました`);
          }
        } catch (err) {
          setCanvasStatus(`キャンバス表示エラー: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      
      // 履歴に追加
      setGenerationHistory(prev => [{
        prompt: optimizedPrompt,
        negativePrompt,
        parameters: genParams,
        images: generatedImageData,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
      
    } catch (err) {
      setError(`画像生成エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
      setProgress({ step: 0, totalSteps: 0, percentage: 0, eta: 0 });
    }
  }, [isConnected, optimizedPrompt, negativePrompt, parameters, apiHost, apiPort, isGenerating]);

  // 生成キャンセル
  const handleCancelGeneration = useCallback(async () => {
    try {
      await cancelGeneration(`${apiHost}:${apiPort}`);
      setIsGenerating(false);
    } catch (err) {
      console.error('生成キャンセルエラー:', err);
    }
  }, [apiHost, apiPort]);

  // 画像選択
  const handleImageSelect = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  // 画像保存
  const handleSaveImage = useCallback((imageData: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = `sd-image-${Date.now()}.png`;
    link.click();
  }, []);

  // 初期接続
  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  // モデル変更時
  useEffect(() => {
    if (isConnected && selectedModel) {
      setCurrentModel(`${apiHost}:${apiPort}`, selectedModel)
        .then(() => {
          setParameters(prev => ({ ...prev, model: selectedModel }));
        })
        .catch(err => {
          setError(`モデル変更エラー: ${err instanceof Error ? err.message : String(err)}`);
        });
    }
  }, [selectedModel, isConnected, apiHost, apiPort]);

  return (
    <div className="w-full min-h-screen bg-white dark:bg-gray-800 p-4">
      <Card className="w-full bg-card">
        <CardHeader className="bg-card">
          <CardTitle className="bg-card text-2xl">Stable Diffusion プロンプト最適化</CardTitle>
          <CardDescription className="bg-card">
            日本語の指示からStable Diffusion用の最適なプロンプトを生成し、画像を作成します
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-card p-4">
          {/* API接続設定パネル */}
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">API設定</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1">
                <Label htmlFor="api-host">ホスト</Label>
                <Input
                  id="api-host"
                  value={apiHost}
                  onChange={(e) => setApiHost(e.target.value)}
                  placeholder="http://127.0.0.1"
                  disabled={isGenerating}
                />
              </div>
              <div className="w-32">
                <Label htmlFor="api-port">ポート</Label>
                <Input
                  id="api-port"
                  value={apiPort}
                  onChange={(e) => setApiPort(e.target.value)}
                  placeholder="7860"
                  disabled={isGenerating}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={initializeConnection}
                  disabled={isGenerating}
                  className="mb-0"
                >
                  接続
                </Button>
              </div>
            </div>
            {connectionError && (
              <div className="mt-2 text-red-500 text-sm">{connectionError}</div>
            )}
            {isConnected && (
              <div className="mt-2 text-green-500 text-sm flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                接続済み - 利用可能なモデル: {availableModels.length}
              </div>
            )}
          </div>

          {/* メインコンテンツ - 2カラムレイアウト */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左カラム: 入力と設定 */}
            <div>
              {/* プロンプト入力 */}
              <div className="mb-6">
                <PromptInput
                  value={inputPrompt}
                  onChange={setInputPrompt}
                  onSubmit={handleOptimizePrompt}
                  isProcessing={isGenerating}
                  inputHistory={promptHistory}
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={handleOptimizePrompt}
                    disabled={!inputPrompt.trim() || isGenerating}
                  >
                    プロンプト最適化
                  </Button>
                </div>
              </div>

              {/* パラメータ設定パネル */}
              {isConnected && (
                <div className="mb-6">
                  <ParameterControls
                    parameters={parameters}
                    onParameterChange={handleParameterChange}
                    availableModels={availableModels}
                    availableSamplers={availableSamplers}
                    recommendedSettings={recommendedSettings}
                    applyRecommended={applyRecommendedSettings}
                    isConnected={isConnected}
                  />
                </div>
              )}

              {/* 生成ボタン */}
              <div className="flex justify-between items-center mb-6">
                <Button
                  onClick={handleGenerateImage}
                  disabled={!isConnected || !optimizedPrompt || isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  画像生成
                </Button>
                {isGenerating && (
                  <Button
                    onClick={handleCancelGeneration}
                    variant="destructive"
                  >
                    キャンセル
                  </Button>
                )}
              </div>

              {/* 進捗インジケータ */}
              {(isGenerating || error) && (
                <div className="mb-6">
                  <ProgressIndicator
                    progress={progress}
                    isGenerating={isGenerating}
                    onCancel={handleCancelGeneration}
                    error={error}
                  />
                </div>
              )}
            </div>

            {/* 右カラム: 結果表示 */}
            <div>
              {/* 最適化プロンプト表示 */}
              {optimizedPrompt && (
                <div className="mb-6">
                  <OptimizedPrompt
                    originalInput={inputPrompt}
                    optimizedPrompt={optimizedPrompt}
                    negativePrompt={negativePrompt}
                    onPromptChange={setOptimizedPrompt}
                    onNegativePromptChange={setNegativePrompt}
                    isEditable={isEditablePrompt}
                    setIsEditable={setIsEditablePrompt}
                    keywordExplanations={keywordExplanations}
                  />
                </div>
              )}

              {/* 生成画像ギャラリー */}
              {generatedImages.length > 0 && (
                <div>
                  <ImageGallery
                    images={generatedImages}
                    onImageSelect={handleImageSelect}
                    onSaveImage={handleSaveImage}
                    onCopyPrompt={() => navigator.clipboard.writeText(optimizedPrompt)}
                    selectedImageIndex={selectedImageIndex}
                    isGenerating={isGenerating}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 履歴セクション */}
          {generationHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-2">生成履歴</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {generationHistory.map((entry, index) => (
                  <div key={index} className="border rounded-lg p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                    {entry.images[0] && (
                      <div className="aspect-square overflow-hidden rounded">
                        <img 
                          src={`data:image/png;base64,${entry.images[0].base64Data}`} 
                          alt={`生成画像 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="mt-2 text-xs truncate">{entry.prompt.substring(0, 30)}...</div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptOptimizer;