#!/bin/bash
# ZeroPoint Security - One-step installer for Linux
# Usage: curl -fsSL <url-to-this-script> | bash
#    or: ./install.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}  ZeroPoint Security Installer      ${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"

# Check prerequisites
echo -e "\n${YELLOW}[1/5] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed.${NC}"
    echo "Install it first: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose plugin is not installed.${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}Docker daemon is not running. Start it and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker ready${NC}"

# Configure environment
echo -e "\n${YELLOW}[2/5] Configuring environment...${NC}"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}!  Created .env from template. Edit it to set strong passwords.${NC}"
    echo "   Default credentials are admin/admin and ARE NOT secure."
    read -p "   Open .env now to edit? (y/N): " edit_env
    if [[ "$edit_env" =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    fi
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

# Pull images
echo -e "\n${YELLOW}[3/5] Pulling Greenbone Community Containers (this can take 5-15 min)...${NC}"
docker compose pull

# Build app
echo -e "\n${YELLOW}[4/5] Building ZeroPoint Security application...${NC}"
docker compose build

# Start
echo -e "\n${YELLOW}[5/5] Starting all services...${NC}"
docker compose up -d

# Wait + status
echo -e "\n${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete!            ${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo
echo "Initial feed synchronization is now running in the background."
echo "This downloads vulnerability test data and takes 30-60 minutes."
echo
echo "Watch progress with:    docker compose logs -f gvmd"
echo "Check service status:   docker compose ps"
echo
echo "Once the feed sync is complete, open the dashboard at:"
echo
echo "    http://localhost:3000          (ZeroPoint Security UI)"
echo "    http://localhost:9392          (Greenbone GSA - reference UI)"
echo "    http://localhost:8000/docs     (Backend API documentation)"
echo
echo "Login credentials are set in .env (default: admin/admin)."
echo "CHANGE THE DEFAULT PASSWORD before exposing this server to the network."
