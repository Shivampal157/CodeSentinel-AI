# Reads repo .env and prints Render Blueprint env blocks (do not commit output).
$envFile = Join-Path (Join-Path $PSScriptRoot '..') '.env'
if (-not (Test-Path $envFile)) {
  Write-Error ".env not found at $envFile"
  exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $idx = $_.IndexOf('=')
  if ($idx -lt 1) { return }
  $key = $_.Substring(0, $idx).Trim()
  $val = $_.Substring($idx + 1).Trim()
  $vars[$key] = $val
}

$shared = @(
  'MONGODB_URI', 'REDIS_URL', 'QDRANT_URL', 'QDRANT_API_KEY',
  'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY'
)

Write-Host "`n=== API + Worker (paste in Render Blueprint) ===`n" -ForegroundColor Cyan
foreach ($k in $shared) {
  if ($vars.ContainsKey($k)) { Write-Host "$k=$($vars[$k])" }
}

Write-Host "`n=== API only ===`n" -ForegroundColor Cyan
Write-Host 'CLIENT_ORIGIN=https://codesentinel-web.onrender.com'
Write-Host 'GITHUB_CALLBACK_URL=https://codesentinel-api.onrender.com/api/auth/github/callback'
Write-Host 'TRUST_PROXY=true'
Write-Host 'NODE_ENV=production'
Write-Host 'EMBEDDING_PROVIDER=gemini'
Write-Host 'QDRANT_COLLECTION=code_chunks'

Write-Host "`n=== Worker only (also needs JWT — imports API modules) ===`n" -ForegroundColor Cyan
Write-Host "JWT_ACCESS_SECRET=$($vars['JWT_ACCESS_SECRET'])"
Write-Host "JWT_REFRESH_SECRET=$($vars['JWT_REFRESH_SECRET'])"

Write-Host "`n=== Web only (after API URL confirmed) ===`n" -ForegroundColor Cyan
Write-Host 'VITE_API_URL=https://codesentinel-api.onrender.com'

Write-Host "`nOpen: https://dashboard.render.com/blueprints/new`n" -ForegroundColor Green
