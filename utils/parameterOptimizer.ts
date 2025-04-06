import promptOptimizer from '../utils/promptOptimizer';

// プロンプト複雑性分析
function analyzePromptComplexity(prompt: string): number {
  // 簡易的な複雑性スコア計算
  // 単語数、特殊キーワード、カンマ区切りの数などから複雑性を評価
  const words = prompt.split(/\s+/).length;
  const specialTerms = (prompt.match(/\b(detailed|intricate|complex|elaborate)\b/gi) || []).length;
  const commas = (prompt.match(/,/g) || []).length;
  
  return Math.min(10, (words / 10) + specialTerms + (commas / 5));
}

// アートスタイル検出
function detectArtStyle(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('anime') || lowerPrompt.includes('manga') || lowerPrompt.includes('cartoon')) {
    return 'anime';
  } else if (lowerPrompt.includes('photo') || lowerPrompt.includes('realistic') || lowerPrompt.includes('photograph')) {
    return 'realistic';
  } else if (lowerPrompt.includes('painting') || lowerPrompt.includes('artistic') || lowerPrompt.includes('oil')) {
    return 'artistic';
  } else if (lowerPrompt.includes('3d') || lowerPrompt.includes('render') || lowerPrompt.includes('cg')) {
    return '3d';
  }
  
  return 'general';
}

// モデルカテゴリの定義
export enum ModelCategory {
  ANIME = 'anime',
  REALISTIC = 'realistic',
  GENERAL = 'general',
  ARTISTIC = 'artistic',
  STYLIZED = 'stylized',
}

// サンプラータイプの定義
export enum SamplerCategory {
  FAST = 'fast',
  DETAILED = 'detailed',
  BALANCED = 'balanced',
  CREATIVE = 'creative',
}

// パラメータ型定義
export interface GenerationParameters {
  model: string;
  sampler: string;
  cfgScale: number;
  steps: number;
  width: number;
  height: number;
  seed: number | null;
  batchSize: number;
  batchCount: number;
  negativePrompt?: string;
}

// モデル情報のインターフェース
export interface ModelInfo {
  name: string;
  category: ModelCategory;
  preferredSamplers: string[];
  idealCfgRange: [number, number];
  recommendedStepRange: [number, number];
  supportedResolutions: { width: number; height: number }[];
}

// サンプラー情報のインターフェース
export interface SamplerInfo {
  name: string;
  category: SamplerCategory;
  speedRating: number; // 1-10, 10が最速
  detailRating: number; // 1-10, 10が最も詳細
  idealForStyles: ModelCategory[];
}

// モデルカテゴリ判定
export const categorizeModel = (modelName: string): ModelCategory => {
  const lowerName = modelName.toLowerCase();
  
  if (lowerName.includes('anime') || lowerName.includes('manga') || lowerName.includes('waifu')) {
    return ModelCategory.ANIME;
  } else if (lowerName.includes('realistic') || lowerName.includes('photo') || lowerName.includes('real')) {
    return ModelCategory.REALISTIC;
  } else if (lowerName.includes('art') || lowerName.includes('paint') || lowerName.includes('artist')) {
    return ModelCategory.ARTISTIC;
  } else if (lowerName.includes('style') || lowerName.includes('cartoon')) {
    return ModelCategory.STYLIZED;
  }
  
  return ModelCategory.GENERAL;
};

// サンプラーデータベース
const samplerDatabase: SamplerInfo[] = [
  {
    name: 'Euler a',
    category: SamplerCategory.FAST,
    speedRating: 9,
    detailRating: 6,
    idealForStyles: [ModelCategory.ANIME, ModelCategory.STYLIZED]
  },
  {
    name: 'DPM++ 2M Karras',
    category: SamplerCategory.DETAILED,
    speedRating: 5,
    detailRating: 9,
    idealForStyles: [ModelCategory.REALISTIC, ModelCategory.GENERAL]
  },
  {
    name: 'DPM++ SDE Karras',
    category: SamplerCategory.CREATIVE,
    speedRating: 4,
    detailRating: 8,
    idealForStyles: [ModelCategory.ARTISTIC, ModelCategory.STYLIZED]
  },
  {
    name: 'DDIM',
    category: SamplerCategory.FAST,
    speedRating: 8,
    detailRating: 5,
    idealForStyles: [ModelCategory.GENERAL, ModelCategory.ANIME]
  },
  {
    name: 'LMS',
    category: SamplerCategory.BALANCED,
    speedRating: 7,
    detailRating: 7,
    idealForStyles: [ModelCategory.GENERAL]
  }
];

// プロンプト複雑度による最適なステップ数算出
export const getOptimalStepCount = (prompt: string, artStyle: string): number => {
  const complexity = analyzePromptComplexity(prompt);
  
  // 基本ステップ数の決定
  let baseSteps: number;
  if (complexity < 0.3) {
    baseSteps = 25; // シンプルな構成
  } else if (complexity < 0.6) {
    baseSteps = 35; // 中程度の複雑さ
  } else {
    baseSteps = 50; // 非常に複雑
  }
  
  // 画風による調整
  if (artStyle === 'anime') {
    return Math.max(20, baseSteps - 5); // アニメは少し少なめでOK
  } else if (artStyle === 'realistic') {
    return Math.min(80, baseSteps + 10); // 写実的なものは多めに
  } else if (artStyle === 'abstract') {
    return Math.max(20, baseSteps - 10); // 抽象的なものは少なめでも
  }
  
  return baseSteps;
};

// 最適なCFG値算出
export const getOptimalCfgScale = (prompt: string, artStyle: string): number => {
  const complexity = analyzePromptComplexity(prompt);
  
  // 画風ベースの基本CFG値
  let baseCfg: number;
  if (artStyle === 'anime') {
    baseCfg = 8; // アニメ調: 7-9
  } else if (artStyle === 'realistic') {
    baseCfg = 10; // 写実調: 8-12
  } else if (artStyle === 'abstract') {
    baseCfg = 6; // 抽象的: 5-7
  } else {
    baseCfg = 7.5; // デフォルト
  }
  
  // 複雑さに応じた微調整
  const adjustmentFactor = (complexity - 0.5) * 2; // -1.0〜1.0の範囲
  
  return Math.max(3, Math.min(15, baseCfg + adjustmentFactor));
};

// 最適な解像度の提案
export const getOptimalResolution = (
  prompt: string, 
  artStyle: string,
  aspectRatioHint?: string
): { width: number; height: number } => {
  // デフォルト解像度
  let width = 512;
  let height = 512;
  
  // アスペクト比ヒントの解析
  if (aspectRatioHint) {
    if (aspectRatioHint.includes('portrait') || aspectRatioHint.includes('縦長')) {
      width = 512;
      height = 768;
    } else if (aspectRatioHint.includes('landscape') || aspectRatioHint.includes('横長')) {
      width = 768;
      height = 512;
    } else if (aspectRatioHint.includes('square') || aspectRatioHint.includes('正方形')) {
      width = 512;
      height = 512;
    } else if (aspectRatioHint.includes('widescreen') || aspectRatioHint.includes('ワイド')) {
      width = 896;
      height = 512;
    }
  } else {
    // プロンプトから推測
    if (prompt.toLowerCase().includes('portrait') || 
        prompt.toLowerCase().includes('face') || 
        prompt.toLowerCase().includes('person') ||
        prompt.toLowerCase().includes('ポートレート') || 
        prompt.toLowerCase().includes('顔') || 
        prompt.toLowerCase().includes('人物')) {
      width = 512;
      height = 768;
    } else if (prompt.toLowerCase().includes('landscape') || 
               prompt.toLowerCase().includes('scenery') || 
               prompt.toLowerCase().includes('wide') ||
               prompt.toLowerCase().includes('風景') || 
               prompt.toLowerCase().includes('景色') || 
               prompt.toLowerCase().includes('ワイド')) {
      width = 768;
      height = 512;
    }
  }
  
  // 画風による調整
  if (artStyle === 'detailed' || artStyle === 'realistic') {
    // 詳細な画像にはより高い解像度
    width = Math.min(1024, width * 1.5);
    height = Math.min(1024, height * 1.5);
  }
  
  // 8の倍数に丸める（Stable Diffusionの要件）
  width = Math.floor(width / 8) * 8;
  height = Math.floor(height / 8) * 8;
  
  return { width, height };
};

// モデルに最適なサンプラーを推奨
export const recommendSampler = (
  modelName: string, 
  prompt: string
): string => {
  const modelCategory = categorizeModel(modelName);
  const artStyle = detectArtStyle(prompt);
  const complexity = analyzePromptComplexity(prompt);
  
  // 画風と複雑さに基づいてサンプラーを選択
  let recommendedSamplers: SamplerInfo[] = [];
  
  // まずはモデルカテゴリに合ったサンプラーをフィルタリング
  recommendedSamplers = samplerDatabase.filter(sampler => 
    sampler.idealForStyles.includes(modelCategory)
  );
  
  // 複雑さに応じてソート
  if (complexity > 0.7) {
    // 複雑なプロンプトには詳細度の高いサンプラー
    recommendedSamplers.sort((a, b) => b.detailRating - a.detailRating);
  } else if (complexity < 0.3) {
    // シンプルなプロンプトには速度重視
    recommendedSamplers.sort((a, b) => b.speedRating - a.speedRating);
  } else {
    // バランス型
    recommendedSamplers.sort((a, b) => 
      (b.detailRating * 0.6 + b.speedRating * 0.4) - 
      (a.detailRating * 0.6 + a.speedRating * 0.4)
    );
  }
  
  return recommendedSamplers.length > 0 ? recommendedSamplers[0].name : 'Euler a';
};

// バッチサイズとカウントの最適化
export const optimizeBatchSettings = (
  prompt: string,
  availableVRAM: number = 8 // デフォルト8GB
): { batchSize: number; batchCount: number } => {
  const complexity = analyzePromptComplexity(prompt);
  
  // 複雑さとVRAMに基づいてバッチサイズを決定
  let batchSize: number;
  if (availableVRAM >= 12 && complexity < 0.5) {
    batchSize = 4;
  } else if (availableVRAM >= 8 && complexity < 0.7) {
    batchSize = 2;
  } else {
    batchSize = 1;
  }
  
  // バッチカウント: 探索的な生成には複数のバリエーションが有用
  const batchCount = 4 / batchSize; // 合計4枚になるよう調整
  
  return { batchSize, batchCount };
};

// プロンプトと利用可能なモデル・サンプラーから最適パラメータセットを生成
export const getOptimizedParameters = (
  prompt: string,
  availableModels: string[],
  availableSamplers: string[],
  currentParams?: Partial<GenerationParameters>
): GenerationParameters => {
  // 芸術スタイルを検出
  const artStyle = detectArtStyle(prompt);
  
  // 最適なモデルを選択（現在はシンプルな実装）
  let model = currentParams?.model || availableModels[0];
  
  // 現在のパラメータがあれば基本として使用、なければ新規作成
  const baseParams: GenerationParameters = {
    model: model,
    sampler: currentParams?.sampler || recommendSampler(model, prompt),
    cfgScale: currentParams?.cfgScale || getOptimalCfgScale(prompt, artStyle),
    steps: currentParams?.steps || getOptimalStepCount(prompt, artStyle),
    width: currentParams?.width || 512,
    height: currentParams?.height || 512,
    seed: currentParams?.seed || null,
    batchSize: currentParams?.batchSize || 1,
    batchCount: currentParams?.batchCount || 1,
    negativePrompt: currentParams?.negativePrompt || '',
  };
  
  // 解像度の最適化（現在の解像度があれば尊重）
  if (!currentParams?.width || !currentParams?.height) {
    const resolution = getOptimalResolution(prompt, artStyle);
    baseParams.width = resolution.width;
    baseParams.height = resolution.height;
  }
  
  // バッチ設定の最適化（現在の設定があれば尊重）
  if (!currentParams?.batchSize || !currentParams?.batchCount) {
    const batchSettings = optimizeBatchSettings(prompt);
    baseParams.batchSize = batchSettings.batchSize;
    baseParams.batchCount = batchSettings.batchCount;
  }
  
  return baseParams;
};

// 特定のモデルとプロンプトに対するパラメータ相関関係分析
export const analyzeParameterCorrelation = (
  modelName: string,
  prompt: string
): {
  cfgStepCorrelation: 'positive' | 'negative' | 'neutral';
  recommendedCombinations: Array<{ cfg: number; steps: number; sampler: string }>;
} => {
  const artStyle = detectArtStyle(prompt);
  const complexity = analyzePromptComplexity(prompt);
  const modelCategory = categorizeModel(modelName);
  
  // CFGとステップ数の相関関係
  let cfgStepCorrelation: 'positive' | 'negative' | 'neutral' = 'neutral';
  
  if (modelCategory === ModelCategory.REALISTIC || complexity > 0.7) {
    // 写実的モデルや複雑なプロンプトでは、CFGとステップ数は正の相関
    cfgStepCorrelation = 'positive';
  } else if (modelCategory === ModelCategory.ARTISTIC || artStyle === 'abstract') {
    // 芸術的モデルや抽象的なプロンプトでは、低CFG・低ステップか高CFG・高ステップが良い
    cfgStepCorrelation = 'negative';
  }
  
  // おすすめの組み合わせ
  const recommendedCombinations: Array<{ cfg: number; steps: number; sampler: string }> = [];
  
  if (modelCategory === ModelCategory.ANIME) {
    recommendedCombinations.push(
      { cfg: 7, steps: 25, sampler: 'Euler a' },
      { cfg: 8, steps: 30, sampler: 'DPM++ 2M Karras' },
      { cfg: 9, steps: 35, sampler: 'DDIM' }
    );
  } else if (modelCategory === ModelCategory.REALISTIC) {
    recommendedCombinations.push(
      { cfg: 9, steps: 35, sampler: 'DPM++ 2M Karras' },
      { cfg: 11, steps: 45, sampler: 'DPM++ SDE Karras' },
      { cfg: 12, steps: 55, sampler: 'LMS' }
    );
  } else if (modelCategory === ModelCategory.ARTISTIC) {
    recommendedCombinations.push(
      { cfg: 5, steps: 25, sampler: 'DPM++ SDE Karras' },
      { cfg: 7, steps: 30, sampler: 'Euler a' },
      { cfg: 6, steps: 40, sampler: 'LMS' }
    );
  } else {
    recommendedCombinations.push(
      { cfg: 7, steps: 30, sampler: 'DPM++ 2M Karras' },
      { cfg: 8, steps: 35, sampler: 'Euler a' },
      { cfg: 9, steps: 40, sampler: 'DDIM' }
    );
  }
  
  return {
    cfgStepCorrelation,
    recommendedCombinations
  };
};

// シード値管理ヘルパー
export const seedHelper = {
  generateRandomSeed: (): number => {
    return Math.floor(Math.random() * 4294967295); // 32ビット整数の最大値
  },
  
  isSeedReusable: (prompt: string, previousPrompt: string): boolean => {
    // プロンプトの類似性が高い場合はシードを再利用すると
    // 類似した結果が得られる可能性が高い
    const similarityScore = 0.5; // 実際には何らかの方法でプロンプト間の類似度を計算する
    return similarityScore > 0.7; // 70%以上の類似度でシード再利用を推奨
  }
};

// 推奨パラメータを取得する関数
export function getRecommendedParameters(prompt: string, modelName: string) {
  const modelCategory = categorizeModel(modelName);
  const artStyle = detectArtStyle(prompt);
  
  return {
    sampler: recommendSampler(modelName, prompt),
    steps: getOptimalStepCount(prompt, artStyle),
    cfgScale: getOptimalCfgScale(prompt, artStyle),
    width: getOptimalResolution(prompt, artStyle).width,
    height: getOptimalResolution(prompt, artStyle).height
  };
}

// エクスポート
export default {
  getOptimizedParameters,
  getRecommendedParameters,
  recommendSampler,
  getOptimalCfgScale,
  getOptimalStepCount,
  getOptimalResolution,
  optimizeBatchSettings,
  analyzeParameterCorrelation,
  seedHelper,
  categorizeModel
};