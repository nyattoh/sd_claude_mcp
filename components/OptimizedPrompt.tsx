import React, { useState } from 'react';

const OptimizedPrompt: React.FC<{
  originalInput: string;
  optimizedPrompt: string;
  negativePrompt: string;
  onPromptChange: (prompt: string) => void;
  onNegativePromptChange: (prompt: string) => void;
  isEditable: boolean;
  setIsEditable: (isEditable: boolean) => void;
  keywordExplanations: Record<string, { description: string; importance: 'high' | 'medium' | 'low' }>;
}> = ({
  originalInput,
  optimizedPrompt,
  negativePrompt,
  onPromptChange,
  onNegativePromptChange,
  isEditable,
  setIsEditable,
  keywordExplanations
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'negative' | 'comparison'>('prompt');
  const [copied, setCopied] = useState(false);
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightKeywords = (text: string) => {
    if (!keywordExplanations || Object.keys(keywordExplanations).length === 0) {
      return <span>{text}</span>;
    }

    let result = [];
    let lastIndex = 0;
    
    // キーワードに基づいて正規表現を作成
    const keywordPattern = new RegExp(
      '\\b(' + 
      Object.keys(keywordExplanations)
        .map(keyword => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|') + 
      ')\\b', 
      'gi'
    );
    
    // マッチを検索して置き換え
    let match;
    let tempText = text;
    while ((match = keywordPattern.exec(tempText)) !== null) {
      const keyword = match[0];
      const importance = keywordExplanations[keyword.toLowerCase()]?.importance || 'low';
      
      // マッチ前のテキストを追加
      if (match.index > lastIndex) {
        result.push(<span key={`text-${lastIndex}`}>{tempText.substring(lastIndex, match.index)}</span>);
      }
      
      // 重要度に応じた色を適用
      const importanceColors = {
        high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      };
      
      // キーワードを強調表示
      result.push(
        <span 
          key={`keyword-${match.index}`}
          className={`cursor-pointer px-1 rounded ${importanceColors[importance]}`}
          onClick={() => setExpandedKeyword(expandedKeyword === keyword.toLowerCase() ? null : keyword.toLowerCase())}
        >
          {keyword}
        </span>
      );
      
      lastIndex = match.index + keyword.length;
    }
    
    // 残りのテキストを追加
    if (lastIndex < tempText.length) {
      result.push(<span key={`text-end`}>{tempText.substring(lastIndex)}</span>);
    }
    
    return <>{result}</>;
  };

  return (
    <Card className="w-full bg-card">
      <CardHeader className="bg-card">
        <div className="flex justify-between items-center">
          <CardTitle className="bg-card">最適化されたプロンプト</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant={isEditable ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditable(!isEditable)}
            >
              {isEditable ? "表示モード" : "編集モード"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(activeTab === 'negative' ? negativePrompt : optimizedPrompt)}
              className="ml-2"
            >
              {copied ? <CheckCircle className="h-4 w-4 mr-1" /> : null}
              {copied ? "コピー完了" : "コピー"}
            </Button>
          </div>
        </div>
        <CardDescription className="bg-card">
          元の日本語指示からStable Diffusion用に最適化されたプロンプトです。
        </CardDescription>
      </CardHeader>
      
      <CardContent className="bg-card">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="prompt" className="flex-1">プロンプト</TabsTrigger>
            <TabsTrigger value="negative" className="flex-1">ネガティブプロンプト</TabsTrigger>
            <TabsTrigger value="comparison" className="flex-1">元指示との比較</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="mt-0">
            <div className={`p-4 rounded-md ${isEditable ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'}`}>
              {isEditable ? (
                <textarea
                  value={optimizedPrompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  className="w-full min-h-[200px] p-2 text-sm font-mono bg-transparent border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="w-full min-h-[200px] text-sm font-mono whitespace-pre-wrap break-words">
                  {highlightKeywords(optimizedPrompt)}
                </div>
              )}
            </div>
            
            {expandedKeyword && keywordExplanations[expandedKeyword] && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                <h4 className="font-bold mb-1">{expandedKeyword}</h4>
                <p>{keywordExplanations[expandedKeyword].description}</p>
                <div className="mt-2">
                  <span className="text-sm font-medium">重要度: </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    keywordExplanations[expandedKeyword].importance === 'high' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : keywordExplanations[expandedKeyword].importance === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {keywordExplanations[expandedKeyword].importance === 'high' 
                      ? '高' 
                      : keywordExplanations[expandedKeyword].importance === 'medium'
                        ? '中'
                        : '低'
                    }
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="negative" className="mt-0">
            <div className={`p-4 rounded-md ${isEditable ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'}`}>
              {isEditable ? (
                <textarea
                  value={negativePrompt}
                  onChange={(e) => onNegativePromptChange(e.target.value)}
                  className="w-full min-h-[200px] p-2 text-sm font-mono bg-transparent border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="w-full min-h-[200px] text-sm font-mono whitespace-pre-wrap break-words">
                  {highlightKeywords(negativePrompt)}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
                <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">元の日本語指示</h3>
                <div className="text-sm whitespace-pre-wrap break-words">{originalInput}</div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
                <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">最適化されたプロンプト</h3>
                <div className="text-sm font-mono whitespace-pre-wrap break-words">{optimizedPrompt}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">キーワード重要度ガイド</h4>
          <div className="flex space-x-4">
            <div className="flex items-center">
              <span className="w-3 h-3 bg-red-100 dark:bg-red-900 rounded mr-1"></span>
              <span className="text-xs">高</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900 rounded mr-1"></span>
              <span className="text-xs">中</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-blue-100 dark:bg-blue-900 rounded mr-1"></span>
              <span className="text-xs">低</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizedPrompt;