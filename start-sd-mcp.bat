@echo off
echo Stable Diffusion MCP サーバーを起動しています...
echo.
echo - simple-proxy.js: ポート19001で動作するシンプルな実装
echo - direct-webui.js: 画像をローカルに保存する拡張版
echo - direct-proxy.ts: TypeScript版（開発用）
echo.
echo いずれかを選択してください:
echo 1) simple-proxy.js（推奨）
echo 2) direct-webui.js
echo 3) direct-proxy.ts
echo.

set /p choice="選択 (1-3): "

if "%choice%"=="1" (
  echo.
  echo simple-proxy.jsを起動します...
  node simple-proxy.js
) else if "%choice%"=="2" (
  echo.
  echo direct-webui.jsを起動します...
  node direct-webui.js
) else if "%choice%"=="3" (
  echo.
  echo direct-proxy.tsを起動します...
  npx ts-node direct-proxy.ts
) else (
  echo.
  echo 不正な選択です。simple-proxy.jsを起動します...
  node simple-proxy.js
)

pause 