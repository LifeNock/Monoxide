# Monoxide Connect - Windows Setup Script
# Installs websockify + Cloudflare Tunnel to bridge your VNC server to Monoxide

param(
    [Parameter(Mandatory=$true)][string]$Token,
    [Parameter(Mandatory=$true)][string]$Server
)

$ErrorActionPreference = "Stop"

function Write-Step($num, $msg) {
    Write-Host "`n[$num] " -ForegroundColor Cyan -NoNewline
    Write-Host $msg
}

function Write-Ok($msg) {
    Write-Host "  + " -ForegroundColor Green -NoNewline
    Write-Host $msg
}

function Write-Warn($msg) {
    Write-Host "  ! " -ForegroundColor Yellow -NoNewline
    Write-Host $msg
}

Write-Host ""
Write-Host "  Monoxide Connect - Remote Desktop Setup" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check requirements
Write-Step "1/4" "Checking requirements..."

try {
    docker info 2>$null | Out-Null
    Write-Ok "Docker is running"
} catch {
    Write-Host "  Docker is not running or not installed." -ForegroundColor Red
    Write-Host "  Install Docker Desktop: https://docker.com/products/docker-desktop"
    exit 1
}

# Check VNC on port 5900
$vncCheck = netstat -an 2>$null | Select-String ":5900.*LISTENING"
if ($vncCheck) {
    Write-Ok "VNC server detected on port 5900"
} else {
    Write-Warn "No VNC server detected on port 5900."
    Write-Warn "Make sure TigerVNC (WinVNC) is running before connecting."
}

# Step 2: Start websockify
Write-Step "2/4" "Starting websockify (VNC-to-WebSocket bridge)..."

docker network create monoxide-connect 2>$null
docker stop monoxide-websockify 2>$null
docker rm monoxide-websockify 2>$null

docker run -d `
    --name monoxide-websockify `
    --network monoxide-connect `
    --restart unless-stopped `
    --add-host=host.docker.internal:host-gateway `
    -p 6080:6080 `
    efrecon/websockify:latest `
    6080 host.docker.internal:5900

Write-Ok "websockify started (port 6080 -> VNC 5900)"
Write-Host "  Waiting for websockify to initialize..."
Start-Sleep -Seconds 5

# Step 3: Cloudflare Tunnel
Write-Step "3/4" "Setting up Cloudflare Tunnel..."

docker stop monoxide-tunnel 2>$null
docker rm monoxide-tunnel 2>$null

docker run -d `
    --name monoxide-tunnel `
    --network monoxide-connect `
    --restart unless-stopped `
    cloudflare/cloudflared:latest `
    tunnel --no-autoupdate --url http://monoxide-websockify:6080

Write-Host "  Waiting for tunnel to initialize..."
Start-Sleep -Seconds 8

$logs = docker logs monoxide-tunnel 2>&1
$tunnelUrl = ($logs | Select-String -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches).Matches[0].Value

if (-not $tunnelUrl) {
    Write-Warn "Could not detect tunnel URL automatically."
    Write-Host "  Check logs: docker logs monoxide-tunnel"
    exit 1
}

Write-Ok "Tunnel active: $tunnelUrl"

# Step 4: Pair with Monoxide
Write-Step "4/4" "Pairing with Monoxide..."

$body = @{ token = $Token; guacamole_url = $tunnelUrl } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$Server/api/connect/pair" -Method Post -ContentType "application/json" -Body $body
    Write-Ok "Successfully paired!"
} catch {
    Write-Host "  Pairing failed: $_" -ForegroundColor Red
    exit 1
}

# Start heartbeat
$heartbeatScript = @"
while (`$true) {
    try {
        Invoke-RestMethod -Uri '$Server/api/connect/heartbeat' -Method Post -ContentType 'application/json' -Body '{"token":"$Token"}' | Out-Null
    } catch {}
    Start-Sleep -Seconds 120
}
"@

$heartbeatDir = "$env:USERPROFILE\.monoxide-connect"
New-Item -ItemType Directory -Path $heartbeatDir -Force | Out-Null
$heartbeatScript | Out-File "$heartbeatDir\heartbeat.ps1" -Encoding UTF8

# Run heartbeat as a background docker container
docker stop monoxide-heartbeat 2>$null
docker rm monoxide-heartbeat 2>$null
docker run -d `
    --name monoxide-heartbeat `
    --restart unless-stopped `
    alpine sh -c "apk add --no-cache curl > /dev/null 2>&1 && while true; do curl -s -X POST '$Server/api/connect/heartbeat' -H 'Content-Type: application/json' -d '{""token"":""$Token""}' > /dev/null 2>&1; sleep 120; done"

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "  Monoxide Connect is ready!" -ForegroundColor Green
Write-Host "  =============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Your computer is now accessible from Monoxide."
Write-Host "  Go to $Server/connect and click Connect." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Keep Docker running to stay connected." -ForegroundColor Yellow
Write-Host ""
Write-Host "  To stop:    docker stop monoxide-websockify monoxide-tunnel monoxide-heartbeat"
Write-Host "  To restart: docker start monoxide-websockify monoxide-tunnel monoxide-heartbeat"
Write-Host ""
