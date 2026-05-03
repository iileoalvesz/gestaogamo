# Inicia backend Django + frontend React (Vite)
# Uso: .\start.ps1

$root = $PSScriptRoot

Write-Host "Iniciando Backend Django (porta 8000)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -Command `"Set-Location '$root\backend'; .\venv\Scripts\python manage.py runserver`"" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Iniciando Frontend React/MUI (Vite, porta 5173)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -Command `"Set-Location '$root\frontend'; npm run dev`"" -WindowStyle Normal

Write-Host ""
Write-Host "Servicos iniciados:" -ForegroundColor Green
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Green
Write-Host "  API Docs:    http://localhost:8000/api/docs/" -ForegroundColor Green
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Login padrao: admin / admin123" -ForegroundColor Yellow
