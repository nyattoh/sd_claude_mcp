import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// API接続設定の型
export interface SDApiConfig {
  host: string;
  port: number;
  timeout?: number;
  apiKey?: string;
  baseUrl?: string;
}

// 進捗情報の型
export interface ProgressInfo {
  progress: number;
  eta_relative: number;
  state: {
    skipped: boolean;
    interrupted: boolean;
    job: string;
    job_count: number;
    job_timestamp: string;
    job_no: number;
    sampling_step: number;
    sampling_steps: number;
  };
  current_image?: string;
}

// モデル情報の型
export interface SDModel {
  title: string;
  model_name: string;
  hash: string;
  sha256: string;
  filename: string;
  config: string;
}

// サンプラー情報の型
export interface SDSampler {
  name: string;
  aliases: string[];
  options: Record<string, any>;
}

// txt2img/img2imgリクエストパラメータの型
export interface SDGenerationParams {
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  subseed?: number;
  subseed_strength?: number;
  batch_size?: number;
  n_iter?: number;
  steps?: number;
  cfg_scale?: number;
  width?: number;
  height?: number;
  restore_faces?: boolean;
  tiling?: boolean;
  sampler_index?: string;
  sampler_name?: string;
  enable_hr?: boolean;
  denoising_strength?: number;
  firstphase_width?: number;
  firstphase_height?: number;
  hr_scale?: number;
  hr_upscaler?: string;
  hr_second_pass_steps?: number;
  hr_resize_x?: number;
  hr_resize_y?: number;
  override_settings?: Record<string, any>;
  override_settings_restore_afterwards?: boolean;
  [key: string]: any;
}

// img2img専用のパラメータ型
export interface SDImg2ImgParams extends SDGenerationParams {
  init_images: string[];
  resize_mode?: number;
  mask?: string;
  mask_blur?: number;
  inpainting_fill?: number;
  inpaint_full_res?: boolean;
  inpaint_full_res_padding?: number;
  inpainting_mask_invert?: number;
  initial_noise_multiplier?: number;
}

// API応答の共通型
export interface SDApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 画像生成結果の型
export interface SDGenerationResult {
  images: string[];
  parameters: Record<string, any>;
  info: string;
  seeds?: number[];
}

// 再試行設定の型
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
}

/**
 * Stable Diffusion Web UI APIとの通信を担当するクラス
 */
export class SDApi {
  private client: AxiosInstance;
  private config: SDApiConfig;
  private retryConfig: RetryConfig;

  /**
   * SDApiクラスのコンストラクタ
   * @param config API接続設定
   * @param retryConfig 再試行設定(オプション)
   */
  constructor(
    config: SDApiConfig,
    retryConfig: RetryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      factor: 2,
    }
  ) {
    this.config = {
      ...config,
      baseUrl: `http://${config.host}:${config.port}`,
    };
    this.retryConfig = retryConfig;

    // Axiosインスタンスの設定
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
    });
  }

  /**
   * API接続のテスト
   * @returns 接続成功時はtrueを返す
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/sdapi/v1/samplers');
      return true;
    } catch (error) {
      console.error('API接続テストに失敗しました:', error);
      return false;
    }
  }

  /**
   * 利用可能なモデル一覧を取得
   * @returns モデル情報の配列
   */
  public async getModels(): Promise<SDModel[]> {
    try {
      const response = await this.executeWithRetry<SDModel[]>(() => 
        this.client.get('/sdapi/v1/sd-models')
      );
      return response;
    } catch (error) {
      this.handleError(error, 'モデル一覧の取得に失敗しました');
      return [];
    }
  }

  /**
   * 利用可能なサンプラー一覧を取得
   * @returns サンプラー情報の配列
   */
  public async getSamplers(): Promise<SDSampler[]> {
    try {
      const response = await this.executeWithRetry<SDSampler[]>(() => 
        this.client.get('/sdapi/v1/samplers')
      );
      return response;
    } catch (error) {
      this.handleError(error, 'サンプラー一覧の取得に失敗しました');
      return [];
    }
  }

  /**
   * 現在のモデルを変更
   * @param modelName 変更先のモデル名
   * @returns 変更成功時はtrueを返す
   */
  public async setModel(modelName: string): Promise<boolean> {
    try {
      await this.executeWithRetry(() => 
        this.client.post('/sdapi/v1/options', {
          sd_model_checkpoint: modelName,
        })
      );
      return true;
    } catch (error) {
      this.handleError(error, `モデル "${modelName}" への変更に失敗しました`);
      return false;
    }
  }

  /**
   * テキストから画像を生成
   * @param params 生成パラメータ
   * @returns 生成結果
   */
  public async txt2img(params: SDGenerationParams): Promise<SDGenerationResult> {
    try {
      this.validateGenerationParams(params);
      const response = await this.executeWithRetry<SDGenerationResult>(() => 
        this.client.post('/sdapi/v1/txt2img', params)
      );
      return response;
    } catch (error) {
      this.handleError(error, 'テキストから画像の生成に失敗しました');
      throw error;
    }
  }

  /**
   * 画像から画像を生成
   * @param params 生成パラメータ
   * @returns 生成結果
   */
  public async img2img(params: SDImg2ImgParams): Promise<SDGenerationResult> {
    try {
      this.validateImg2ImgParams(params);
      const response = await this.executeWithRetry<SDGenerationResult>(() => 
        this.client.post('/sdapi/v1/img2img', params)
      );
      return response;
    } catch (error) {
      this.handleError(error, '画像から画像の生成に失敗しました');
      throw error;
    }
  }

  /**
   * 生成進捗状況の確認
   * @returns 進捗情報
   */
  public async getProgress(): Promise<ProgressInfo> {
    try {
      const response = await this.client.get<ProgressInfo>('/sdapi/v1/progress');
      return response.data;
    } catch (error) {
      this.handleError(error, '進捗状況の取得に失敗しました');
      return {
        progress: 0,
        eta_relative: 0,
        state: {
          skipped: false,
          interrupted: false,
          job: '',
          job_count: 0,
          job_timestamp: '',
          job_no: 0,
          sampling_step: 0,
          sampling_steps: 0,
        }
      };
    }
  }

  /**
   * 画像生成を中断
   * @returns 中断成功時はtrueを返す
   */
  public async interrupt(): Promise<boolean> {
    try {
      await this.client.post('/sdapi/v1/interrupt');
      return true;
    } catch (error) {
      this.handleError(error, '生成中断に失敗しました');
      return false;
    }
  }

  /**
   * 画像データをBase64エンコードされた文字列に変換
   * @param imageFile 画像ファイル
   * @returns Base64エンコードされた文字列
   */
  public async imageToBase64(imageFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = () => {
        const base64String = reader.result as string;
        // data:image/png;base64, の部分を削除
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => {
        reject(`ファイルの読み込みに失敗しました: ${error}`);
      };
    });
  }

  /**
   * APIエンドポイントを任意のメソッドで呼び出す
   * @param endpoint エンドポイントパス
   * @param method HTTPメソッド
   * @param data リクエストデータ
   * @returns レスポンスデータ
   */
  public async callEndpoint<T>(
    endpoint: string,
    method: 'get' | 'post' | 'put' | 'delete' = 'get',
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await this.executeWithRetry<T>(() => {
        switch (method) {
          case 'get':
            return this.client.get<T>(endpoint, config);
          case 'post':
            return this.client.post<T>(endpoint, data, config);
          case 'put':
            return this.client.put<T>(endpoint, data, config);
          case 'delete':
            return this.client.delete<T>(endpoint, config);
          default:
            return this.client.get<T>(endpoint, config);
        }
      });
      return response;
    } catch (error) {
      this.handleError(error, `エンドポイント ${endpoint} の呼び出しに失敗しました`);
      throw error;
    }
  }

  /**
   * 再試行ロジックを実装した関数実行
   * @param fn 実行する非同期関数
   * @returns 関数の戻り値
   */
  private async executeWithRetry<T>(
    fn: () => Promise<{ data: T }>,
    retryCount = 0
  ): Promise<T> {
    try {
      const response = await fn();
      return response.data;
    } catch (error) {
      if (
        retryCount < this.retryConfig.maxRetries &&
        this.isRetryableError(error as AxiosError)
      ) {
        const delay = Math.min(
          this.retryConfig.initialDelay * Math.pow(this.retryConfig.factor, retryCount),
          this.retryConfig.maxDelay
        );
        
        console.warn(`リクエスト失敗、${delay}ms後に再試行します (${retryCount + 1}/${this.retryConfig.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * 再試行可能なエラーかどうかを判定
   * @param error エラー
   * @returns 再試行可能な場合はtrue
   */
  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // ネットワークエラーの場合は再試行
      return true;
    }
    
    // 500番台のサーバーエラーの場合は再試行
    if (error.response.status >= 500 && error.response.status < 600) {
      return true;
    }
    
    // 429 Too Many Requestsの場合は再試行
    if (error.response.status === 429) {
      return true;
    }
    
    // 408 Request Timeoutの場合は再試行
    if (error.response.status === 408) {
      return true;
    }
    
    return false;
  }

  /**
   * エラー処理
   * @param error エラー
   * @param message エラーメッセージ
   */
  private handleError(error: any, message: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (!axiosError.response) {
        console.error(`${message}: ネットワークエラー`, error);
        throw new Error(`${message}: サーバーに接続できません。ホストとポートを確認してください。`);
      }
      
      switch (axiosError.response.status) {
        case 401:
          console.error(`${message}: 認証エラー`, error);
          throw new Error(`${message}: APIキーが無効です。`);
        case 404:
          console.error(`${message}: リソースが見つかりません`, error);
          throw new Error(`${message}: リクエストされたリソースが見つかりません。エンドポイントを確認してください。`);
        case 400:
          console.error(`${message}: 不正なリクエスト`, error);
          throw new Error(`${message}: リクエストパラメータが不正です。`);
        case 500:
          console.error(`${message}: サーバーエラー`, error);
          throw new Error(`${message}: サーバー内部エラーが発生しました。`);
        default:
          console.error(`${message}: その他のエラー`, error);
          throw new Error(`${message}: HTTPステータス ${axiosError.response.status}`);
      }
    } else {
      console.error(`${message}: 不明なエラー`, error);
      throw new Error(`${message}: ${error.message || '不明なエラーが発生しました'}`);
    }
  }

  /**
   * 生成パラメータの検証
   * @param params 生成パラメータ
   */
  private validateGenerationParams(params: SDGenerationParams): void {
    if (!params.prompt) {
      throw new Error('プロンプトは必須です');
    }
    
    // 必須でないパラメータのデフォルト値設定と検証
    if (params.width && (params.width < 64 || params.width > 2048)) {
      throw new Error('幅は64から2048の間である必要があります');
    }
    
    if (params.height && (params.height < 64 || params.height > 2048)) {
      throw new Error('高さは64から2048の間である必要があります');
    }
    
    if (params.steps && (params.steps < 1 || params.steps > 150)) {
      throw new Error('ステップ数は1から150の間である必要があります');
    }
    
    if (params.cfg_scale && (params.cfg_scale < 1 || params.cfg_scale > 30)) {
      throw new Error('CFGスケールは1から30の間である必要があります');
    }
  }

  /**
   * img2imgパラメータの検証
   * @param params img2imgパラメータ
   */
  private validateImg2ImgParams(params: SDImg2ImgParams): void {
    this.validateGenerationParams(params);
    
    if (!params.init_images || params.init_images.length === 0) {
      throw new Error('初期画像は必須です');
    }
    
    if (params.denoising_strength !== undefined && 
        (params.denoising_strength < 0 || params.denoising_strength > 1)) {
      throw new Error('ノイズ除去強度は0から1の間である必要があります');
    }
  }
}

// シングルトンインスタンスの作成とエクスポート
let apiInstance: SDApi | null = null;

/**
 * SDApi インスタンスを初期化
 */
export function initializeApi(config: SDApiConfig): SDApi {
  apiInstance = new SDApi(config);
  return apiInstance;
}

/**
 * 現在のSDApiインスタンスを取得
 */
export function getApiInstance(): SDApi {
  if (!apiInstance) {
    throw new Error('API接続が初期化されていません。initializeApi()を先に呼び出してください。');
  }
  return apiInstance;
}

export default {
  SDApi,
  initializeApi,
  getApiInstance,
};