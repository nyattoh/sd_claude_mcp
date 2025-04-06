import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Slider,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { Info, RefreshCw } from "lucide-react";

interface ParameterControlsProps {
  parameters: {
    model: string;
    sampler: string;
    cfgScale: number;
    steps: number;
    width: number;
    height: number;
    seed: number | string;
    batchSize: number;
    batchCount: number;
    useSeedRandomizer: boolean;
  };
  onParameterChange: (param: string, value: any) => void;
  availableModels: { name: string; title?: string }[];
  availableSamplers: { name: string; aliases?: string[] }[];
  recommendedSettings: {
    model?: string;
    sampler?: string;
    cfgScale?: number;
    steps?: number;
    width?: number;
    height?: number;
  };
  applyRecommended: () => void;
  isConnected: boolean;
}

const ParameterControls: React.FC<ParameterControlsProps> = ({
  parameters,
  onParameterChange,
  availableModels,
  availableSamplers,
  recommendedSettings,
  applyRecommended,
  isConnected,
}) => {
  const tooltips = {
    model: "生成に使用するStable Diffusionモデルを選択します。モデルによって得意な画風や特性が異なります。",
    sampler: "画像生成アルゴリズムを選択します。サンプラーによって画質や生成速度が異なります。",
    cfgScale: "CFG（Classifier Free Guidance）スケールはプロンプトへの忠実度を調整します。低い値はより創造的に、高い値はよりプロンプトに忠実になります。",
    steps: "生成ステップ数。高い値はより詳細な画像になりますが、生成時間が増加します。",
    dimensions: "生成画像のサイズ（幅×高さ）を指定します。512×512や768×768などよく使われる値があります。",
    seed: "生成の初期値となる数値です。同じシードでは同じパラメータなら同じような画像が生成されます。「-1」でランダム値を使用します。",
    batch: "一度に生成する画像の数です。バッチサイズは一度の生成で作る画像数、バッチカウントは生成プロセスの繰り返し回数です。",
  };

  const handleSeedRandomizerToggle = (checked: boolean) => {
    onParameterChange("useSeedRandomizer", checked);
    if (checked) {
      onParameterChange("seed", -1);
    }
  };

  return (
    <Card className="w-full bg-card">
      <CardHeader className="bg-card">
        <CardTitle className="bg-card">パラメータ設定</CardTitle>
        <CardDescription className="bg-card">
          画像生成のパラメータを調整します
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-card">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">おすすめ設定</h3>
            <Button
              onClick={applyRecommended}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              適用
            </Button>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* モデル選択 */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="model" className="mr-2">モデル</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.model}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                disabled={!isConnected}
                value={parameters.model}
                onValueChange={(value) => onParameterChange("model", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="モデルを選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.title || model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* サンプラー選択 */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="sampler" className="mr-2">サンプラー</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.sampler}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                disabled={!isConnected}
                value={parameters.sampler}
                onValueChange={(value) => onParameterChange("sampler", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="サンプラーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableSamplers.map((sampler) => (
                    <SelectItem key={sampler.name} value={sampler.name}>
                      {sampler.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {/* CFG値スライダー */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Label htmlFor="cfg" className="mr-2">CFG値</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{tooltips.cfgScale}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="ml-auto">{parameters.cfgScale}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Slider
                id="cfg"
                min={1}
                max={30}
                step={0.5}
                value={[parameters.cfgScale]}
                onValueChange={(value) => onParameterChange("cfgScale", value[0])}
                disabled={!isConnected}
              />
            </div>
          </div>

          {/* ステップ数スライダー */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Label htmlFor="steps" className="mr-2">ステップ数</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{tooltips.steps}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="ml-auto">{parameters.steps}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Slider
                id="steps"
                min={1}
                max={150}
                step={1}
                value={[parameters.steps]}
                onValueChange={(value) => onParameterChange("steps", value[0])}
                disabled={!isConnected}
              />
            </div>
          </div>

          <Separator className="my-4" />

          {/* 幅/高さ入力 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="width" className="mr-2">幅</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.dimensions}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="width"
                type="number"
                min={64}
                max={2048}
                step={8}
                value={parameters.width}
                onChange={(e) => onParameterChange("width", parseInt(e.target.value, 10))}
                disabled={!isConnected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">高さ</Label>
              <Input
                id="height"
                type="number"
                min={64}
                max={2048}
                step={8}
                value={parameters.height}
                onChange={(e) => onParameterChange("height", parseInt(e.target.value, 10))}
                disabled={!isConnected}
              />
            </div>
          </div>

          <Separator className="my-4" />

          {/* シード値入力 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label htmlFor="seed" className="mr-2">シード値</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.seed}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="randomizer">ランダム化</Label>
                <Switch
                  id="randomizer"
                  checked={parameters.useSeedRandomizer}
                  onCheckedChange={handleSeedRandomizerToggle}
                  disabled={!isConnected}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                id="seed"
                type="number"
                value={parameters.seed.toString()}
                onChange={(e) => onParameterChange("seed", parseInt(e.target.value, 10))}
                disabled={!isConnected || parameters.useSeedRandomizer}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => onParameterChange("seed", -1)}
                disabled={!isConnected || parameters.useSeedRandomizer}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* バッチサイズ/カウント設定 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="batchSize" className="mr-2">バッチサイズ</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.batch}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="batchSize"
                type="number"
                min={1}
                max={10}
                step={1}
                value={parameters.batchSize}
                onChange={(e) => onParameterChange("batchSize", parseInt(e.target.value, 10))}
                disabled={!isConnected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchCount">バッチカウント</Label>
              <Input
                id="batchCount"
                type="number"
                min={1}
                max={10}
                step={1}
                value={parameters.batchCount}
                onChange={(e) => onParameterChange("batchCount", parseInt(e.target.value, 10))}
                disabled={!isConnected}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParameterControls;