import axios from 'axios';

// 文章を分割する関数
function splitSentences(text: string): string[] {
  return text.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
}

// モデルの種類を分類する関数
function classifyModelType(modelName: string): ModelType {
  const lowerName = modelName.toLowerCase();
  
  if (lowerName.includes('anime') || lowerName.includes('manga') || lowerName.includes('waifu')) {
    return ModelType.ANIME;
  } else if (lowerName.includes('realistic') || lowerName.includes('photo') || lowerName.includes('real')) {
    return ModelType.REALISTIC;
  } else if (lowerName.includes('fantasy') || lowerName.includes('dream')) {
    return ModelType.FANTASY;
  }
  
  return ModelType.UNKNOWN;
}

// プロンプト構造のインターフェース
export interface StructuredPrompt {
  subject: string[];         // 主題、被写体
  style: string[];           // アートスタイル、画風
  composition: string[];     // 構図、視点、フレーミング
  lighting: string[];        // 光源、照明効果
  quality: string[];         // 品質向上キーワード
  details: string[];         // 詳細、テクスチャ
  colors: string[];          // 色彩、カラーパレット
  additional: string[];      // その他の追加要素
}

// モデルタイプの列挙型
export enum ModelType {
  ANIME = 'anime',
  REALISTIC = 'realistic',
  FANTASY = 'fantasy',
  ABSTRACT = 'abstract',
  SPECIAL = 'special',
  UNKNOWN = 'unknown'
}

// プロンプト最適化結果のインターフェース
export interface OptimizedPromptResult {
  originalText: string;          // 元の日本語テキスト
  translatedText: string;        // 英語に翻訳されたテキスト
  structuredPrompt: StructuredPrompt; // 構造化されたプロンプト
  optimizedPrompt: string;       // 最終的に最適化されたプロンプト
  negativePrompt: string;        // 自動生成されたネガティブプロンプト
  keywordWeights: Record<string, number>; // キーワードの重み付け情報
  confidence: number;            // 最適化の確信度 (0-1)
}

// キーワードデータベース
const keywordDatabase = {
  quality: [
    'masterpiece', 'best quality', 'high quality', 'highly detailed', 
    'detailed', 'intricate details', 'ultra detailed', '8k', 
    'HDR', 'high resolution', 'cinematic', 'professional'
  ],
  anime: [
    'anime style', 'anime artwork', 'anime illustration', 'manga style',
    'cel shading', 'clean lines', 'vibrant colors', 'kawaii',
    'moe', 'bishoujo', 'bishounen', 'anime screenshot'
  ],
  realistic: [
    'photorealistic', 'hyperrealistic', 'realistic', 'photographic',
    'lifelike', 'DSLR', 'detailed texture', 'natural lighting',
    'high detail skin texture', 'anatomically correct', 'stunning'
  ],
  negative: [
    'lowres', 'bad anatomy', 'bad hands', 'text', 'error', 'missing fingers',
    'extra digit', 'fewer digits', 'cropped', 'worst quality', 'low quality',
    'normal quality', 'jpeg artifacts', 'signature', 'watermark', 'username',
    'blurry', 'deformed', 'mutated', 'poorly drawn', 'out of frame'
  ]
};

// 翻訳関数 (実際の実装では外部APIを使用)
export async function translateToEnglish(japaneseText: string): Promise<string> {
  try {
    // 本番環境では適切な翻訳APIに置き換える
    // 例としてモック実装
    const response = await axios.post('https://translation-api.example.com/translate', {
      text: japaneseText,
      source: 'ja',
      target: 'en'
    });
    
    return response.data.translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    // 翻訳に失敗した場合はそのまま返す (部分的な機能として)
    return japaneseText;
  }
}

// プロンプトの構造化
export function structurePrompt(translatedText: string): StructuredPrompt {
  const structured: StructuredPrompt = {
    subject: [],
    style: [],
    composition: [],
    lighting: [],
    quality: [],
    details: [],
    colors: [],
    additional: []
  };

  // 文の分割
  const sentences = splitSentences(translatedText);
  
  // 各文を分析してカテゴリに分類
  sentences.forEach((sentence: string) => {
    const words = sentence.split(' ');
    
    // キーワードのパターンマッチングで分類 (簡易版)
    words.forEach((word: string) => {
      // スタイル関連のキーワード
      if (/style|artwork|painting|illustration|rendered|animation|cartoon|anime|manga|realistic|photo|sketch/i.test(word)) {
        const stylePhrase = extractPhrase(sentence, word);
        structured.style.push(stylePhrase);
      }
      // 被写体関連のキーワード
      else if (/person|woman|man|girl|boy|character|portrait|landscape|animal|creature|object/i.test(word)) {
        const subjectPhrase = extractPhrase(sentence, word);
        structured.subject.push(subjectPhrase);
      }
      // 構図関連のキーワード
      else if (/view|angle|perspective|shot|close-up|wide|portrait|landscape|composition/i.test(word)) {
        const compositionPhrase = extractPhrase(sentence, word);
        structured.composition.push(compositionPhrase);
      }
      // 光源関連のキーワード
      else if (/light|lighting|shadow|bright|dark|sunlight|moonlight|backlight|spotlight/i.test(word)) {
        const lightingPhrase = extractPhrase(sentence, word);
        structured.lighting.push(lightingPhrase);
      }
      // 色彩関連のキーワード
      else if (/color|colours|red|blue|green|yellow|purple|pink|black|white|vibrant|pastel|monochrome/i.test(word)) {
        const colorPhrase = extractPhrase(sentence, word);
        structured.colors.push(colorPhrase);
      }
      // 詳細関連のキーワード
      else if (/detailed|texture|intricate|pattern|design|ornate|complex/i.test(word)) {
        const detailPhrase = extractPhrase(sentence, word);
        structured.details.push(detailPhrase);
      }
    });
  });

  // 品質キーワードを自動追加
  structured.quality = [...keywordDatabase.quality.slice(0, 4)];
  
  // 重複を削除
  Object.keys(structured).forEach(key => {
    structured[key as keyof StructuredPrompt] = [...new Set(structured[key as keyof StructuredPrompt])];
  });

  return structured;
}

// 文章からキーワード周辺のフレーズを抽出するヘルパー関数
function extractPhrase(sentence: string, keyword: string): string {
  // キーワードの前後の単語を含めたフレーズを抽出する簡易実装
  const words = sentence.split(' ');
  const keywordIndex = words.findIndex(word => word.includes(keyword));
  
  if (keywordIndex === -1) return keyword;
  
  // キーワードの前後2語を含めたフレーズを作成
  const startIndex = Math.max(0, keywordIndex - 2);
  const endIndex = Math.min(words.length - 1, keywordIndex + 2);
  
  return words.slice(startIndex, endIndex + 1).join(' ');
}

// キーワードの重要度分析と重み付け
export function weightKeywords(structured: StructuredPrompt): Record<string, number> {
  const weights: Record<string, number> = {};
  
  // 主題は最も重要
  structured.subject.forEach(subject => {
    weights[subject] = 1.5;
  });
  
  // スタイルも重要度が高い
  structured.style.forEach(style => {
    weights[style] = 1.3;
  });
  
  // 品質キーワードは標準的な重要度
  structured.quality.forEach(quality => {
    weights[quality] = 1.0;
  });
  
  // その他のカテゴリ
  structured.composition.forEach(comp => weights[comp] = 0.9);
  structured.lighting.forEach(light => weights[light] = 0.8);
  structured.colors.forEach(color => weights[color] = 0.8);
  structured.details.forEach(detail => weights[detail] = 0.7);
  structured.additional.forEach(add => weights[add] = 0.6);
  
  return weights;
}

// 括弧を使ったキーワード強調の適用
export function applyWeightsToBrackets(prompt: string, weights: Record<string, number>): string {
  let weightedPrompt = prompt;
  
  // 重みの高い順にソート
  const sortedKeywords = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // 各キーワードに重みに応じた括弧を適用
  sortedKeywords.forEach(keyword => {
    if (keyword.length <= 3) return; // 短すぎるキーワードはスキップ
    
    const weight = weights[keyword];
    let replacement = keyword;
    
    // 重みに応じた括弧の数を決定
    if (weight >= 1.4) {
      replacement = `(${keyword}:1.4)`; // 非常に重要
    } else if (weight >= 1.2) {
      replacement = `(${keyword}:1.2)`; // 重要
    } else if (weight >= 1.0) {
      replacement = `(${keyword}:1.0)`; // 標準
    } else if (weight <= 0.7) {
      replacement = `(${keyword}:0.7)`; // やや控えめ
    }
    
    // キーワードがフレーズの一部である場合にのみ置換（単語全体のマッチに制限）
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'g');
    weightedPrompt = weightedPrompt.replace(regex, replacement);
  });
  
  return weightedPrompt;
}

// 正規表現のエスケープ処理
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ネガティブプロンプトの自動生成
export function generateNegativePrompt(structured: StructuredPrompt, modelType: ModelType): string {
  // 基本的なネガティブプロンプト
  let negativePrompt = keywordDatabase.negative.join(', ');
  
  // モデルタイプに応じた追加ネガティブプロンプト
  switch (modelType) {
    case ModelType.ANIME:
      negativePrompt += ', photorealistic, 3d render, photography, western style';
      break;
    case ModelType.REALISTIC:
      negativePrompt += ', anime style, cartoon, illustration, disfigured, disproportional';
      break;
    case ModelType.FANTASY:
      negativePrompt += ', modern, contemporary, mundane, ordinary';
      break;
    case ModelType.ABSTRACT:
      negativePrompt += ', realistic, detailed, photographic';
      break;
    default:
      // デフォルトのネガティブプロンプトを使用
      break;
  }
  
  // 主題に応じたネガティブプロンプトの追加
  if (structured.subject.some(s => /person|woman|man|girl|boy/i.test(s))) {
    negativePrompt += ', missing limbs, extra limbs, deformed hands, extra fingers, missing fingers';
  }
  
  if (structured.subject.some(s => /landscape|scenery|nature/i.test(s))) {
    negativePrompt += ', buildings, urban, city';
  }
  
  return negativePrompt;
}

// モデルに適したプロンプト調整
export function optimizeForModel(structured: StructuredPrompt, modelType: ModelType): StructuredPrompt {
  const optimized = { ...structured };
  
  switch (modelType) {
    case ModelType.ANIME:
      // Anime系モデル用の調整
      optimized.quality = [...optimized.quality, 'anime style', 'high quality anime', 'beautiful anime art'];
      // Anime系モデルではリアル系キーワードを削除
      optimized.style = optimized.style.filter(s => !(/realistic|photorealistic|photograph/i.test(s)));
      break;
      
    case ModelType.REALISTIC:
      // リアル系モデル用の調整
      optimized.quality = [...optimized.quality, 'photorealistic', 'hyperrealistic', 'highly detailed', 'DSLR'];
      // リアル系モデルではアニメ系キーワードを削除
      optimized.style = optimized.style.filter(s => !(/anime|manga|cartoon/i.test(s)));
      break;
      
    case ModelType.FANTASY:
      // ファンタジー系モデル用の調整
      optimized.quality = [...optimized.quality, 'fantasy art', 'epic', 'dramatic lighting'];
      break;
      
    case ModelType.ABSTRACT:
      // 抽象系モデル用の調整
      optimized.quality = [...optimized.quality, 'abstract art', 'surreal', 'experimental'];
      break;
      
    case ModelType.SPECIAL:
      // 特殊モデル用の調整 (特殊形式を必要とするモデル向け)
      // モデル固有の調整は別途必要
      break;
      
    default:
      // デフォルト: 調整なし
      break;
  }
  
  return optimized;
}

// プロンプト長の最適化
export function optimizePromptLength(prompt: string, maxLength: number = 500): string {
  if (prompt.length <= maxLength) return prompt;
  
  // トークン（単語）に分割
  const tokens = prompt.split(/\s+/);
  
  // 重複するキーワードや類似表現を削除
  const uniqueTokens: string[] = [];
  const seenTokens = new Set<string>();
  
  for (const token of tokens) {
    // 基本形（括弧や修飾を取り除いた形）
    const baseToken = token.replace(/[\(\):,\.0-9]/g, '').toLowerCase();
    
    // 既に類似のトークンがある場合はスキップ
    if (seenTokens.has(baseToken)) continue;
    
    seenTokens.add(baseToken);
    uniqueTokens.push(token);
    
    // 長さチェック
    if (uniqueTokens.join(' ').length >= maxLength) break;
  }
  
  return uniqueTokens.join(' ');
}

// プロンプトの類似度評価
export function calculatePromptSimilarity(prompt1: string, prompt2: string): number {
  const tokens1 = prompt1.toLowerCase().split(/\s+/);
  const tokens2 = prompt2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  // ジャッカード類似度
  return intersection.size / union.size;
}

// 翻訳品質チェック
export function checkTranslationQuality(original: string, translated: string): number {
  // 簡易的な実装：単語数の比率をチェック
  const originalWords = original.split(/\s+/).length;
  const translatedWords = translated.split(/\s+/).length;
  
  // 日本語は英語より単語数が少ない傾向があるため、比率が適切かチェック
  const ratio = translatedWords / Math.max(1, originalWords);
  
  // 理想的な比率は1.5〜3.0程度
  if (ratio < 1 || ratio > 5) {
    return 0.5; // 翻訳品質に問題がある可能性
  }
  
  return 0.9; // 基本的には良好と判断
}

// メイン最適化関数
export async function optimizePrompt(
  japaneseText: string, 
  modelName: string = '',
  maxLength: number = 500
): Promise<OptimizedPromptResult> {
  // 1. 日本語から英語への翻訳
  const translatedText = await translateToEnglish(japaneseText);
  
  // 2. モデルタイプの判定
  const modelType = classifyModelType(modelName);
  
  // 3. プロンプト構造化
  let structured = structurePrompt(translatedText);
  
  // 4. モデルに適した最適化
  structured = optimizeForModel(structured, modelType);
  
  // 5. キーワードの重み付け分析
  const weights = weightKeywords(structured);
  
  // 6. 構造化プロンプトから最適化プロンプトを生成
  let optimizedPrompt = [
    ...structured.subject,
    ...structured.style,
    ...structured.quality,
    ...structured.composition,
    ...structured.lighting,
    ...structured.colors,
    ...structured.details,
    ...structured.additional
  ].join(', ');
  
  // 7. 重み付けとブラケット適用
  optimizedPrompt = applyWeightsToBrackets(optimizedPrompt, weights);
  
  // 8. プロンプト長の最適化
  optimizedPrompt = optimizePromptLength(optimizedPrompt, maxLength);
  
  // 9. ネガティブプロンプト生成
  const negativePrompt = generateNegativePrompt(structured, modelType);
  
  // 10. 翻訳品質の確認
  const translationConfidence = checkTranslationQuality(japaneseText, translatedText);
  
  // 結果を返す
  return {
    originalText: japaneseText,
    translatedText,
    structuredPrompt: structured,
    optimizedPrompt,
    negativePrompt,
    keywordWeights: weights,
    confidence: translationConfidence
  };
}

// プロンプト拡張（詳細追加）
export function expandPrompt(prompt: string, addDetails: boolean = true): string {
  if (!addDetails) return prompt;
  
  let expandedPrompt = prompt;
  
  // 画質向上キーワードの追加
  if (!/(masterpiece|best quality|detailed)/i.test(expandedPrompt)) {
    expandedPrompt = `masterpiece, best quality, highly detailed, ${expandedPrompt}`;
  }
  
  // 照明効果の追加
  if (!/(lighting|sunlight|moonlight|backlight)/i.test(expandedPrompt)) {
    expandedPrompt += ', perfect lighting';
  }
  
  // 構図情報の追加
  if (!/(view|shot|angle|perspective)/i.test(expandedPrompt)) {
    expandedPrompt += ', perfect composition';
  }
  
  return expandedPrompt;
}

export default {
  optimizePrompt,
  translateToEnglish,
  structurePrompt,
  weightKeywords,
  applyWeightsToBrackets,
  generateNegativePrompt,
  optimizeForModel,
  optimizePromptLength,
  calculatePromptSimilarity,
  checkTranslationQuality,
  expandPrompt
};