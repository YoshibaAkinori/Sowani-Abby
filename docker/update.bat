@echo off
chcp 65001 > nul
echo.
echo ========================================
echo   ABBY アプリ更新スクリプト
echo ========================================
echo.

cd /d "%~dp0"
cd ..

echo [1/4] 現在のディレクトリ: %CD%
echo.

echo [2/4] Git fetch 実行中...
git fetch origin
if %errorlevel% neq 0 (
    echo [エラー] git fetch に失敗しました
    pause
    exit /b 1
)
echo      完了
echo.

echo [3/4] Git pull 実行中...
git pull origin main
if %errorlevel% neq 0 (
    echo [エラー] git pull に失敗しました
    pause
    exit /b 1
)
echo      完了
echo.

echo [4/4] Docker再ビルド中...
cd docker
docker compose down
docker compose build app
docker compose up -d
echo      完了
echo.

echo ========================================
echo   更新が完了しました！
echo   ブラウザを更新してください
echo ========================================
echo.
pause
