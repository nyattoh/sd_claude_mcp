import React, { useState } from 'react';

type ImageObject = {
  id: string;
  url: string;
  prompt: string;
  negativePrompt?: string;
  parameters: {
    model: string;
    sampler: string;
    cfgScale: number;
    steps: number;
    seed: number;
    width: number;
    height: number;
    [key: string]: any;
  };
  timestamp: number;
};

interface ImageGalleryProps {
  images: ImageObject[];
  onImageSelect: (index: number) => void;
  onSaveImage: (image: ImageObject) => void;
  onCopyPrompt: (prompt: string, negativePrompt?: string) => void;
  selectedImageIndex: number | null;
  isGenerating: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImageSelect,
  onSaveImage,
  onCopyPrompt,
  selectedImageIndex,
  isGenerating
}) => {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showModal, setShowModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState<number | null>(null);

  const sortedImages = [...images].sort((a, b) => {
    return sortOrder === 'newest' 
      ? b.timestamp - a.timestamp 
      : a.timestamp - b.timestamp;
  });

  const handleImageClick = (index: number) => {
    onImageSelect(index);
  };

  const handleExpandImage = (index: number) => {
    setModalImageIndex(index);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalImageIndex(null);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  if (isGenerating && images.length === 0) {
    return (
      <Card className="w-full bg-card">
        <CardHeader className="bg-card">
          <CardTitle className="bg-card">画像生成中...</CardTitle>
        </CardHeader>
        <CardContent className="bg-card flex justify-center items-center min-h-[300px]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-64 h-64 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
            <div className="mt-4 h-4 w-40 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="w-full bg-card">
        <CardHeader className="bg-card">
          <CardTitle className="bg-card">生成された画像</CardTitle>
          <CardDescription className="bg-card">プロンプトを入力して画像を生成してください</CardDescription>
        </CardHeader>
        <CardContent className="bg-card flex justify-center items-center min-h-[300px]">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>生成された画像がここに表示されます</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800">
      <Card className="w-full bg-card">
        <CardHeader className="bg-card flex flex-row items-center justify-between">
          <div>
            <CardTitle className="bg-card">生成された画像</CardTitle>
            <CardDescription className="bg-card">
              {images.length}枚の画像が生成されました
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={toggleSortOrder}
          >
            {sortOrder === 'newest' ? '新しい順' : '古い順'}
          </Button>
        </CardHeader>
        <CardContent className="bg-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedImages.map((image, index) => (
              <div 
                key={image.id} 
                className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200 
                  ${selectedImageIndex === index ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent hover:border-gray-300'}`}
              >
                <div 
                  className="relative cursor-pointer aspect-square"
                  onClick={() => handleImageClick(index)}
                >
                  <img 
                    src={image.url} 
                    alt={`生成画像 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="opacity-0 hover:opacity-100 bg-white/80 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExpandImage(index);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 3 6 6m0 0-6 6m6-6H3"/></svg>
                      <span className="sr-only">拡大</span>
                    </Button>
                  </div>
                </div>
                
                <div className="p-2 bg-gray-50 dark:bg-gray-700">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(image.timestamp).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveImage(image);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span className="sr-only">保存</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyPrompt(image.prompt, image.negativePrompt);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        <span className="sr-only">プロンプトをコピー</span>
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    {image.parameters.model} / {image.parameters.sampler}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    CFG:{image.parameters.cfgScale} Steps:{image.parameters.steps} {image.parameters.width}x{image.parameters.height}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showModal && modalImageIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg">画像詳細</h3>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleCloseModal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                <span className="sr-only">閉じる</span>
              </Button>
            </div>
            <div className="flex flex-col md:flex-row overflow-auto p-4 gap-4">
              <div className="flex-1 min-w-0">
                <img 
                  src={sortedImages[modalImageIndex].url} 
                  alt={`拡大画像 ${modalImageIndex + 1}`}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-md"
                />
              </div>
              <div className="md:w-80 flex-shrink-0 overflow-y-auto">
                <h4 className="font-medium mb-2">プロンプト</h4>
                <p className="text-sm mb-4 bg-gray-100 dark:bg-gray-700 p-2 rounded whitespace-pre-wrap">
                  {sortedImages[modalImageIndex].prompt}
                </p>
                
                {sortedImages[modalImageIndex].negativePrompt && (
                  <>
                    <h4 className="font-medium mb-2">ネガティブプロンプト</h4>
                    <p className="text-sm mb-4 bg-gray-100 dark:bg-gray-700 p-2 rounded whitespace-pre-wrap">
                      {sortedImages[modalImageIndex].negativePrompt}
                    </p>
                  </>
                )}
                
                <h4 className="font-medium mb-2">パラメータ</h4>
                <div className="text-sm space-y-1 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="flex justify-between">
                    <span>モデル:</span>
                    <span className="font-medium">{sortedImages[modalImageIndex].parameters.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>サンプラー:</span>
                    <span className="font-medium">{sortedImages[modalImageIndex].parameters.sampler}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CFG Scale:</span>
                    <span className="font-medium">{sortedImages[modalImageIndex].parameters.cfgScale}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Steps:</span>
                    <span className="font-medium">{sortedImages[modalImageIndex].parameters.steps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seed:</span>
                    <span className="font-medium">{sortedImages[modalImageIndex].parameters.seed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>解像度:</span>
                    <span className="font-medium">{sortedImages[modalImageIndex].parameters.width}x{sortedImages[modalImageIndex].parameters.height}</span>
                  </div>
                  {Object.entries(sortedImages[modalImageIndex].parameters)
                    .filter(([key]) => !['model', 'sampler', 'cfgScale', 'steps', 'seed', 'width', 'height'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className="font-medium">{value.toString()}</span>
                      </div>
                    ))
                  }
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="secondary"
                    className="flex-1"
                    onClick={() => onSaveImage(sortedImages[modalImageIndex])}
                  >
                    <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    保存
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => onCopyPrompt(sortedImages[modalImageIndex].prompt, sortedImages[modalImageIndex].negativePrompt)}
                  >
                    <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    プロンプトをコピー
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;