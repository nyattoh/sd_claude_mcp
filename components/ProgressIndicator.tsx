import React from 'react';

type ProgressInfo = {
  current: number;
  total: number;
  eta: number; // 秒単位
  description?: string;
};

type ErrorInfo = {
  message: string;
  code?: string;
  solution?: string;
};

interface ProgressIndicatorProps {
  progress: ProgressInfo;
  isGenerating: boolean;
  onCancel: () => void;
  error?: ErrorInfo;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  isGenerating,
  onCancel,
  error
}) => {
  const progressPercentage = progress.total > 0 
    ? Math.min(Math.round((progress.current / progress.total) * 100), 100) 
    : 0;
  
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '計算中...';
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}分 ${remainingSeconds}秒`;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage < 30) return "#3b82f6"; // 青
    if (percentage < 70) return "#8b5cf6"; // 紫
    return "#10b981"; // 緑
  };

  return (
    <div className="w-full space-y-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm font-medium">
          {isGenerating ? '画像生成中...' : error ? 'エラーが発生しました' : '準備完了'}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {isGenerating && `${progress.current} / ${progress.total} ステップ`}
        </div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${progressPercentage}%`, 
            backgroundColor: error ? "#ef4444" : getProgressColor(progressPercentage),
            transition: "width 0.3s ease-in-out"
          }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <div>
          {isGenerating && progress.description && (
            <span className="inline-block mr-2">{progress.description}</span>
          )}
          {isGenerating && progress.eta > 0 && (
            <span>残り時間: {formatTime(progress.eta)}</span>
          )}
        </div>
        <div>{isGenerating && `${progressPercentage}%`}</div>
      </div>

      {error && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
          <div className="font-medium">{error.message}</div>
          {error.code && <div className="text-xs mt-1">エラーコード: {error.code}</div>}
          {error.solution && (
            <div className="text-xs mt-1 text-red-700 dark:text-red-300">
              解決策: {error.solution}
            </div>
          )}
        </div>
      )}

      {isGenerating && (
        <div className="flex justify-end mt-2">
          <Button 
            onClick={onCancel}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
            size="sm"
          >
            キャンセル
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;