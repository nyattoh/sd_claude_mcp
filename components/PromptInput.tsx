import React, { useState, useRef, useEffect } from 'react';

const PromptInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  inputHistory: string[];
}> = ({ value, onChange, onSubmit, isProcessing, inputHistory }) => {
  const [showExamples, setShowExamples] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 1000;

  // テキストエリアの高さを自動調整
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isProcessing) {
      onSubmit();
    }
  };

  const handleExampleClick = (example: string) => {
    onChange(example);
    setShowExamples(false);
  };

  const handleHistoryClick = (historyItem: string) => {
    onChange(historyItem);
    setShowHistory(false);
  };

  const promptExamples = [
    "窓辺に座る長髪の少女、夕日の光が差し込む部屋、ノスタルジックな雰囲気",
    "未来都市の夜景、ネオンの光、サイバーパンク風、雨に濡れた道路",
    "山間の古い和風旅館、温泉から立ち上る湯気、紅葉、夕暮れ時",
    "深海を探索する潜水艦、神秘的な発光生物、青い光、SF風",
  ];

  return (
    <Card className="w-full bg-card shadow-md">
      <CardHeader className="bg-card">
        <CardTitle className="bg-card">プロンプト入力</CardTitle>
        <CardDescription className="bg-card">
          生成したい画像の詳細を日本語で自由に入力してください。AI が最適な Stable Diffusion プロンプトに変換します。
        </CardDescription>
      </CardHeader>
      
      <CardContent className="bg-card">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <Label htmlFor="prompt-input" className="text-sm font-medium mb-2 block">
                画像の説明（日本語）
              </Label>
              
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  id="prompt-input"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="例: 夕暮れの海辺に佇む一本桜、満開の花びらが風に舞い、波が穏やかに打ち寄せている"
                  className="w-full min-h-[120px] p-3 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none bg-white dark:bg-gray-800 text-black dark:text-white"
                  maxLength={maxLength}
                  disabled={isProcessing}
                />
                
                <div className="absolute bottom-2 right-3 text-xs text-gray-500 dark:text-gray-400">
                  {value.length}/{maxLength}
                </div>
              </div>
              
              {value.length > 800 && (
                <p className="mt-1 text-amber-600 dark:text-amber-400 text-sm">
                  <CheckCircle className="inline w-4 h-4 mr-1" />
                  長すぎるプロンプトは結果が不安定になる場合があります
                </p>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowExamples(!showExamples)}
                className="text-sm"
              >
                プロンプト例
              </Button>
              
              {inputHistory.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm"
                >
                  入力履歴
                </Button>
              )}
            </div>

            {showExamples && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mt-2">
                <h4 className="font-medium text-sm mb-2">プロンプト例:</h4>
                <ul className="space-y-2">
                  {promptExamples.map((example, index) => (
                    <li key={index}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-left text-sm w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleExampleClick(example)}
                      >
                        {example}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showHistory && inputHistory.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mt-2">
                <h4 className="font-medium text-sm mb-2">最近の入力:</h4>
                <ul className="space-y-2">
                  {inputHistory.slice(0, 5).map((item, index) => (
                    <li key={index}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-left text-sm w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-800 truncate"
                        onClick={() => handleHistoryClick(item)}
                      >
                        {item.length > 70 ? `${item.substring(0, 70)}...` : item}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={!value.trim() || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin mr-2">↻</span>
                    処理中...
                  </>
                ) : (
                  <>
                    プロンプトを最適化
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              <p>
                <strong>ヒント:</strong> 被写体、スタイル、構図、照明、色調など詳細に記述するほど、
                より具体的な画像が生成されます。
              </p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PromptInput;