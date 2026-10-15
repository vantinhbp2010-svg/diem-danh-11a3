param([string]$Message = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')")

Write-Host "🚀 Bắt đầu deploy..." -ForegroundColor Cyan

if (-not (git status --porcelain)) {
  Write-Host "⚠️ Không có thay đổi" -ForegroundColor Yellow
  exit 0
}

git add .
git commit -m $Message
git push origin main

Write-Host "✅ Đã push! Đợi 1-2 phút..." -ForegroundColor Green
