@echo off
cd /d "C:\Users\YourUsername\path\to\sawani-abby\docker"

echo ========================================
echo   Salon App 起動中...
echo ========================================
docker compose up -d

timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo   このウィンドウを閉じると停止します
echo   （Enterキーでも停止）
echo ========================================
echo.

pause >nul

echo.
echo 停止中...
docker compose down
echo 完了！
timeout /t 2