@echo off
chcp 65001 > nul
cd /d "C:\Users\abby\Abby-app\sowani-abby\docker"

:: Docker Compose 起動
docker-compose --profile production up -d --build

:: GUIウィンドウを表示（閉じたらコンテナ停止）
powershell -ExecutionPolicy Bypass -Command ^
Add-Type -AssemblyName System.Windows.Forms; ^
Add-Type -AssemblyName System.Drawing; ^
$form = New-Object System.Windows.Forms.Form; ^
$form.Text = 'ABBY 本番環境'; ^
$form.Size = New-Object System.Drawing.Size(300, 180); ^
$form.StartPosition = 'CenterScreen'; ^
$form.FormBorderStyle = 'FixedSingle'; ^
$form.MaximizeBox = $false; ^
$form.BackColor = [System.Drawing.Color]::White; ^
$label = New-Object System.Windows.Forms.Label; ^
$label.Text = '● 稼働中'; ^
$label.Font = New-Object System.Drawing.Font('Yu Gothic UI', 16, [System.Drawing.FontStyle]::Bold); ^
$label.ForeColor = [System.Drawing.Color]::Green; ^
$label.AutoSize = $true; ^
$label.Location = New-Object System.Drawing.Point(90, 30); ^
$form.Controls.Add($label); ^
$urlLabel = New-Object System.Windows.Forms.Label; ^
$urlLabel.Text = 'http://localhost:3000'; ^
$urlLabel.Font = New-Object System.Drawing.Font('Yu Gothic UI', 9); ^
$urlLabel.ForeColor = [System.Drawing.Color]::Gray; ^
$urlLabel.AutoSize = $true; ^
$urlLabel.Location = New-Object System.Drawing.Point(75, 70); ^
$form.Controls.Add($urlLabel); ^
$button = New-Object System.Windows.Forms.Button; ^
$button.Text = '終了する'; ^
$button.Size = New-Object System.Drawing.Size(100, 35); ^
$button.Location = New-Object System.Drawing.Point(95, 100); ^
$button.BackColor = [System.Drawing.Color]::FromArgb(239, 68, 68); ^
$button.ForeColor = [System.Drawing.Color]::White; ^
$button.FlatStyle = 'Flat'; ^
$button.Add_Click({ $form.Close() }); ^
$form.Controls.Add($button); ^
$form.Add_FormClosing({ ^
    $result = [System.Windows.Forms.MessageBox]::Show('ABBYを終了しますか？', '確認', 'YesNo', 'Question'); ^
    if ($result -eq 'No') { $_.Cancel = $true } ^
}); ^
[void]$form.ShowDialog()

:: ウィンドウが閉じられたらコンテナ停止
docker-compose --profile production down