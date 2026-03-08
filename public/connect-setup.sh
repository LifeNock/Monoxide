#!/bin/bash
set -e

# Monoxide Connect - Setup Script
# Installs websockify + Cloudflare Tunnel to bridge your VNC server to Monoxide

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

TOKEN=""
SERVER=""

print_banner() {
  echo -e "${CYAN}"
  echo "  __  __                    _     _       "
  echo " |  \/  | ___  _ __   ___ __(_) __| | ___ "
  echo " | |\/| |/ _ \| '_ \ / _ \\ \\/ / _\` |/ _ \\"
  echo " | |  | | (_) | | | | (_) |>  < (_| |  __/"
  echo " |_|  |_|\\___/|_| |_|\\___//_/\\_\\__,_|\\___|"
  echo -e "          ${NC}${GREEN}Connect${NC} - Remote Desktop Setup"
  echo ""
}

usage() {
  echo "Usage: $0 --token TOKEN --server SERVER_URL"
  echo ""
  echo "Options:"
  echo "  --token      Your pairing token from Monoxide Connect"
  echo "  --server     Your Monoxide server URL"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --token) TOKEN="$2"; shift 2 ;;
    --server) SERVER="$2"; shift 2 ;;
    *) usage ;;
  esac
done

if [ -z "$TOKEN" ] || [ -z "$SERVER" ]; then
  usage
fi

print_banner

echo -e "${CYAN}[1/4]${NC} Checking requirements..."

# Check Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Docker is not installed.${NC}"
  echo "Please install Docker Desktop first: https://docker.com/products/docker-desktop"
  exit 1
fi
echo -e "  ${GREEN}+${NC} Docker found"

# Check if Docker is running
if ! docker info &> /dev/null 2>&1; then
  echo -e "${RED}Docker is not running.${NC} Please start Docker Desktop and try again."
  exit 1
fi
echo -e "  ${GREEN}+${NC} Docker is running"

# Check if VNC is listening on port 5900
echo -e "  Checking for VNC server on port 5900..."
if command -v ss &> /dev/null; then
  VNC_CHECK=$(ss -tlnp 2>/dev/null | grep ':5900' || true)
elif command -v netstat &> /dev/null; then
  VNC_CHECK=$(netstat -tlnp 2>/dev/null | grep ':5900' || true)
else
  VNC_CHECK="skip"
fi

if [ "$VNC_CHECK" = "" ]; then
  echo -e "  ${YELLOW}Warning: No VNC server detected on port 5900.${NC}"
  echo -e "  ${YELLOW}Make sure TigerVNC (or another VNC server) is running before connecting.${NC}"
  echo ""
elif [ "$VNC_CHECK" != "skip" ]; then
  echo -e "  ${GREEN}+${NC} VNC server detected on port 5900"
fi

echo ""
echo -e "${CYAN}[2/4]${NC} Starting websockify (VNC-to-WebSocket bridge)..."

# Create docker network
docker network create monoxide-connect 2>/dev/null || true

# Stop old containers (Guacamole or previous websockify)
docker stop monoxide-guacd monoxide-guacamole monoxide-websockify 2>/dev/null || true
docker rm monoxide-guacd monoxide-guacamole monoxide-websockify 2>/dev/null || true

# Start websockify — bridges VNC (port 5900) to WebSocket (port 6080)
docker run -d \
  --name monoxide-websockify \
  --network monoxide-connect \
  --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  -p 6080:6080 \
  efrecon/websockify:latest \
  6080 host.docker.internal:5900

echo -e "  ${GREEN}+${NC} websockify started (port 6080 -> VNC 5900)"

# Wait for websockify to start
echo -e "  Waiting for websockify to initialize..."
sleep 5

echo ""
echo -e "${CYAN}[3/4]${NC} Setting up Cloudflare Tunnel..."

# Install and start cloudflared tunnel
docker stop monoxide-tunnel 2>/dev/null || true
docker rm monoxide-tunnel 2>/dev/null || true
docker run -d \
  --name monoxide-tunnel \
  --network monoxide-connect \
  --restart unless-stopped \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate --url http://monoxide-websockify:6080

# Wait for tunnel to come up and get the URL
echo -e "  Waiting for tunnel to initialize..."
sleep 8

TUNNEL_URL=$(docker logs monoxide-tunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -1)

if [ -z "$TUNNEL_URL" ]; then
  echo -e "  ${YELLOW}Warning: Could not detect tunnel URL automatically.${NC}"
  echo -e "  Check tunnel logs: docker logs monoxide-tunnel"
  exit 1
fi

echo -e "  ${GREEN}+${NC} Tunnel active: ${TUNNEL_URL}"

echo ""
echo -e "${CYAN}[4/4]${NC} Pairing with Monoxide..."

# Call the pairing API
PAIR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SERVER}/api/connect/pair" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"${TOKEN}\", \"guacamole_url\": \"${TUNNEL_URL}\"}")

HTTP_CODE=$(echo "$PAIR_RESPONSE" | tail -1)
BODY=$(echo "$PAIR_RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "  ${GREEN}+${NC} Successfully paired!"
else
  echo -e "  ${RED}Pairing failed (HTTP $HTTP_CODE): $BODY${NC}"
  exit 1
fi

# Start heartbeat in background
GUAC_HOME="$HOME/.monoxide-connect"
mkdir -p "$GUAC_HOME"

cat > "$GUAC_HOME/heartbeat.sh" <<HEOF
#!/bin/bash
while true; do
  curl -s -X POST "${SERVER}/api/connect/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"${TOKEN}\"}" > /dev/null 2>&1
  sleep 120
done
HEOF
chmod +x "$GUAC_HOME/heartbeat.sh"

# Run heartbeat as a background docker container
docker stop monoxide-heartbeat 2>/dev/null || true
docker rm monoxide-heartbeat 2>/dev/null || true
docker run -d \
  --name monoxide-heartbeat \
  --restart unless-stopped \
  -v "$GUAC_HOME/heartbeat.sh:/heartbeat.sh" \
  alpine sh -c "apk add --no-cache curl > /dev/null 2>&1 && sh /heartbeat.sh"

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Monoxide Connect is ready!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "  Your computer is now accessible from Monoxide."
echo -e "  Go to ${CYAN}${SERVER}/connect${NC} and click Connect."
echo ""
echo -e "  ${YELLOW}Keep Docker running to stay connected.${NC}"
echo ""
echo -e "  To stop: docker stop monoxide-websockify monoxide-tunnel monoxide-heartbeat"
echo -e "  To restart: docker start monoxide-websockify monoxide-tunnel monoxide-heartbeat"
echo ""
